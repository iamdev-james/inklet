import { afterEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "@/lib/rateLimit";
import { POST } from "./route";

function convertRequest(body: unknown, ip = "203.0.113.7"): Request {
  return new Request("http://offprint.test/api/convert", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function expectErrorCode(response: Response, code: string, status: number): Promise<void> {
  expect(response.status).toBe(status);
  const payload = (await response.json()) as { error: { code: string; title: string; body: string } };
  expect(payload.error.code).toBe(code);
  expect(payload.error.title.length).toBeGreaterThan(0);
  expect(payload.error.body.length).toBeGreaterThan(0);
}

afterEach(() => {
  resetRateLimits();
});

describe("POST /api/convert", () => {
  it("rejects malformed JSON bodies", async () => {
    await expectErrorCode(await POST(convertRequest("{not json")), "INVALID_URL", 400);
  });

  it("rejects schema violations", async () => {
    await expectErrorCode(await POST(convertRequest({ url: "", format: "pdf" })), "INVALID_URL", 400);
    await expectErrorCode(
      await POST(convertRequest({ url: "https://example.com", format: "epub" })),
      "INVALID_URL",
      400,
    );
  });

  it("rejects SSRF fixtures: localhost, metadata IP, file scheme, private ranges", async () => {
    const fixtures = [
      "http://localhost:8080/admin",
      "http://127.0.0.1/secrets",
      "http://169.254.169.254/latest/meta-data/",
      "file:///etc/passwd",
      "http://10.0.0.5/internal",
      "http://[::1]/",
    ];
    for (const url of fixtures) {
      await expectErrorCode(await POST(convertRequest({ url, format: "md" })), "INVALID_URL", 400);
    }
  });

  it("rate limits the eleventh request from one IP with Retry-After", async () => {
    const ip = "198.51.100.42";
    for (let i = 0; i < 10; i += 1) {
      await POST(convertRequest({ url: "http://127.0.0.1/", format: "md" }, ip));
    }
    const response = await POST(convertRequest({ url: "https://example.com/a", format: "md" }, ip));
    await expectErrorCode(response, "RATE_LIMITED", 429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("never leaks stack traces in error payloads", async () => {
    const response = await POST(convertRequest({ url: "http://10.1.1.1/x", format: "pdf" }));
    const text = await response.clone().text();
    expect(text).not.toMatch(/at\s+\w+\s+\(/);
    expect(text).not.toContain("Error:");
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });
});
