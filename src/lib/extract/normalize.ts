import { JSDOM, VirtualConsole } from "jsdom";
import sanitizeHtml from "sanitize-html";
import { isBlockedHostname, isPrivateIp } from "@/lib/fetcher/guard";
import { BROWSER_USER_AGENT } from "@/lib/fetcher/renderPage";
import { parseHttpUrl } from "@/lib/validation";
import type { EmbeddedImage, ExtractedDocument } from "@/lib/types";
import { probeImageSize } from "./imageSize";

export const IMAGE_CAPS = {
  maxImages: 20,
  maxTotalBytes: 15 * 1024 * 1024,
  maxSingleBytes: 6 * 1024 * 1024,
  fetchTimeoutMs: 8_000,
} as const;

const LAZY_SRC_ATTRIBUTES = ["data-src", "data-lazy-src", "data-original", "data-srcset"];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "ul", "ol", "li", "dl", "dt", "dd", "blockquote",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
    "pre", "code", "img", "a", "strong", "em",
    "figure", "figcaption", "hr", "br", "sup", "sub",
  ],
  allowedAttributes: {
    a: ["href"],
    img: ["src", "alt", "width", "height"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  transformTags: { b: "strong", i: "em" },
};

function quietDom(html: string, url?: string): JSDOM {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", () => undefined);
  return new JSDOM(html, { url, virtualConsole });
}

function firstSrcsetUrl(srcset: string): string | undefined {
  return srcset.split(",")[0]?.trim().split(/\s+/)[0];
}

function resolveRawUrls(contentHtml: string, baseUrl: string): string {
  const dom = quietDom(contentHtml, baseUrl);
  const { document } = dom.window;

  for (const img of Array.from(document.querySelectorAll("img"))) {
    let src = img.getAttribute("src")?.trim() ?? "";
    if (!src || src.startsWith("data:image/gif")) {
      for (const attr of LAZY_SRC_ATTRIBUTES) {
        const candidate = img.getAttribute(attr)?.trim();
        if (candidate) {
          src = attr.endsWith("srcset") ? (firstSrcsetUrl(candidate) ?? "") : candidate;
          break;
        }
      }
    }
    const width = Number(img.getAttribute("width") ?? "0");
    const height = Number(img.getAttribute("height") ?? "0");
    if (!src || (width === 1 && height === 1)) {
      img.remove();
      continue;
    }
    if (!src.startsWith("data:")) {
      try {
        img.setAttribute("src", new URL(src, baseUrl).href);
      } catch {
        img.remove();
      }
    }
  }

  for (const anchor of Array.from(document.querySelectorAll("a[href]"))) {
    const href = anchor.getAttribute("href")?.trim() ?? "";
    try {
      anchor.setAttribute("href", new URL(href, baseUrl).href);
    } catch {
      anchor.removeAttribute("href");
    }
  }

  return document.body.innerHTML;
}

async function isPubliclyFetchable(url: URL): Promise<boolean> {
  if (isBlockedHostname(url.hostname)) return false;
  const { isIP } = await import("node:net");
  if (isIP(url.hostname) && isPrivateIp(url.hostname)) return false;
  return true;
}

interface FetchedImage {
  data: Buffer;
  mime: string;
}

async function fetchImage(rawUrl: string): Promise<FetchedImage | null> {
  let current = parseHttpUrl(rawUrl);
  for (let hop = 0; current && hop < 4; hop += 1) {
    if (!(await isPubliclyFetchable(current))) return null;
    let response: Response;
    try {
      response = await fetch(current.href, {
        redirect: "manual",
        signal: AbortSignal.timeout(IMAGE_CAPS.fetchTimeoutMs),
        headers: { "user-agent": BROWSER_USER_AGENT, accept: "image/*" },
      });
    } catch {
      return null;
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      try {
        current = parseHttpUrl(new URL(location, current.href).href);
      } catch {
        return null;
      }
      continue;
    }
    if (!response.ok) return null;
    const mime = (response.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!mime.startsWith("image/")) return null;
    const data = Buffer.from(await response.arrayBuffer());
    if (data.byteLength === 0 || data.byteLength > IMAGE_CAPS.maxSingleBytes) return null;
    return { data, mime };
  }
  return null;
}

function parseDataUri(uri: string): FetchedImage | null {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(uri);
  if (!match) return null;
  try {
    const data = Buffer.from(match[2], "base64");
    if (data.byteLength === 0 || data.byteLength > IMAGE_CAPS.maxSingleBytes) return null;
    return { data, mime: match[1].toLowerCase() };
  } catch {
    return null;
  }
}

function omittedPlaceholder(document: Document, alt: string): HTMLElement {
  const placeholder = document.createElement("p");
  const em = document.createElement("em");
  em.textContent = alt ? `[Image omitted: ${alt}]` : "[Image omitted]";
  placeholder.appendChild(em);
  return placeholder;
}

async function embedImages(
  sanitizedHtml: string,
): Promise<{ contentHtml: string; images: EmbeddedImage[] }> {
  const dom = quietDom(sanitizedHtml);
  const { document } = dom.window;
  const images: EmbeddedImage[] = [];
  let totalBytes = 0;

  for (const img of Array.from(document.querySelectorAll("img"))) {
    const src = img.getAttribute("src") ?? "";
    const alt = img.getAttribute("alt") ?? "";

    if (images.length >= IMAGE_CAPS.maxImages || totalBytes >= IMAGE_CAPS.maxTotalBytes) {
      img.replaceWith(omittedPlaceholder(document, alt));
      continue;
    }

    const fetched = src.startsWith("data:") ? parseDataUri(src) : await fetchImage(src);
    if (!fetched || totalBytes + fetched.data.byteLength > IMAGE_CAPS.maxTotalBytes) {
      if (fetched) {
        img.replaceWith(omittedPlaceholder(document, alt));
      } else {
        img.remove();
      }
      continue;
    }

    totalBytes += fetched.data.byteLength;
    const dims = probeImageSize(fetched.data, fetched.mime);
    const dataUri = `data:${fetched.mime};base64,${fetched.data.toString("base64")}`;
    img.setAttribute("src", dataUri);
    img.removeAttribute("width");
    img.removeAttribute("height");
    images.push({
      sourceSrc: src.startsWith("data:") ? "inline" : src,
      dataUri,
      mime: fetched.mime,
      bytes: fetched.data.byteLength,
      width: dims?.width ?? 0,
      height: dims?.height ?? 0,
      alt,
    });
  }

  return { contentHtml: document.body.innerHTML, images };
}

export async function normalizeDocument(doc: ExtractedDocument): Promise<ExtractedDocument> {
  const resolved = resolveRawUrls(doc.contentHtml, doc.sourceUrl);
  const sanitized = sanitizeHtml(resolved, SANITIZE_OPTIONS);
  const { contentHtml, images } = await embedImages(sanitized);
  return { ...doc, contentHtml, images };
}
