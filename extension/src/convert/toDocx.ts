import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { buildApaCitation } from "@/lib/citation/apa";
import { CONVERTED_WITH_LINE, formatDisplayDate } from "@/lib/template/document";
import type { EmbeddedImage, ExtractedDocument } from "@/lib/types";

const SERIF = "Georgia";
const SANS = "Arial";
const MONO = "Consolas";
const INK = "111110";
const SOFT = "8A8A83";
const MUTED = "45443F";
const ACCENT = "FF4D00";
const LINK = "C2410C";
const CODE_FILL = "F5F3ED";
const HAIRLINE = "DEDBD1";
const OL_REFERENCE = "offprint-ol";
const MAX_IMAGE_WIDTH = 580;

type DocxImageType = "png" | "jpg" | "gif" | "bmp";
type InlineChild = TextRun | ExternalHyperlink | ImageRun;
type BlockChild = Paragraph | Table;

const IMAGE_TYPES: Record<string, DocxImageType> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/bmp": "bmp",
};

interface InlineStyle {
  bold?: boolean;
  italics?: boolean;
  code?: boolean;
  link?: boolean;
  superScript?: boolean;
  subScript?: boolean;
}

interface WalkState {
  olInstance: number;
  imagesByUri: Map<string, EmbeddedImage>;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function textRun(text: string, style: InlineStyle): TextRun {
  return new TextRun({
    text,
    bold: style.bold,
    italics: style.italics,
    superScript: style.superScript,
    subScript: style.subScript,
    font: style.code ? MONO : undefined,
    color: style.link ? LINK : undefined,
    underline: style.link ? {} : undefined,
    shading: style.code ? { type: ShadingType.CLEAR, fill: CODE_FILL } : undefined,
  });
}

function placeholderRun(alt: string): TextRun {
  return new TextRun({
    text: alt ? `[Image omitted: ${alt}]` : "[Image omitted]",
    italics: true,
    color: SOFT,
  });
}

function imageRun(dataUri: string, alt: string, state: WalkState): InlineChild {
  const match = /^data:([a-z0-9.+/-]+);base64,(.+)$/i.exec(dataUri);
  if (!match) return placeholderRun(alt);
  const type = IMAGE_TYPES[match[1].toLowerCase()];
  if (!type) return placeholderRun(alt);

  const meta = state.imagesByUri.get(dataUri);
  const naturalWidth = meta?.width || 0;
  const naturalHeight = meta?.height || 0;
  const width = naturalWidth > 0 ? Math.min(naturalWidth, MAX_IMAGE_WIDTH) : MAX_IMAGE_WIDTH * 0.75;
  const height =
    naturalWidth > 0 && naturalHeight > 0
      ? Math.round((width / naturalWidth) * naturalHeight)
      : Math.round(width * 0.62);

  return new ImageRun({
    type,
    data: base64ToBytes(match[2]),
    transformation: { width: Math.round(width), height },
    altText: { title: alt || "Image", description: alt || "Image", name: alt || "image" },
  });
}

function collectInline(node: Node, style: InlineStyle, state: WalkState): InlineChild[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const raw = (node.textContent ?? "").replace(/\s+/g, " ");
    return raw === "" ? [] : [textRun(raw, style)];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const el = node as Element;

  switch (el.tagName.toLowerCase()) {
    case "br":
      return [new TextRun({ break: 1 })];
    case "img":
      return [imageRun(el.getAttribute("src") ?? "", el.getAttribute("alt") ?? "", state)];
    case "strong":
      return childrenInline(el, { ...style, bold: true }, state);
    case "em":
      return childrenInline(el, { ...style, italics: true }, state);
    case "code":
      return childrenInline(el, { ...style, code: true }, state);
    case "sup":
      return childrenInline(el, { ...style, superScript: true }, state);
    case "sub":
      return childrenInline(el, { ...style, subScript: true }, state);
    case "a": {
      const href = el.getAttribute("href");
      const inner = childrenInline(el, { ...style, link: Boolean(href) }, state);
      if (!href) return inner;
      const runs = inner.filter((child): child is TextRun => child instanceof TextRun);
      return runs.length === 0 ? inner : [new ExternalHyperlink({ children: runs, link: href })];
    }
    default:
      return childrenInline(el, style, state);
  }
}

function childrenInline(el: Element, style: InlineStyle, state: WalkState): InlineChild[] {
  return Array.from(el.childNodes).flatMap((child) => collectInline(child, style, state));
}

function paragraphFromInline(
  el: Element,
  state: WalkState,
  extra?: object,
  style: InlineStyle = {},
): Paragraph[] {
  if (el.textContent?.trim() === "" && !el.querySelector("img")) return [];
  const children = childrenInline(el, style, state);
  return children.length === 0 ? [] : [new Paragraph({ children, ...extra })];
}

const QUOTE_PROPS = {
  indent: { left: 400 },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 16 } },
} as const;

function headingLevel(tag: string): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  if (tag === "h1" || tag === "h2") return HeadingLevel.HEADING_2;
  if (tag === "h3") return HeadingLevel.HEADING_3;
  return HeadingLevel.HEADING_4;
}

