import { buildApaCitation } from "@/lib/citation/apa";
import { getBrowser } from "@/lib/fetcher/browser";
import { buildDocumentHtml, escapeHtmlText } from "@/lib/template/document";
import type { Converter } from "./Converter";

const PDF_TIMEOUT_MS = 30_000;

function footerTemplate(title: string): string {
  return `<div style="width:100%;padding:0 56px;font-family:Georgia,serif;font-size:8px;color:#8a8a83;display:flex;justify-content:space-between;align-items:baseline;">
    <span style="max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtmlText(title)}</span>
    <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`;
}

export const pdfConverter: Converter = {
  format: "pdf",
  contentType: "application/pdf",
  extension: "pdf",

  async convert(doc) {
    const html = buildDocumentHtml(doc, buildApaCitation(doc));
    const browser = await getBrowser();
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await page.route("**/*", (route) => route.abort());
      await page.setContent(html, { waitUntil: "load", timeout: PDF_TIMEOUT_MS });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate: footerTemplate(doc.title),
        margin: { top: "64px", bottom: "72px", left: "58px", right: "58px" },
      });
      return Buffer.from(pdf);
    } finally {
      await context.close();
    }
  },
};
