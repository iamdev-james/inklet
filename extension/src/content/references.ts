import type { ReferenceLink } from "@/lib/types";

const MAX_REFERENCES = 8;
const MIN_CONTENT_REFERENCES = 3;
const MIN_LABEL = 4;
const MAX_LABEL = 160;

const GENERIC =
  /^((by )?(click(ing)?|tap(ping)?)( here)?|here|there|this|that|link|source|website|homepage|read more|learn more|see more|more|continue reading|details)$/i;
const PROMO =
  /\b(download|get|install|use)\b.*\bapp\b|\b(join|follow)\b.*\b(whatsapp|telegram|channel|group|us)\b|\bsubscribe\b/i;
const SHARE_HOSTS =
  /(^|\.)(twitter\.com|x\.com|facebook\.com|linkedin\.com|pinterest\.com|reddit\.com|wa\.me|t\.me|api\.whatsapp\.com|play\.google\.com|apps\.apple\.com|itunes\.apple\.com|chrome\.google\.com|addons\.mozilla\.org)$/i;
const TRACKING = /^(utm_|fbclid$|gclid$|mc_|ref$|source$)/i;
const CTA_PREFIX = /^(read|learn|find out|discover|see)\s+(more\s+about|about|more)\s+/i;
const CHROME = "nav, header, footer, aside, [role='navigation'], .breadcrumb, .breadcrumbs";

function cleanUrl(url: URL): string {
  const params = new URLSearchParams(url.search);
  for (const key of Array.from(params.keys())) if (TRACKING.test(key)) params.delete(key);
  url.search = params.toString() ? `?${params.toString()}` : "";
  url.hash = "";
  return url.href;
}

function dedupeKey(url: URL): string {
  return `${url.origin}${url.pathname.replace(/\/$/, "")}`.toLowerCase();
}

function cleanLabel(raw: string): string {
  const stripped = raw.replace(CTA_PREFIX, "").trim();
  const label = stripped.length >= MIN_LABEL ? stripped : raw;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function substantial(label: string): boolean {
  return label.split(/\s+/).length >= 3 || label.length >= 20;
}

interface Ctx {
  sourceKey: string;
  sourceHost: string;
  seen: Set<string>;
  requireSubstantial: boolean;
}

function harvest(anchors: HTMLAnchorElement[], ctx: Ctx): ReferenceLink[] {
  const external: ReferenceLink[] = [];
  const internal: ReferenceLink[] = [];
  for (const anchor of anchors) {
    let url: URL;
    try {
      url = new URL(anchor.href);
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    if (SHARE_HOSTS.test(url.hostname)) continue;
    const key = dedupeKey(url);
    if (key === ctx.sourceKey || ctx.seen.has(key)) continue;

    const raw = anchor.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (raw.length < MIN_LABEL || raw.length > MAX_LABEL) continue;
    if (GENERIC.test(raw) || PROMO.test(raw)) continue;
    const title = cleanLabel(raw);
    if (ctx.requireSubstantial && !substantial(title)) continue;

    ctx.seen.add(key);
    const host = url.hostname.replace(/^www\./, "");
    const ref: ReferenceLink = { title, url: cleanUrl(url), host };
    (host === ctx.sourceHost ? internal : external).push(ref);
  }
  return [...external, ...internal];
}

export function collectReferences(contentRoot: HTMLElement, sourceUrl: string): ReferenceLink[] {
  let source: URL | null = null;
  try {
    source = new URL(sourceUrl);
  } catch {
    source = null;
  }
  const ctx: Ctx = {
    sourceKey: source ? dedupeKey(source) : "",
    sourceHost: source?.hostname.replace(/^www\./, "") ?? "",
    seen: new Set(),
    requireSubstantial: false,
  };

  const refs = harvest(Array.from(contentRoot.querySelectorAll("a[href]")), ctx);

  if (refs.length < MIN_CONTENT_REFERENCES) {
    const region = document.querySelector("main") ?? document.body;
    const anchors = Array.from(region.querySelectorAll<HTMLAnchorElement>("a[href]")).filter(
      (a) => !a.closest(CHROME),
    );
    refs.push(...harvest(anchors, { ...ctx, requireSubstantial: true }));
  }

  return refs.slice(0, MAX_REFERENCES);
}
