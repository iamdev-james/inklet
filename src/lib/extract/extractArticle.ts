import { Readability } from "@mozilla/readability";
import { JSDOM, VirtualConsole } from "jsdom";
import { ConversionError } from "@/lib/errors";
import type { ExtractedDocument, RenderedPage } from "@/lib/types";

const MIN_TEXT_LENGTH = 250;
const MIN_CONFIDENCE = 0.25;

// When standard extraction keeps less than this share of a text-rich page,
// the article was probably pruned for link density (list posts, link roundups)
// and a lenient second pass is worth trying.
const LOW_RETENTION = 0.3;
const RETRY_MIN_BODY_CHARS = 3_000;
const LENIENT_LINK_DENSITY_MODIFIER = 0.8;

// Comment threads and engagement widgets that survive Readability when they sit
// inside the article container. Container-level selectors only — never bare
// ".comment", which would match syntax-highlight spans inside code blocks.
const CLUTTER_SELECTORS = [
  "#comments",
  "#comments-section",
  "#comment-list",
  "#respond",
  "#disqus_thread",
  "#giscus",
  ".comments",
  ".comments-area",
  ".comments-section",
  ".comment-list",
  ".comment-section",
  ".comment-respond",
  ".post-comments",
  ".article-comments",
  "ol.commentlist",
  ".giscus",
  ".utterances",
  "[data-component='comments']",
  ".related-posts",
  ".related-articles",
  ".recommended-articles",
  ".share-buttons",
  ".social-share",
  ".newsletter-signup",
] as const;

// Sites without semantic comment markup still label the section with a heading.
// Exact-match patterns only, so an article that merely mentions comments survives.
const COMMENT_HEADING_PATTERNS = [
  /^(comments?|responses?|discussion|conversation)(\s*\(\d[\d,.]*\s*k?\))?$/i,
  /^\d[\d,.]*\s*k?\s+(comments?|responses?|replies)$/i,
  /^(post your comment|leave a (comment|reply)|join the (conversation|discussion)|what do you think\??)$/i,
];

function quietDom(html: string, url?: string): JSDOM {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", () => undefined);
  return new JSDOM(html, { url, virtualConsole });
}

function stripClutter(document: Document): void {
  for (const selector of CLUTTER_SELECTORS) {
    for (const el of Array.from(document.querySelectorAll(selector))) {
      if (!el.closest("pre")) el.remove();
    }
  }
}

function isCommentHeading(text: string): boolean {
  return COMMENT_HEADING_PATTERNS.some((pattern) => pattern.test(text));
}

function truncateAtCommentsHeading(body: HTMLElement): void {
  const heading = Array.from(body.querySelectorAll("h1, h2, h3, h4, h5, h6")).find((el) =>
    isCommentHeading(el.textContent?.replace(/\s+/g, " ").trim() ?? ""),
  );
  if (!heading) return;

  let node: Element | null = heading;
  while (node && node !== body) {
    const parent: Element | null = node.parentElement;
    let sibling = node.nextSibling;
    while (sibling) {
      const next = sibling.nextSibling;
      sibling.parentNode?.removeChild(sibling);
      sibling = next;
    }
    if (node === heading) node.remove();
    node = parent;
  }
}

interface ExtractionPass {
  title?: string;
  byline?: string;
  siteName?: string;
  publishedAt?: string;
  excerpt?: string;
  lang?: string;
  contentHtml: string;
  text: string;
}

function runReadability(page: RenderedPage, linkDensityModifier: number): ExtractionPass | null {
  const dom = quietDom(page.html, page.finalUrl);
  const { document } = dom.window;
  stripClutter(document);
  truncateAtCommentsHeading(document.body);

  // linkDensityModifier is supported by Readability 0.6 at runtime but missing
  // from its published types.
  const options = { keepClasses: false, linkDensityModifier } as NonNullable<
    ConstructorParameters<typeof Readability<string>>[1]
  >;
  const article = new Readability<string>(document, options).parse();
  if (!article?.content) return null;

  const contentHtml = article.content;
  const text = article.textContent?.replace(/\s+/g, " ").trim() ?? "";

  return {
    title: article.title?.trim() || undefined,
    byline: article.byline?.trim() || undefined,
    siteName: article.siteName?.trim() || undefined,
    publishedAt: article.publishedTime?.trim() || undefined,
    excerpt: article.excerpt?.trim() || undefined,
    lang: article.lang?.trim() || undefined,
    contentHtml,
    text,
  };
}

