import { discoverRelated } from "@/lib/citation/discover";
import { collectReferences } from "@/lib/citation/references";
import { getConverter, type Converter } from "@/lib/convert/Converter";
import { extractArticle } from "@/lib/extract/extractArticle";
import { normalizeDocument } from "@/lib/extract/normalize";
import { assertPublicUrl } from "@/lib/fetcher/guard";
import { renderPage } from "@/lib/fetcher/renderPage";
import type { ExtractedDocument, OutputFormat } from "@/lib/types";

export interface ConversionOutput {
  buffer: Buffer;
  doc: ExtractedDocument;
  converter: Converter;
}

export async function convertUrl(url: string, format: OutputFormat): Promise<ConversionOutput> {
  const rendered = await renderPage(url);
  await assertPublicUrl(rendered.finalUrl);
  const extracted = extractArticle(rendered);
  const normalized = await normalizeDocument(extracted);
  const references = collectReferences(normalized.contentHtml, normalized.sourceUrl, rendered.html);
  const referenceHosts = new Set(references.map((ref) => ref.host.toLowerCase()));
  const sourceHost = new URL(normalized.sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
  const related =
    referenceHosts.size < 3
      ? await discoverRelated(normalized.title, new Set([...referenceHosts, sourceHost]))
      : [];
  const doc: ExtractedDocument = { ...normalized, references, related };
  const converter = getConverter(format);
  const buffer = await converter.convert(doc);
  return { buffer, doc, converter };
}

export function suggestFilename(title: string, extension: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .toLowerCase();
  return `${slug || "offprint-document"}.${extension}`;
}
