import { describe, expect, it } from "vitest";
import type { ExtractedDocument } from "@/lib/types";
import { buildApaCitation } from "@/lib/citation/apa";
import { buildDocumentHtml } from "@/lib/template/document";
import { suggestFilename } from "@/lib/pipeline";
import { docxConverter } from "./toDocx";
import { markdownConverter } from "./toMarkdown";

const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const fixture: ExtractedDocument = {
  title: "The quiet craft of typesetting",
  byline: "By Ada Example",
  siteName: "Print & Pixel",
  publishedAt: "2025-11-02T08:00:00Z",
  sourceUrl: "https://printandpixel.dev/typesetting",
  capturedAt: "2026-07-08T12:00:00Z",
  contentHtml: `
    <p>Good typesetting is <strong>invisible</strong> — you only <em>feel</em> it.</p>
    <h2>Rules of thumb</h2>
    <ul><li>Measure around 66 characters</li><li>Leading at 1.5 or better<ul><li>Nested advice</li></ul></li></ul>
    <ol><li>First</li><li>Second</li></ol>
    <blockquote><p>Typography is what language looks like.</p></blockquote>
    <pre><code>const em = 16;\nconst leading = em * 1.5;</code></pre>
    <table><thead><tr><th>Unit</th><th>Px</th></tr></thead><tbody><tr><td>em</td><td>16</td></tr></tbody></table>
    <figure><img src="data:image/png;base64,${TINY_PNG}" alt="A single pixel"><figcaption>Fig 1. Minimalism.</figcaption></figure>
    <p>Read the <a href="https://practicaltypography.com">full guide</a>.</p>
  `,
  images: [
    {
      sourceSrc: "inline",
      dataUri: `data:image/png;base64,${TINY_PNG}`,
      mime: "image/png",
      bytes: 68,
      width: 1,
      height: 1,
      alt: "A single pixel",
    },
  ],
  references: [
    {
      title: "Practical Typography",
      url: "https://practicaltypography.com",
      host: "practicaltypography.com",
    },
    {
      title: "The Elements of Typographic Style",
      url: "https://en.wikipedia.org/wiki/The_Elements_of_Typographic_Style",
      host: "en.wikipedia.org",
    },
  ],
  related: [
    {
      title: "Why kerning still matters",
      url: "https://typemedia.example/kerning",
      host: "typemedia.example",
    },
  ],
  wordCount: 60,
};

describe("markdown converter", () => {
  it("produces front matter, GFM body, references, and footer", async () => {
    const output = (await markdownConverter.convert(fixture)).toString("utf8");
    expect(output.startsWith("---\n")).toBe(true);
    expect(output).toContain('title: "The quiet craft of typesetting"');
    expect(output).toContain("# The quiet craft of typesetting");
    expect(output).toContain("## Rules of thumb");
    expect(output).toContain("-   Measure around 66 characters");
    expect(output).toContain("1.  First");
    expect(output).toContain("```");
    expect(output).toContain("| Unit | Px |");
    expect(output).toContain("## References");
    expect(output).toContain(
      "Example, A. (2025, November 2). *The quiet craft of typesetting*. Print & Pixel. https://printandpixel.dev/typesetting",
    );
    expect(output).toContain("### Further reading");
    expect(output).toContain(
      "- [Practical Typography](https://practicaltypography.com) — practicaltypography.com",
    );
    expect(output).toContain("### Related coverage");
    expect(output).toContain("- [Why kerning still matters](https://typemedia.example/kerning) — typemedia.example");
    expect(output.indexOf("### Further reading")).toBeGreaterThan(output.indexOf("## References"));
    expect(output.indexOf("### Related coverage")).toBeGreaterThan(output.indexOf("### Further reading"));
    expect(output).toContain("Converted with Offprint");
  });
});

describe("docx converter", () => {
  it("produces a non-trivial zip container ending with the citation", async () => {
    const output = await docxConverter.convert(fixture);
    expect(output.byteLength).toBeGreaterThan(2_000);
    expect(output.subarray(0, 2).toString("ascii")).toBe("PK");
  });
});

describe("document template", () => {
  it("wraps content with metadata header, references, and footer", () => {
    const html = buildDocumentHtml(fixture, buildApaCitation(fixture));
    expect(html).toContain("The quiet craft of typesetting");
    expect(html).toContain("offprint-eyebrow");
    expect(html).toContain("References");
    expect(html).toContain("<em>The quiet craft of typesetting</em>");
    expect(html).toContain("Further reading");
    expect(html).toContain('<a href="https://practicaltypography.com">Practical Typography</a>');
    expect(html).toContain("Related coverage");
    expect(html).toContain('<a href="https://typemedia.example/kerning">Why kerning still matters</a>');
    expect(html).toContain("Converted with Offprint");
    expect(html.indexOf("References")).toBeGreaterThan(html.indexOf("invisible"));
    expect(html.indexOf("Further reading")).toBeGreaterThan(html.indexOf("References"));
  });
});

describe("suggestFilename", () => {
  it("slugifies titles and appends the extension", () => {
    expect(suggestFilename("The quiet craft of typesetting", "pdf")).toBe(
      "the-quiet-craft-of-typesetting.pdf",
    );
    expect(suggestFilename("Çünkü: öğrenmek!?", "md")).toBe("cunku-ogrenmek.md");
    expect(suggestFilename("!!!", "docx")).toBe("offprint-document.docx");
  });
});
