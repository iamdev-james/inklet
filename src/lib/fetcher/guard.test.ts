import { describe, expect, it } from "vitest";
import { ConversionError } from "@/lib/errors";
import { assertPublicUrl, isBlockedHostname, isPrivateIp } from "./guard";

async function expectRejected(url: string): Promise<void> {
  await expect(assertPublicUrl(url)).rejects.toThrowError(ConversionError);
}

describe("SSRF guard", () => {
  it("rejects non-http schemes", async () => {
    await expectRejected("file:///etc/passwd");
    await expectRejected("ftp://example.com/file");
    await expectRejected("javascript:alert(1)");
  });

  it("rejects loopback and localhost", async () => {
    await expectRejected("http://localhost:3000/admin");
    await expectRejected("http://127.0.0.1/");
    await expectRejected("http://[::1]/");
    await expectRejected("http://2130706433/");
  });

  it("rejects cloud metadata endpoints", async () => {
    await expectRejected("http://169.254.169.254/latest/meta-data/");
    await expectRejected("http://metadata.google.internal/computeMetadata/v1/");
  });

  it("rejects private ranges", async () => {
    await expectRejected("http://10.0.0.8/internal");
    await expectRejected("http://192.168.1.1/router");
    await expectRejected("http://172.16.4.2/");
    await expectRejected("http://[fd00::1]/");
  });

  it("classifies IPs correctly", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true);
    expect(isPrivateIp("100.64.0.1")).toBe(true);
    expect(isPrivateIp("::ffff:10.0.0.1")).toBe(true);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("2606:4700::6810:84e5")).toBe(false);
  });

  it("blocks internal-looking hostnames", () => {
    expect(isBlockedHostname("db.internal")).toBe(true);
    expect(isBlockedHostname("printer.local")).toBe(true);
    expect(isBlockedHostname("app.localhost")).toBe(true);
    expect(isBlockedHostname("example.com")).toBe(false);
  });
});
