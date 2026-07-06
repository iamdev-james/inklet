import { describe, expect, it } from "vitest";
import { ConversionError } from "@/lib/errors";
import type { RenderedPage } from "@/lib/types";
import { extractArticle } from "./extractArticle";

const paragraphs = Array.from(
  { length: 24 },
  (_, i) =>
    `<p>Paragraph ${i}: typesetting rewards patience, and long-form articles need enough body text for extraction to score them as real content worth keeping.</p>`,
).join("\n");

function page(bodyHtml: string): RenderedPage {
  return {
    html: `<!DOCTYPE html><html lang="en"><head><title>The long history of margins</title><meta name="author" content="Ada Example"></head><body>${bodyHtml}</body></html>`,
    finalUrl: "https://example.com/margins",
    status: 200,
  };
}

describe("extractArticle", () => {
  it("extracts the article body with metadata", () => {
    const doc = extractArticle(page(`<article><h1>The long history of margins</h1>${paragraphs}</article>`));
    expect(doc.title).toBe("The long history of margins");
    expect(doc.byline).toBe("Ada Example");
    expect(doc.wordCount).toBeGreaterThan(300);
  });

  it("strips comment threads and engagement widgets that Readability keeps", () => {
    const doc = extractArticle(
      page(
        `<article><h1>The long history of margins</h1>${paragraphs}
        <div class="giscus"><p>First! Great post, totally agree with everything.</p></div>
        <section class="related-posts"><a href="/other">You may also like margins II</a></section>
        </article>`,
      ),
    );
    expect(doc.contentHtml).not.toContain("Great post");
    expect(doc.contentHtml).not.toContain("You may also like");
    expect(doc.contentHtml).toContain("Paragraph 3");
  });

  it("keeps code blocks whose syntax highlighting uses comment-named classes", () => {
    const doc = extractArticle(
      page(
        `<article><h1>The long history of margins</h1>${paragraphs}
        <pre><code><span class="comments">// margin: auto</span>\nconst m = 8;</code></pre>
        </article>`,
      ),
    );
    expect(doc.contentHtml).toContain("margin: auto");
  });

  it("throws NOT_ARTICLE for thin pages", () => {
    expect(() => extractArticle(page("<p>hi</p>"))).toThrowError(ConversionError);
  });

  it("truncates trailing comment sections labelled only by a heading", () => {
    const doc = extractArticle(
      page(
        `<article><h1>The long history of margins</h1>${paragraphs}
        <div><h3>Comment (380)</h3><button>Sort</button></div>
        <div><p>First!! Great post, totally agree with everything you said here friend.</p>
        <p>what about OAU? Please reply me quickly because the deadline is close.</p></div>
        </article>`,
      ),
    );
    expect(doc.contentHtml).toContain("Paragraph 20");
    expect(doc.contentHtml).not.toContain("Comment (380)");
    expect(doc.contentHtml).not.toContain("what about OAU");
  });

  it("rescues link-dense list articles that standard extraction prunes", () => {
    const schools = Array.from(
      { length: 60 },
      (_, i) =>
        `<p><a href="https://example.com/school-${i}">Federal University of Sample State ${i} announces its screening exercise for the new academic session</a> — form costs ₦2,000.</p>`,
    ).join("\n");
    const doc = extractArticle(
      page(`<article><h1>The long history of margins</h1><p>Schools that have released forms so far this year, updated daily by our editorial desk with registration deadlines and screening details for every institution below.</p>${schools}</article>`),
    );
    expect(doc.contentHtml).toContain("Federal University of Sample State 42");
    expect(doc.wordCount).toBeGreaterThan(600);
  });
});
