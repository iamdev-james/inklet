import { ConversionError } from "@/lib/errors";
import type { RenderedPage } from "@/lib/types";
import { getBrowser } from "./browser";

const NAV_TIMEOUT_MS = 15_000;
const SETTLE_TIMEOUT_MS = 3_000;
const MAX_HTML_BYTES = 6 * 1024 * 1024;

export const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const BLOCKED_RESOURCE_TYPES = new Set([
  "image",
  "media",
  "font",
  "stylesheet",
  "websocket",
  "eventsource",
  "manifest",
]);

const BLOCKED_HOST_PATTERNS = [
  /(^|\.)doubleclick\.net$/,
  /(^|\.)googletagmanager\.com$/,
  /(^|\.)google-analytics\.com$/,
  /(^|\.)googlesyndication\.com$/,
  /(^|\.)facebook\.net$/,
  /(^|\.)hotjar\.com$/,
  /(^|\.)segment\.(io|com)$/,
  /(^|\.)amplitude\.com$/,
  /(^|\.)taboola\.com$/,
  /(^|\.)outbrain\.com$/,
  /(^|\.)criteo\.(com|net)$/,
];

const LOGIN_WALL_PATTERNS = [
  /sign in to (read|continue|view)/i,
  /log ?in to (read|continue|view)/i,
  /subscribe to (read|continue) /i,
  /create a free account to /i,
  /already a subscriber\?/i,
  /this (content|article) is for (members|subscribers)/i,
];

interface PageSignals {
  textLength: number;
  passwordInputs: number;
  bodyTextSample: string;
}

function classifyNavigationError(err: unknown): ConversionError {
  if (err instanceof Error) {
    if (err.name === "TimeoutError" || /timeout/i.test(err.message)) {
      return new ConversionError("TIMEOUT", err.message);
    }
    if (/ERR_NAME_NOT_RESOLVED|ERR_ADDRESS/i.test(err.message)) {
      return new ConversionError("INVALID_URL", err.message);
    }
    if (/net::ERR_/i.test(err.message)) {
      return new ConversionError("FETCH_BLOCKED", err.message);
    }
  }
  return new ConversionError("INTERNAL", err instanceof Error ? err.message : String(err));
}

function detectLoginWall(signals: PageSignals): void {
  const thinPage = signals.textLength < 1_200;
  if (signals.passwordInputs > 0 && thinPage) {
    throw new ConversionError("LOGIN_REQUIRED", "password field on a thin page");
  }
  if (thinPage && LOGIN_WALL_PATTERNS.some((pattern) => pattern.test(signals.bodyTextSample))) {
    throw new ConversionError("LOGIN_REQUIRED", "paywall copy on a thin page");
  }
}

export async function renderPage(url: string): Promise<RenderedPage> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: BROWSER_USER_AGENT,
    viewport: { width: 1280, height: 1024 },
    locale: "en-US",
    serviceWorkers: "block",
  });

  try {
    const page = await context.newPage();
    await page.route("**/*", (route) => {
      const request = route.request();
      const hostname = new URL(request.url()).hostname;
      const blocked =
        BLOCKED_RESOURCE_TYPES.has(request.resourceType()) ||
        BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
      return blocked ? route.abort() : route.continue();
    });

    let response;
    try {
      response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    } catch (err) {
      throw classifyNavigationError(err);
    }

    const status = response?.status() ?? 0;
    if (status === 401 || status === 402 || status === 403) {
      throw new ConversionError("FETCH_BLOCKED", `upstream responded ${status}`);
    }
    if (status >= 400) {
      throw new ConversionError("FETCH_BLOCKED", `upstream responded ${status}`);
    }
    const contentType = response?.headers()["content-type"] ?? "";
    if (contentType && !/html|xml/i.test(contentType)) {
      throw new ConversionError("NOT_ARTICLE", `unsupported content-type: ${contentType}`);
    }

    await page.waitForLoadState("networkidle", { timeout: SETTLE_TIMEOUT_MS }).catch(() => undefined);

    await page
      .evaluate(async () => {
        const step = window.innerHeight * 1.5;
        const limit = Math.min(document.body?.scrollHeight ?? 0, step * 8);
        for (let y = step; y <= limit; y += step) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 60));
        }
        window.scrollTo(0, 0);
      })
      .catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: 1_500 }).catch(() => undefined);

    const signals = await page.evaluate<PageSignals>(() => {
      const text = document.body?.innerText ?? "";
      return {
        textLength: text.length,
        passwordInputs: document.querySelectorAll('input[type="password"]').length,
        bodyTextSample: text.slice(0, 4_000),
      };
    });

    const html = await page.content();
    if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
      throw new ConversionError("TOO_LARGE", "rendered HTML exceeds the size cap");
    }

    detectLoginWall(signals);

    return { html, finalUrl: page.url(), status };
  } finally {
    await context.close();
  }
}
