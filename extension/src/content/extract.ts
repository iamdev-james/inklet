import { Readability } from "@mozilla/readability";
import type { ExtractedDocument } from "@/lib/types";

const MIN_TEXT_LENGTH = 250;
const MIN_CONFIDENCE = 0.25;

const CLUTTER_SELECTORS = [
  "#comments",
  "#comments-section",
  "#respond",
  "#disqus_thread",
  "#giscus",
  ".comments",
  ".comments-area",
  ".comment-list",
  ".comment-section",
  ".post-comments",
  ".article-comments",
  "ol.commentlist",
  ".giscus",
  ".utterances",
  "[data-component='comments']",
  ".related-posts",
  ".related-articles",
  ".share-buttons",
  ".social-share",
  ".newsletter-signup",
];

const COMMENT_HEADING = [
  /^(comments?|responses?|discussion|conversation)(\s*\(\d[\d,.]*\s*k?\))?$/i,
  /^\d[\d,.]*\s*k?\s+(comments?|responses?|replies)$/i,
  /^(post your comment|leave a (comment|reply)|join the (conversation|discussion))$/i,
];

export interface ExtractionResult {
  doc: ExtractedDocument;
  contentRoot: HTMLElement;
  confidence: number;
}

function firstMeta(selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const content = document.querySelector(selector)?.getAttribute("content")?.trim();
    if (content) return content;
  }
  return undefined;
}

function detectPublishedAt(): string | undefined {
  const fromMeta = firstMeta([
    'meta[property="article:published_time"]',
    'meta[itemprop="datePublished"]',
    'meta[name="date"]',
    'meta[name="dc.date"]',
    'meta[name="parsely-pub-date"]',
  ]);
  if (fromMeta) return fromMeta;
  return document.querySelector("time[datetime]")?.getAttribute("datetime")?.trim() || undefined;
}

function stripClutter(root: Document | HTMLElement): void {
  for (const selector of CLUTTER_SELECTORS) {
    for (const el of Array.from(root.querySelectorAll(selector))) {
      if (!el.closest("pre")) el.remove();
    }
  }
}

function truncateAtCommentsHeading(root: HTMLElement): void {
  const heading = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6")).find((el) => {
    const text = el.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return COMMENT_HEADING.some((pattern) => pattern.test(text));
  });
  if (!heading) return;
  let node: Element | null = heading;
  while (node && node !== root) {
    const parent: Element | null = node.parentElement;
    let sibling = node.nextSibling;
    while (sibling) {
      const next = sibling.nextSibling;
      sibling.remove();
      sibling = next;
    }
    if (node === heading) node.remove();
    node = parent;
  }
}

function countBlocks(root: HTMLElement): number {
  return root.querySelectorAll("p, li, dt").length;
}

export function computeConfidence(textLength: number, blocks: number): number {
  const lengthScore = Math.min(1, textLength / 2000);
  const structureScore = Math.min(1, blocks / 8);
  return lengthScore * 0.7 + structureScore * 0.3;
}

export function extractFromPage(): ExtractionResult | null {
  const clone = document.cloneNode(true) as Document;
  stripClutter(clone);

  const article = new Readability(clone, { keepClasses: false }).parse();
  if (!article?.content) return null;

  const holder = document.createElement("div");
  holder.innerHTML = article.content;
  truncateAtCommentsHeading(holder);

  const text = (holder.textContent ?? "").replace(/\s+/g, " ").trim();
  const blocks = countBlocks(holder);
  const confidence = computeConfidence(text.length, blocks);
  if (text.length < MIN_TEXT_LENGTH || confidence < MIN_CONFIDENCE) return null;

  const host = location.hostname.replace(/^www\./, "");
  const doc: ExtractedDocument = {
    title: article.title?.trim() || document.title.trim() || host,
    byline:
      article.byline?.trim() ||
      firstMeta(['meta[name="author"]', 'meta[property="article:author"]']) ||
      undefined,
    siteName:
      article.siteName?.trim() ||
      firstMeta(['meta[property="og:site_name"]']) ||
      host,
    publishedAt: article.publishedTime?.trim() || detectPublishedAt(),
    sourceUrl: location.href,
    capturedAt: new Date().toISOString(),
    contentHtml: holder.innerHTML,
    images: [],
    references: [],
    related: [],
    excerpt: article.excerpt?.trim() || undefined,
    lang: document.documentElement.getAttribute("lang")?.trim() || undefined,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };

  return { doc, contentRoot: holder, confidence };
}