function listBlocks(
  listEl: Element,
  level: number,
  state: WalkState,
  ordered: boolean,
  instance: number,
): BlockChild[] {
  const blocks: BlockChild[] = [];
  for (const li of Array.from(listEl.children).filter((c) => c.tagName.toLowerCase() === "li")) {
    const nested: Element[] = [];
    const inline: Node[] = [];
    for (const child of Array.from(li.childNodes)) {
      const tag = child.nodeType === Node.ELEMENT_NODE ? (child as Element).tagName.toLowerCase() : "";
      if (tag === "ul" || tag === "ol") nested.push(child as Element);
      else inline.push(child);
    }
    const children = inline.flatMap((node) => collectInline(node, {}, state));
    if (children.length > 0) {
      blocks.push(
        new Paragraph({
          children,
          ...(ordered
            ? { numbering: { reference: OL_REFERENCE, level: Math.min(level, 2), instance } }
            : { bullet: { level: Math.min(level, 2) } }),
        }),
      );
    }
    for (const list of nested) {
      const nestedOrdered = list.tagName.toLowerCase() === "ol";
      const nestedInstance = nestedOrdered ? state.olInstance++ : instance;
      blocks.push(...listBlocks(list, level + 1, state, nestedOrdered, nestedInstance));
    }
  }
  return blocks;
}

function preBlocks(el: Element): Paragraph[] {
  const lines = (el.textContent ?? "").replace(/\n$/, "").split("\n");
  return lines.map(
    (line, index) =>
      new Paragraph({
        children: [new TextRun({ text: line || " ", font: MONO, size: 18 })],
        shading: { type: ShadingType.CLEAR, fill: CODE_FILL },
        spacing: { before: 0, after: index === lines.length - 1 ? 200 : 0, line: 264 },
      }),
  );
}

function quoteBlocks(el: Element, state: WalkState): BlockChild[] {
  const blocks: BlockChild[] = [];
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName.toLowerCase() === "p") {
      blocks.push(...paragraphFromInline(node as Element, state, QUOTE_PROPS, { italics: true }));
    } else if (node.textContent?.trim()) {
      const children = collectInline(node, { italics: true }, state);
      if (children.length > 0) blocks.push(new Paragraph({ children, ...QUOTE_PROPS }));
    }
  }
  return blocks;
}

function tableFrom(el: Element, state: WalkState): Table | null {
  const rows: TableRow[] = [];
  for (const tr of Array.from(el.querySelectorAll("tr"))) {
    const cells: TableCell[] = [];
    for (const cell of Array.from(tr.children)) {
      const tag = cell.tagName.toLowerCase();
      if (tag !== "td" && tag !== "th") continue;
      const isHeader = tag === "th";
      const content = blocksFromChildren(cell, state);
      const children =
        content.length > 0
          ? content
          : [new Paragraph({ children: childrenInline(cell, { bold: isHeader }, state) })];
      const span = Number(cell.getAttribute("colspan") ?? "1");
      cells.push(
        new TableCell({
          children,
          columnSpan: Number.isFinite(span) && span > 1 ? span : undefined,
          shading: isHeader ? { type: ShadingType.CLEAR, fill: "F0EEE6" } : undefined,
        }),
      );
    }
    if (cells.length > 0) rows.push(new TableRow({ children: cells }));
  }
  if (rows.length === 0) return null;
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

function blocksFromChildren(parent: Element, state: WalkState): BlockChild[] {
  const blocks: BlockChild[] = [];
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").trim();
      if (text) blocks.push(new Paragraph({ children: [textRun(text, {})] }));
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    switch (tag) {
      case "p":
        blocks.push(...paragraphFromInline(el, state));
        break;
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        blocks.push(...paragraphFromInline(el, state, { heading: headingLevel(tag) }));
        break;
      case "ul":
        blocks.push(...listBlocks(el, 0, state, false, 0));
        break;
      case "ol":
        blocks.push(...listBlocks(el, 0, state, true, state.olInstance++));
        break;
      case "dl":
        blocks.push(...blocksFromChildren(el, state));
        break;
      case "dt":
        blocks.push(...paragraphFromInline(el, state, { spacing: { before: 160 } }, { bold: true }));
        break;
      case "dd":
        blocks.push(...paragraphFromInline(el, state, { indent: { left: 400 } }));
        break;
      case "blockquote":
        blocks.push(...quoteBlocks(el, state));
        break;
      case "pre":
        blocks.push(...preBlocks(el));
        break;
      case "table": {
        const table = tableFrom(el, state);
        if (table) blocks.push(table);
        break;
      }
      case "figure":
        blocks.push(...blocksFromChildren(el, state));
        break;
      case "figcaption": {
        const caption = el.textContent?.trim();
        if (caption) {
          blocks.push(
            new Paragraph({
              children: [new TextRun({ text: caption, color: SOFT, size: 17, font: SANS })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 240 },
            }),
          );
        }
        break;
      }
      case "img":
        blocks.push(
          new Paragraph({
            children: [imageRun(el.getAttribute("src") ?? "", el.getAttribute("alt") ?? "", state)],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
          }),
        );
        break;
      case "hr":
        blocks.push(
          new Paragraph({
            children: [],
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: HAIRLINE } },
            spacing: { before: 200, after: 200 },
          }),
        );
        break;
      default:
        blocks.push(...paragraphFromInline(el, state));
        break;
    }
  }
  return blocks;
}

