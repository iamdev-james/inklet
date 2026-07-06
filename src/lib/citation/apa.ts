import type { ExtractedDocument } from "@/lib/types";

export interface CitationSegment {
  text: string;
  italic: boolean;
}

export interface ApaCitation {
  text: string;
  html: string;
  markdown: string;
  segments: CitationSegment[];
}

export type CitationSource = Pick<
  ExtractedDocument,
  "title" | "byline" | "siteName" | "publishedAt" | "sourceUrl"
>;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ORG_MARKERS = new Set([
  "staff", "team", "news", "newsroom", "desk", "editor", "editors", "editorial",
  "correspondent", "contributors", "contributor", "reporters", "agency", "press",
  "media", "network", "magazine", "journal", "wire", "bureau", "review", "times",
  "post", "daily", "tribune", "herald", "gazette", "chronicle", "report", "weekly",
]);

const NAME_SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv"]);

const NAME_TOKEN = /^[\p{L}][\p{L}'’.-]*$/u;

function stripBylinePrefix(byline: string): string {
  return byline.replace(/^by[\s:]+/i, "").replace(/\s+/g, " ").trim();
}

function initialsOf(givenName: string): string {
  return givenName
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}.`)
    .join("-");
}

function invertName(name: string): string | null {
  const tokens = name.trim().split(/\s+/);
  if (tokens.length < 2 || tokens.length > 4) return null;
  if (tokens[0].toLowerCase() === "the") return null;
  for (const token of tokens) {
    if (!NAME_TOKEN.test(token)) return null;
    if (ORG_MARKERS.has(token.toLowerCase())) return null;
  }
  if (NAME_SUFFIXES.has(tokens[tokens.length - 1].toLowerCase())) return null;
  const surname = tokens[tokens.length - 1];
  const initials = tokens.slice(0, -1).map(initialsOf).join(" ");
  return `${surname}, ${initials}`;
}

export function formatAuthors(byline: string): string | null {
  const cleaned = stripBylinePrefix(byline);
  if (!cleaned) return null;

  const names = cleaned
    .split(/\s*(?:,|&|\band\b)\s*/i)
    .map((name) => name.trim())
    .filter(Boolean);
  if (names.length === 0) return null;

  const inverted = names.map(invertName);
  if (inverted.some((name) => name === null)) return cleaned;

  const formatted = inverted as string[];
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(", ")}, & ${formatted[formatted.length - 1]}`;
}

export function formatApaDate(publishedAt?: string): string {
  if (!publishedAt) return "(n.d.)";
  const trimmed = publishedAt.trim();
  if (/^\d{4}$/.test(trimmed)) return `(${trimmed})`;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "(n.d.)";
  return `(${parsed.getUTCFullYear()}, ${MONTHS[parsed.getUTCMonth()]} ${parsed.getUTCDate()})`;
}

function withPeriod(text: string): string {
  return /[.?!]$/.test(text) ? text : `${text}.`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeMarkdown(text: string): string {
  return text.replace(/([*_[\]\\])/g, "\\$1");
}

export function buildApaCitation(source: CitationSource): ApaCitation {
  const title = source.title.trim();
  const datePart = formatApaDate(source.publishedAt);
  const siteName = source.siteName?.trim();

  const strippedByline = source.byline ? stripBylinePrefix(source.byline) : "";
  const authorIsSite =
    strippedByline.length > 0 &&
    siteName !== undefined &&
    strippedByline.toLowerCase() === siteName.toLowerCase();
  const authorPart = authorIsSite ? strippedByline : source.byline ? formatAuthors(source.byline) : null;

  const segments: CitationSegment[] = [];
  if (authorPart) {
    segments.push({ text: `${withPeriod(authorPart)} ${datePart}. `, italic: false });
    segments.push({ text: title, italic: true });
    segments.push({ text: `${/[.?!]$/.test(title) ? "" : "."} `, italic: false });
  } else {
    segments.push({ text: title, italic: true });
    segments.push({ text: `${/[.?!]$/.test(title) ? "" : "."} ${datePart}. `, italic: false });
  }
  if (siteName && !authorIsSite) {
    segments.push({ text: `${withPeriod(siteName)} `, italic: false });
  }
  segments.push({ text: source.sourceUrl, italic: false });

  const compact = segments.filter((segment) => segment.text.length > 0);
  return {
    segments: compact,
    text: compact.map((segment) => segment.text).join(""),
    html: compact
      .map((segment) =>
        segment.italic ? `<em>${escapeHtml(segment.text)}</em>` : escapeHtml(segment.text),
      )
      .join(""),
    markdown: compact
      .map((segment) =>
        segment.italic ? `*${escapeMarkdown(segment.text)}*` : escapeMarkdown(segment.text),
      )
      .join(""),
  };
}
