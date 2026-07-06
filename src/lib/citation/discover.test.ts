import { describe, expect, it } from "vitest";
import { parseNewsRss } from "./discover";

const rss = (items: string) =>
  `<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>Search</title>${items}</channel></rss>`;

const item = (title: string, link: string) =>
  `<item><title>${title}</title><link>${link}</link></item>`;

describe("parseNewsRss", () => {
  it("collects one entry per outlet with direct URLs", () => {
    const xml = rss(
      item("Post-UTME forms released nationwide", "https://punchng.com/post-utme-forms") +
        item("Post-UTME: what changes this year", "https://punchng.com/other-story") +
        item("Universities open screening portals", "https://guardian.ng/screening-portals"),
    );
    const refs = parseNewsRss(xml, new Set());
    expect(refs).toEqual([
      {
        title: "Post-UTME forms released nationwide",
        url: "https://punchng.com/post-utme-forms",
        host: "punchng.com",
      },
      {
        title: "Universities open screening portals",
        url: "https://guardian.ng/screening-portals",
        host: "guardian.ng",
      },
    ]);
  });

  it("unwraps bing redirect links to the publisher URL", () => {
    const xml = rss(
      item(
        "Sleipner carbon storage marks thirty years",
        "https://www.bing.com/news/apiclick.aspx?ref=FexRss&amp;aid=&amp;url=https%3A%2F%2Fenergynews.example%2Fsleipner-30-years&amp;c=1",
      ),
    );
    const refs = parseNewsRss(xml, new Set());
    expect(refs).toEqual([
      {
        title: "Sleipner carbon storage marks thirty years",
        url: "https://energynews.example/sleipner-30-years",
        host: "energynews.example",
      },
    ]);
  });

  it("excludes given hosts, junk links, and caps at four outlets", () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      item(`Story number ${i} about the topic`, `https://outlet-${i}.com/story`),
    ).join("");
    const xml = rss(
      item("Story from the source site itself", "https://myschool.ng/news/dup") +
        item("bad", "https://ok.com/too-short-title") +
        item("Relative link should be skipped entirely", "/relative/path") +
        many,
    );
    const refs = parseNewsRss(xml, new Set(["myschool.ng"]));
    expect(refs).toHaveLength(4);
    expect(refs.every((ref) => ref.host.startsWith("outlet-"))).toBe(true);
  });

  it("returns empty for malformed feeds", () => {
    expect(parseNewsRss("not xml at all", new Set())).toEqual([]);
    expect(parseNewsRss(rss(""), new Set())).toEqual([]);
  });
});