function referenceParagraphs(
  label: string,
  refs: ExtractedDocument["references"],
): BlockChild[] {
  if (refs.length === 0) return [];
  return [
    new Paragraph({
      children: [
        new TextRun({ text: label.toUpperCase(), font: SANS, size: 15, color: SOFT, characterSpacing: 30 }),
      ],
      spacing: { before: 280, after: 100 },
    }),
    ...refs.map(
      (ref, index) =>
        new Paragraph({
          children: [
            new TextRun({ text: `${index + 1}. `, size: 19 }),
            new ExternalHyperlink({
              children: [new TextRun({ text: ref.title, color: LINK, underline: {}, size: 19 })],
              link: ref.url,
            }),
            new TextRun({ text: ` — ${ref.host}`, color: SOFT, size: 16, font: SANS }),
          ],
          indent: { left: 720, hanging: 360 },
          spacing: { after: 60 },
        }),
    ),
  ];
}

export async function toDocxBlob(doc: ExtractedDocument): Promise<Blob> {
  const citation = buildApaCitation(doc);
  const body = new DOMParser().parseFromString(doc.contentHtml, "text/html").body;

  const state: WalkState = {
    olInstance: 1,
    imagesByUri: new Map(doc.images.map((image) => [image.dataUri, image])),
  };
  const contentBlocks = blocksFromChildren(body, state);

  const displayDate = formatDisplayDate(doc.publishedAt);
  const capturedDate = formatDisplayDate(doc.capturedAt) ?? doc.capturedAt;
  const bylineParts = [doc.byline, displayDate].filter(Boolean).join(" · ");

  const header: BlockChild[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: `OFFPRINT${doc.siteName ? ` · ${doc.siteName.toUpperCase()}` : ""}`,
          font: SANS,
          size: 15,
          color: ACCENT,
          characterSpacing: 40,
        }),
      ],
      spacing: { after: 280 },
    }),
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(doc.title)] }),
    ...(bylineParts
      ? [
          new Paragraph({
            children: [new TextRun({ text: bylineParts, color: MUTED, size: 21 })],
            spacing: { after: 60 },
          }),
        ]
      : []),
    new Paragraph({
      children: [
        new ExternalHyperlink({
          children: [new TextRun({ text: doc.sourceUrl, color: LINK, underline: {}, size: 16, font: SANS })],
          link: doc.sourceUrl,
        }),
        new TextRun({ text: `  ·  captured ${capturedDate}`, color: SOFT, size: 16, font: SANS }),
      ],
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [],
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: INK } },
      spacing: { after: 320 },
    }),
  ];

  const references: BlockChild[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun("References")],
      spacing: { before: 480, after: 160 },
    }),
    new Paragraph({
      children: citation.segments.map(
        (segment) => new TextRun({ text: segment.text, italics: segment.italic, size: 21 }),
      ),
      indent: { left: 720, hanging: 720 },
    }),
    ...referenceParagraphs("Further reading", doc.references),
    ...referenceParagraphs("Related coverage", doc.related),
    new Paragraph({
      children: [
        new TextRun({
          text: `Source: ${doc.sourceUrl} — ${CONVERTED_WITH_LINE}, ${capturedDate}.`,
          color: SOFT,
          size: 15,
          font: SANS,
        }),
      ],
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: HAIRLINE } },
      spacing: { before: 480 },
    }),
  ];

  const document = new Document({
    title: doc.title,
    creator: doc.byline ?? doc.siteName ?? "Offprint",
    description: doc.excerpt,
    numbering: {
      config: [
        {
          reference: OL_REFERENCE,
          levels: [0, 1, 2].map((level) => ({
            level,
            format:
              level === 0
                ? LevelFormat.DECIMAL
                : level === 1
                  ? LevelFormat.LOWER_LETTER
                  : LevelFormat.LOWER_ROMAN,
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
          })),
        },
      ],
    },
    styles: {
      default: { document: { run: { font: SERIF, size: 23, color: INK } } },
      paragraphStyles: [
        {
          id: "Title",
          name: "Title",
          basedOn: "Normal",
          next: "Normal",
          run: { font: SERIF, size: 50, bold: true, color: INK },
          paragraph: { spacing: { after: 200, line: 260 } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: SERIF, size: 32, bold: true, color: INK },
          paragraph: { spacing: { before: 360, after: 140 } },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: SERIF, size: 26, bold: true, color: INK },
          paragraph: { spacing: { before: 300, after: 120 } },
        },
        {
          id: "Heading4",
          name: "Heading 4",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: SERIF, size: 23, bold: true, color: INK },
          paragraph: { spacing: { before: 240, after: 100 } },
        },
      ],
    },
    sections: [{ children: [...header, ...contentBlocks, ...references] }],
  });

  return Packer.toBlob(document);
}