function firstMetaContent(document: Document, selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const content = document.querySelector(selector)?.getAttribute("content")?.trim();
    if (content) return content;
  }
  return undefined;
}

function detectPublishedAt(document: Document): string | undefined {
  const fromMeta = firstMetaContent(document, [
    'meta[property="article:published_time"]',
    'meta[name="article:published_time"]',
    'meta[itemprop="datePublished"]',
    'meta[name="date"]',
    'meta[name="dc.date"]',
    'meta[name="parsely-pub-date"]',
  ]);
  if (fromMeta) return fromMeta;
  return document.querySelector("time[datetime]")?.getAttribute("datetime")?.trim() || undefined;
}

function countParagraphs(contentHtml: string): number {
  return (contentHtml.match(/<(p|li|dt)[\s>]/gi) ?? []).length;
}

export function computeConfidence(textLength: number, paragraphs: number): number {
  const lengthScore = Math.min(1, textLength / 2_000);
  const structureScore = Math.min(1, paragraphs / 8);
  return lengthScore * 0.7 + structureScore * 0.3;
}

export function extractArticle(page: RenderedPage): ExtractedDocument {
  const metaDom = quietDom(page.html, page.finalUrl);
  const metaDocument = metaDom.window.document;

  const documentTitle = metaDocument.title?.trim();
  const metaAuthor = firstMetaContent(metaDocument, [
    'meta[name="author"]',
    'meta[property="article:author"]',
  ]);
  const metaSite = firstMetaContent(metaDocument, ['meta[property="og:site_name"]']);
  const publishedAt = detectPublishedAt(metaDocument);
  const docLang = metaDocument.documentElement.getAttribute("lang")?.trim();
  const bodyTextLength =
    metaDocument.body?.textContent?.replace(/\s+/g, " ").trim().length ?? 0;

  let pass = runReadability(page, 0);
  if (bodyTextLength > RETRY_MIN_BODY_CHARS) {
    const retention = pass ? pass.text.length / bodyTextLength : 0;
    if (retention < LOW_RETENTION) {
      const lenient = runReadability(page, LENIENT_LINK_DENSITY_MODIFIER);
      if (lenient && (!pass || lenient.text.length > pass.text.length * 1.5)) {
        pass = lenient;
      }
    }
  }
  if (!pass) {
    throw new ConversionError("NOT_ARTICLE", "readability returned no content");
  }

  const paragraphs = countParagraphs(pass.contentHtml);
  const confidence = computeConfidence(pass.text.length, paragraphs);
  if (pass.text.length < MIN_TEXT_LENGTH || confidence < MIN_CONFIDENCE) {
    throw new ConversionError(
      "NOT_ARTICLE",
      `low extraction confidence (${confidence.toFixed(2)}, ${pass.text.length} chars)`,
    );
  }

  const sourceHost = new URL(page.finalUrl).hostname.replace(/^www\./, "");

  return {
    title: pass.title || documentTitle || sourceHost,
    byline: pass.byline || metaAuthor || undefined,
    siteName: pass.siteName || metaSite || sourceHost,
    publishedAt: pass.publishedAt || publishedAt || undefined,
    sourceUrl: page.finalUrl,
    capturedAt: new Date().toISOString(),
    contentHtml: pass.contentHtml,
    images: [],
    references: [],
    related: [],
    excerpt: pass.excerpt,
    lang: pass.lang || docLang || undefined,
    wordCount: pass.text.split(/\s+/).filter(Boolean).length,
  };
}
