import type { ApaCitation } from "@/lib/citation/apa";
import type { ExtractedDocument } from "@/lib/types";

export const CONVERTED_WITH_LINE = "Converted with Offprint";

const DISPLAY_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatDisplayDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const parsed = new Date(iso.trim());
  if (Number.isNaN(parsed.getTime())) return iso.trim();
  return `${DISPLAY_MONTHS[parsed.getUTCMonth()]} ${parsed.getUTCDate()}, ${parsed.getUTCFullYear()}`;
}

export function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const DOCUMENT_CSS = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Georgia, "Iowan Old Style", "Times New Roman", serif;
    font-size: 11.5pt;
    line-height: 1.68;
    color: #111110;
    background: #ffffff;
    -webkit-font-smoothing: antialiased;
  }
  header.offprint-meta { margin-bottom: 28pt; }
  .offprint-eyebrow {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 7.5pt;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #FF4D00;
    margin: 0 0 14pt;
  }
  h1.offprint-title {
    font-size: 25pt;
    line-height: 1.18;
    font-weight: 700;
    letter-spacing: -0.012em;
    margin: 0 0 10pt;
  }
  .offprint-byline { font-size: 10.5pt; color: #45443f; margin: 0 0 3pt; }
  .offprint-source {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 8pt;
    color: #8a8a83;
    margin: 0;
    word-break: break-all;
  }
  .offprint-source a { color: #8a8a83; text-decoration: none; }
  .offprint-rule { border: none; border-top: 1.5pt solid #111110; margin: 16pt 0 0; }
  main h1, main h2 { font-size: 16pt; line-height: 1.3; margin: 22pt 0 8pt; letter-spacing: -0.008em; }
  main h3 { font-size: 13pt; margin: 18pt 0 6pt; }
  main h4, main h5, main h6 { font-size: 11.5pt; margin: 14pt 0 4pt; }
  p { margin: 0 0 10pt; }
  a { color: #111110; text-decoration: underline; text-decoration-color: #FF4D00; text-underline-offset: 2.5pt; }
  blockquote {
    margin: 14pt 0;
    padding: 2pt 0 2pt 14pt;
    border-left: 2.25pt solid #FF4D00;
    color: #3d3c37;
    font-style: italic;
  }
  blockquote p:last-child { margin-bottom: 0; }
  img { max-width: 100%; height: auto; display: block; margin: 14pt auto; border-radius: 2pt; }
  figure { margin: 14pt 0; }
  figcaption {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 8.5pt;
    color: #8a8a83;
    text-align: center;
    margin-top: 6pt;
  }
  pre {
    font-family: "SF Mono", Menlo, Consolas, monospace;
    font-size: 8.75pt;
    line-height: 1.55;
    background: #f5f3ed;
    border: 0.75pt solid #e6e3d9;
    border-radius: 4pt;
    padding: 10pt 12pt;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    margin: 12pt 0;
  }
  code { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 0.88em; }
  p code, li code { background: #f5f3ed; padding: 0.5pt 3pt; border-radius: 2.5pt; }
  pre code { background: none; padding: 0; }
  ul, ol { margin: 0 0 10pt; padding-left: 20pt; }
  li { margin-bottom: 3pt; }
  dl { margin: 0 0 10pt; }
  dt { font-weight: 700; margin-top: 8pt; }
  dd { margin: 2pt 0 6pt 18pt; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
    margin: 14pt 0;
    font-family: Helvetica, Arial, sans-serif;
  }
  th {
    text-align: left;
    border-bottom: 1.5pt solid #111110;
    padding: 5pt 8pt;
    font-weight: 700;
  }
  td { border-bottom: 0.75pt solid #dedbd1; padding: 5pt 8pt; vertical-align: top; }
  hr { border: none; border-top: 0.75pt solid #dedbd1; margin: 18pt 0; }
  section.offprint-references { margin-top: 30pt; }
  section.offprint-references h2 {
    font-size: 13pt;
    border-top: 1.5pt solid #111110;
    padding-top: 12pt;
    margin: 0 0 8pt;
  }
  .offprint-citation { padding-left: 24pt; text-indent: -24pt; font-size: 10.5pt; word-break: break-word; margin: 0; }
  section.offprint-references h3 {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 8pt;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #8a8a83;
    margin: 14pt 0 6pt;
  }
  ol.offprint-further { margin: 0; padding-left: 18pt; font-size: 9.5pt; }
  ol.offprint-further li { margin-bottom: 4pt; word-break: break-word; }
  ol.offprint-further .offprint-ref-host {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 8pt;
    color: #8a8a83;
  }
  footer.offprint-footer {
    margin-top: 26pt;
    padding-top: 8pt;
    border-top: 0.75pt solid #dedbd1;
    font-family: Helvetica, Arial, sans-serif;
    font-size: 7.5pt;
    color: #8a8a83;
    word-break: break-all;
  }
`;

function referenceListHtml(label: string, references: ExtractedDocument["references"]): string {
  if (references.length === 0) return "";
  const items = references
    .map(
      (ref) =>
        `    <li><a href="${escapeHtmlText(ref.url)}">${escapeHtmlText(ref.title)}</a> <span class="offprint-ref-host">— ${escapeHtmlText(ref.host)}</span></li>`,
    )
    .join("\n");
  return `  <h3>${escapeHtmlText(label)}</h3>\n  <ol class="offprint-further">\n${items}\n  </ol>\n`;
}

export function buildDocumentHtml(doc: ExtractedDocument, citation: ApaCitation): string {
  const displayDate = formatDisplayDate(doc.publishedAt);
  const capturedDate = formatDisplayDate(doc.capturedAt) ?? doc.capturedAt;
  const bylineParts = [doc.byline, displayDate].filter(Boolean).join(" · ");

  return `<!DOCTYPE html>
<html lang="${escapeHtmlText(doc.lang ?? "en")}">
<head>
<meta charset="utf-8">
<title>${escapeHtmlText(doc.title)}</title>
<style>${DOCUMENT_CSS}</style>
</head>
<body>
<header class="offprint-meta">
  <p class="offprint-eyebrow">Offprint${doc.siteName ? ` · ${escapeHtmlText(doc.siteName)}` : ""}</p>
  <h1 class="offprint-title">${escapeHtmlText(doc.title)}</h1>
  ${bylineParts ? `<p class="offprint-byline">${escapeHtmlText(bylineParts)}</p>` : ""}
  <p class="offprint-source">
    <a href="${escapeHtmlText(doc.sourceUrl)}">${escapeHtmlText(doc.sourceUrl)}</a> · captured ${escapeHtmlText(capturedDate)}
  </p>
  <hr class="offprint-rule">
</header>
<main>
${doc.contentHtml}
</main>
<section class="offprint-references">
  <h2>References</h2>
  <p class="offprint-citation">${citation.html}</p>
${referenceListHtml("Further reading", doc.references)}${referenceListHtml("Related coverage", doc.related)}</section>
<footer class="offprint-footer">
  Source: ${escapeHtmlText(doc.sourceUrl)} — ${CONVERTED_WITH_LINE}, ${escapeHtmlText(capturedDate)}.
</footer>
</body>
</html>`;
}
