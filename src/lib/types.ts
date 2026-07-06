export type OutputFormat = "pdf" | "docx" | "md";

export interface EmbeddedImage {
  sourceSrc: string;
  dataUri: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  alt: string;
}

export interface ReferenceLink {
  title: string;
  url: string;
  host: string;
}

export interface ExtractedDocument {
  title: string;
  byline?: string;
  siteName?: string;
  publishedAt?: string;
  sourceUrl: string;
  capturedAt: string;
  contentHtml: string;
  images: EmbeddedImage[];
  references: ReferenceLink[];
  related: ReferenceLink[];
  excerpt?: string;
  lang?: string;
  wordCount: number;
}

export interface RenderedPage {
  html: string;
  finalUrl: string;
  status: number;
}
