import type { EmbeddedImage } from "@/lib/types";

const CAPS = {
  maxImages: 20,
  maxTotalBytes: 15 * 1024 * 1024,
  maxSingleBytes: 6 * 1024 * 1024,
  fetchTimeoutMs: 8000,
};

const ALLOWED_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "ul", "ol", "li", "dl", "dt", "dd", "blockquote",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "pre", "code", "img", "a", "strong", "em",
  "figure", "figcaption", "hr", "br", "sup", "sub",
]);

const DROP_TAGS = new Set([
  "script", "style", "noscript", "iframe", "object", "embed", "svg", "canvas",
  "form", "input", "button", "select", "textarea", "video", "audio", "link",
  "meta", "template", "nav", "aside", "footer", "header",
]);

const RENAME: Record<string, string> = { b: "strong", i: "em" };

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href"]),
  img: new Set(["src", "alt", "width", "height"]),
  th: new Set(["colspan", "rowspan"]),
  td: new Set(["colspan", "rowspan"]),
};

const LAZY_ATTRS = ["data-src", "data-lazy-src", "data-original", "data-srcset"];

function firstSrcset(value: string): string | undefined {
  return value.split(",")[0]?.trim().split(/\s+/)[0];
}

function resolveUrls(root: HTMLElement, baseUrl: string): void {
  for (const img of Array.from(root.querySelectorAll("img"))) {
    let src = img.getAttribute("src")?.trim() ?? "";
    if (!src || src.startsWith("data:image/gif")) {
      for (const attr of LAZY_ATTRS) {
        const candidate = img.getAttribute(attr)?.trim();
        if (candidate) {
          src = attr.endsWith("srcset") ? (firstSrcset(candidate) ?? "") : candidate;
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
  for (const anchor of Array.from(root.querySelectorAll("a[href]"))) {
    try {
      anchor.setAttribute("href", new URL(anchor.getAttribute("href") ?? "", baseUrl).href);
    } catch {
      anchor.removeAttribute("href");
    }
  }
}

function sanitize(root: HTMLElement): void {
  for (const el of Array.from(root.querySelectorAll("*"))) {
    const tag = el.tagName.toLowerCase();
    if (DROP_TAGS.has(tag)) {
      el.remove();
      continue;
    }
    const renamed = RENAME[tag];
    if (renamed) {
      const replacement = document.createElement(renamed);
      replacement.innerHTML = el.innerHTML;
      el.replaceWith(replacement);
      continue;
    }
    if (!ALLOWED_TAGS.has(tag)) {
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }
    const allowed = ALLOWED_ATTRS[tag];
    for (const attr of Array.from(el.attributes)) {
      if (!allowed?.has(attr.name)) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (attr.name === "href" && !/^https?:/i.test(attr.value)) {
        el.removeAttribute("href");
      }
      if (attr.name === "src" && !/^(https?:|data:image\/)/i.test(attr.value)) {
        el.removeAttribute("src");
      }
    }
  }
}

async function fetchAsDataUri(
  url: string,
): Promise<{ dataUri: string; bytes: number; mime: string } | null> {
  try {
    const response = await fetch(url, {
      credentials: "include",
      signal: AbortSignal.timeout(CAPS.fetchTimeoutMs),
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;
    if (blob.size === 0 || blob.size > CAPS.maxSingleBytes) return null;
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return { dataUri, bytes: blob.size, mime: blob.type };
  } catch {
    return null;
  }
}

async function decodeSize(dataUri: string): Promise<{ width: number; height: number }> {
  try {
    const blob = await (await fetch(dataUri)).blob();
    const bitmap = await createImageBitmap(blob);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: 0, height: 0 };
  }
}

function placeholder(alt: string): HTMLParagraphElement {
  const p = document.createElement("p");
  const em = document.createElement("em");
  em.textContent = alt ? `[Image omitted: ${alt}]` : "[Image omitted]";
  p.appendChild(em);
  return p;
}

async function inlineImages(root: HTMLElement): Promise<EmbeddedImage[]> {
  const images: EmbeddedImage[] = [];
  let totalBytes = 0;

  for (const img of Array.from(root.querySelectorAll("img"))) {
    const src = img.getAttribute("src") ?? "";
    const alt = img.getAttribute("alt") ?? "";

    if (images.length >= CAPS.maxImages || totalBytes >= CAPS.maxTotalBytes) {
      img.replaceWith(placeholder(alt));
      continue;
    }

    const fetched = src.startsWith("data:")
      ? { dataUri: src, bytes: Math.ceil((src.length * 3) / 4), mime: "image/*" }
      : await fetchAsDataUri(src);

    if (!fetched || totalBytes + fetched.bytes > CAPS.maxTotalBytes) {
      img.remove();
      continue;
    }

    totalBytes += fetched.bytes;
    const size = await decodeSize(fetched.dataUri);
    img.setAttribute("src", fetched.dataUri);
    img.removeAttribute("width");
    img.removeAttribute("height");
    images.push({
      sourceSrc: src.startsWith("data:") ? "inline" : src,
      dataUri: fetched.dataUri,
      mime: fetched.mime,
      bytes: fetched.bytes,
      width: size.width,
      height: size.height,
      alt,
    });
  }

  return images;
}

export async function normalizeContent(
  root: HTMLElement,
  baseUrl: string,
): Promise<{ contentHtml: string; images: EmbeddedImage[] }> {
  resolveUrls(root, baseUrl);
  sanitize(root);
  const images = await inlineImages(root);
  return { contentHtml: root.innerHTML, images };
}
