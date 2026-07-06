import { describe, expect, it } from "vitest";
import { CONVERSION_ERROR_CODES, ERROR_COPY, ERROR_HTTP_STATUS } from "@/lib/errors";
import { parseHttpUrl } from "@/lib/validation";

describe("foundation", () => {
  it("maps every error code to copy and an HTTP status", () => {
    for (const code of CONVERSION_ERROR_CODES) {
      expect(ERROR_COPY[code].title.length).toBeGreaterThan(0);
      expect(ERROR_COPY[code].body.length).toBeGreaterThan(0);
      expect(ERROR_HTTP_STATUS[code]).toBeGreaterThanOrEqual(400);
    }
  });

  it("accepts http(s) URLs and rejects everything else", () => {
    expect(parseHttpUrl("https://example.com/a")).not.toBeNull();
    expect(parseHttpUrl("http://example.com")).not.toBeNull();
    expect(parseHttpUrl("file:///etc/passwd")).toBeNull();
    expect(parseHttpUrl("javascript:alert(1)")).toBeNull();
    expect(parseHttpUrl("not a url")).toBeNull();
  });
});
