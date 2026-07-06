import { describe, expect, it } from "vitest";
import { collectReferences } from "./references";

const SOURCE = "https://blog.example.com/rivers";

describe("collectReferences", () => {
  it("collects cited links with external sources listed first", () => {
    const refs = collectReferences(
      `<p><a href="https://blog.example.com/estuaries">Estuaries explained</a>
       <a href="https://usgs.gov/water-data">USGS water data</a></p>`,
      SOURCE,
    );
    expect(refs.map((r) => r.host)).toEqual(["usgs.gov", "blog.example.com"]);
    expect(refs[0]).toEqual({
      title: "USGS water data",
      url: "https://usgs.gov/water-data",
      host: "usgs.gov",
    });
  });

  it("skips the source itself, duplicates, generic labels, and share links", () => {
    const refs = collectReferences(
      `<p>
        <a href="${SOURCE}">this very article</a>
        <a href="https://usgs.gov/water-data">USGS water data</a>
        <a href="https://usgs.gov/water-data/">USGS water data again</a>
        <a href="https://en.wikipedia.org/wiki/River">click here</a>
        <a href="https://en.wikipedia.org/wiki/Stream">by clicking here</a>
        <a href="https://twitter.com/intent/tweet?url=x">Share on Twitter this article now</a>
        <a href="https://play.google.com/store/apps/details?id=com.example">River Watcher for Android</a>
        <a href="https://blog.example.com/app">get the RiverBlog App today</a>
        <a href="https://a.io">ab</a>
      </p>`,
      SOURCE,
    );
    expect(refs).toHaveLength(1);
    expect(refs[0].host).toBe("usgs.gov");
  });

  it("strips tracking parameters and fragments from reference URLs", () => {
    const refs = collectReferences(
      `<a href="https://journal.org/paper?utm_source=feed&page=2&fbclid=xyz#abstract">Sediment transport in braided rivers</a>`,
      SOURCE,
    );
    expect(refs[0].url).toBe("https://journal.org/paper?page=2");
  });

  it("caps the list at eight references", () => {
    const links = Array.from(
      { length: 15 },
      (_, i) => `<a href="https://site-${i}.org/study">Study number ${i} on river deltas</a>`,
    ).join(" ");
    expect(collectReferences(links, SOURCE)).toHaveLength(8);
  });

  it("returns an empty list for content without qualifying links", () => {
    expect(collectReferences("<p>No links at all.</p>", SOURCE)).toEqual([]);
  });

  it("falls back to the page's main region when the article body has no links", () => {
    const pageHtml = `
      <body>
        <header><a href="https://blog.example.com/about">About the example blog</a></header>
        <main>
          <nav aria-label="Breadcrumbs">
            <a href="https://blog.example.com/">Home</a>
            <a href="https://blog.example.com/energy">Rivers and energy</a>
          </nav>
          <p>Body text.</p>
          <a href="https://facts.example.org/field/delta">Read more about the delta field on the facts website</a>
          <aside><a href="https://blog.example.com/newsletter">Weekly newsletter of the blog</a></aside>
          <a href="https://blog.example.com/tags">Tags</a>
        </main>
        <footer><a href="https://blog.example.com/privacy">Privacy policy for readers</a></footer>
      </body>`;
    const refs = collectReferences("<p>No links at all.</p>", SOURCE, pageHtml);
    expect(refs).toEqual([
      {
        title: "The delta field on the facts website",
        url: "https://facts.example.org/field/delta",
        host: "facts.example.org",
      },
    ]);
  });

  it("skips the page fallback when the article already cites enough sources", () => {
    const contentHtml = `
      <a href="https://a.org/one">First study on river deltas</a>
      <a href="https://b.org/two">Second study on river deltas</a>
      <a href="https://c.org/three">Third study on river deltas</a>`;
    const pageHtml = `<main><a href="https://d.org/four">Fourth study on river deltas</a></main>`;
    const refs = collectReferences(contentHtml, SOURCE, pageHtml);
    expect(refs).toHaveLength(3);
    expect(refs.some((r) => r.host === "d.org")).toBe(false);
  });

  it("does not double-count a link cited in both the article and the page shell", () => {
    const contentHtml = `<a href="https://a.org/one">First study on river deltas</a>`;
    const pageHtml = `<main>
      <a href="https://a.org/one/">First study on river deltas</a>
      <a href="https://b.org/two">Second study on river deltas</a>
    </main>`;
    const refs = collectReferences(contentHtml, SOURCE, pageHtml);
    expect(refs.map((r) => r.host)).toEqual(["a.org", "b.org"]);
  });
});
