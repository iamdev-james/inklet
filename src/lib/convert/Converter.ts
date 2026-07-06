import type { ExtractedDocument, OutputFormat } from "@/lib/types";
import { docxConverter } from "./toDocx";
import { markdownConverter } from "./toMarkdown";
import { pdfConverter } from "./toPdf";

export interface Converter {
  readonly format: OutputFormat;
  readonly contentType: string;
  readonly extension: string;
  convert(doc: ExtractedDocument): Promise<Buffer>;
}

const registry: Record<OutputFormat, Converter> = {
  pdf: pdfConverter,
  docx: docxConverter,
  md: markdownConverter,
};

export function getConverter(format: OutputFormat): Converter {
  return registry[format];
}
