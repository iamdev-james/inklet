export const CONVERSION_ERROR_CODES = [
  "INVALID_URL",
  "FETCH_BLOCKED",
  "LOGIN_REQUIRED",
  "NOT_ARTICLE",
  "TOO_LARGE",
  "RATE_LIMITED",
  "TIMEOUT",
  "INTERNAL",
] as const;

export type ConversionErrorCode = (typeof CONVERSION_ERROR_CODES)[number];

export class ConversionError extends Error {
  readonly code: ConversionErrorCode;

  constructor(code: ConversionErrorCode, detail?: string) {
    super(detail ?? code);
    this.name = "ConversionError";
    this.code = code;
  }
}

export const ERROR_HTTP_STATUS: Record<ConversionErrorCode, number> = {
  INVALID_URL: 400,
  FETCH_BLOCKED: 422,
  LOGIN_REQUIRED: 422,
  NOT_ARTICLE: 422,
  TOO_LARGE: 413,
  RATE_LIMITED: 429,
  TIMEOUT: 504,
  INTERNAL: 500,
};

export interface ErrorCopy {
  title: string;
  body: string;
}

export const ERROR_COPY: Record<ConversionErrorCode, ErrorCopy> = {
  INVALID_URL: {
    title: "That link doesn't look right.",
    body: "Check the URL — it should start with http:// or https:// and point to a public page.",
  },
  FETCH_BLOCKED: {
    title: "That site wouldn't let us in.",
    body: "The page blocked our reader. Try a different link — the coming Chrome extension works on anything you can see.",
  },
  LOGIN_REQUIRED: {
    title: "That page needs a login.",
    body: "Offprint only converts what's publicly visible. The Chrome extension will handle signed-in pages — it's coming soon.",
  },
  NOT_ARTICLE: {
    title: "We couldn't find an article there.",
    body: "That page doesn't read like an article. Try a link to a post, story, or documentation page.",
  },
  TOO_LARGE: {
    title: "That page is too heavy.",
    body: "It blew past our size caps. Try a lighter page — most articles convert without a hitch.",
  },
  RATE_LIMITED: {
    title: "Take a breather.",
    body: "You've hit the hourly limit, or Offprint is at capacity right now. Try again in a few minutes.",
  },
  TIMEOUT: {
    title: "That page took too long.",
    body: "We waited fifteen seconds and it kept us waiting. Slow sites often make it on the second try.",
  },
  INTERNAL: {
    title: "Something broke on our side.",
    body: "Not you — us. Give it another go in a moment.",
  },
};

export function isConversionErrorCode(value: string): value is ConversionErrorCode {
  return (CONVERSION_ERROR_CODES as readonly string[]).includes(value);
}

export function toConversionError(err: unknown): ConversionError {
  if (err instanceof ConversionError) return err;
  if (err instanceof Error && /timeout/i.test(err.message)) {
    return new ConversionError("TIMEOUT", err.message);
  }
  return new ConversionError("INTERNAL", err instanceof Error ? err.message : String(err));
}
