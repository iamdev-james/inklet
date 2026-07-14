import { JSDOM, VirtualConsole } from "jsdom";
import type { ReferenceLink } from "@/lib/types";

const MAX_REFERENCES = 8;
const MIN_CONTENT_REFERENCES = 3;
const MIN_LABEL_LENGTH = 4;
const MAX_LABEL_LENGTH = 160;

const GENERIC_LABELS =
  /^((by )?(click(ing)?|tap(ping)?)( here)?|here|there|this|that|link|source|website|homepage|read more|learn more|see more|more|continue reading|details)$/i;

const PROMO_LABELS =
  /\b(download|get|install|use)\b.*\bapp\b|\b(join|follow)\b.*\b(whatsapp|telegram|channel|group|us)\b|\bsubscribe\b/i;

const SHARE_HOSTS =
  /(^|\.)(twitter\.com|x\.com|facebook\.com|linkedin\.com|pinterest\.com|reddit\.com|wa\.me|t\.me|api\.whatsapp\.com|play\.google\.com|apps\.apple\.com|itunes\.apple\.com|chrome\.google\.com|addons\.mozilla\.org)$/i;

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|mc_|ref$|source$)/i;

const PAGE_CHROME_SELECTOR =
  "nav, header, footer, aside, [role='navigation'], .breadcrumb, .breadcrumbs";

const CTA_LABEL_PREFIX = /^(read|learn|find out|discover|see)\s+(more\s+about|about|more)\s+/i;

function quietDom(html: string): JSDOM {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", () => undefined);
  return new JSDOM(html, { virtualConsole });
}

function cleanUrl(url: URL): string {
  const params = new URLSearchParams(url.search);
  for (const key of Array.from(params.keys())) {
    if (TRACKING_PARAMS.test(key)) params.delete(key);
  }
  url.search = params.toString() ? `?${params.toString()}` : "";
  url.hash = "";
  return url.href;
}

function dedupeKey(url: URL): string {
  return `${url.origin}${url.pathname.replace(/\/$/, "")}`.toLowerCase();
}

function cleanLabel(raw: string): string {
  const stripped = raw.replace(CTA_LABEL_PREFIX, "").trim();
  const label = stripped.length >= MIN_LABEL_LENGTH ? stripped : raw;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function isSubstantialLabel(label: string): boolean {
  return label.split(/\s+/).length >= 3 || label.length >= 20;
}

interface HarvestContext {
  sourceKey: string;
  sourceHost: string;
  seen: Set<string>;
  requireSubstantialLabel: boolean;
}

function harvest(anchors: Element[], ctx: HarvestContext): ReferenceLink[] {
  const external: ReferenceLink[] = [];
  const internal: ReferenceLink[] = [];

  for (const anchor of anchors) {
    let url: URL;
    try {
      url = new URL(anchor.getAttribute("href") ?? "");
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    if (SHARE_HOSTS.test(url.hostname)) continue;

    const key = dedupeKey(url);
    if (key === ctx.sourceKey || ctx.seen.has(key)) continue;

    const rawLabel = anchor.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (rawLabel.length < MIN_LABEL_LENGTH || rawLabel.length > MAX_LABEL_LENGTH) continue;
    if (GENERIC_LABELS.test(rawLabel) || PROMO_LABELS.test(rawLabel)) continue;

    const title = cleanLabel(rawLabel);
    if (ctx.requireSubstantialLabel && !isSubstantialLabel(title)) continue;

    ctx.seen.add(key);
    const host = url.hostname.replace(/^www\./, "");
    const reference: ReferenceLink = { title, url: cleanUrl(url), host };
    if (host === ctx.sourceHost) {
      internal.push(reference);
    } else {
      external.push(reference);
    }
  }

  return [...external, ...internal];
}

export function collectReferences(
  contentHtml: string,
  sourceUrl: string,
  pageHtml?: string,
): ReferenceLink[] {
  let source: URL | null = null;
  try {
    source = new URL(sourceUrl);
  } catch {
    source = null;
  }
  const ctx: HarvestContext = {
    sourceKey: source ? dedupeKey(source) : "",
    sourceHost: source?.hostname.replace(/^www\./, "") ?? "",
    seen: new Set<string>(),
    requireSubstantialLabel: false,
  };

  const contentDom = quietDom(contentHtml);
  const references = harvest(
    Array.from(contentDom.window.document.querySelectorAll("a[href]")),
    ctx,
  );

  if (references.length < MIN_CONTENT_REFERENCES && pageHtml) {
    const pageDom = quietDom(pageHtml);
    const { document } = pageDom.window;
    const root = document.querySelector("main") ?? document.body;
    const anchors = Array.from(root.querySelectorAll("a[href]")).filter(
      (anchor) => !anchor.closest(PAGE_CHROME_SELECTOR),
    );
    references.push(...harvest(anchors, { ...ctx, requireSubstantialLabel: true }));
  }

  return references.slice(0, MAX_REFERENCES);
}
