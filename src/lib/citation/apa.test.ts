import { describe, expect, it } from "vitest";
import { buildApaCitation, formatApaDate, formatAuthors } from "./apa";

const base = {
  title: "How rivers remember",
  byline: "By Jane Doe",
  siteName: "The Atlas Review",
  publishedAt: "2024-03-09T10:30:00Z",
  sourceUrl: "https://atlasreview.com/rivers",
};

describe("formatAuthors", () => {
  it("strips the By prefix and inverts a single name", () => {
    expect(formatAuthors("By Jane Doe")).toBe("Doe, J.");
  });

  it("joins two authors with an ampersand", () => {
    expect(formatAuthors("Jane Doe and John Smith")).toBe("Doe, J., & Smith, J.");
  });

  it("handles three or more comma-separated authors", () => {
    expect(formatAuthors("Jane Doe, John Smith and Amy B. Chen")).toBe(
      "Doe, J., Smith, J., & Chen, A. B.",
    );
  });

  it("keeps middle names as extra initials", () => {
    expect(formatAuthors("Mary Jane Watson")).toBe("Watson, M. J.");
  });

  it("hyphenates initials for hyphenated given names", () => {
    expect(formatAuthors("Jean-Luc Picard")).toBe("Picard, J.-L.");
  });

  it("falls back to the verbatim byline when parsing is uncertain", () => {
    expect(formatAuthors("Reuters Staff")).toBe("Reuters Staff");
    expect(formatAuthors("The BBC Climate Desk")).toBe("The BBC Climate Desk");
  });

  it("does not invert names carrying generational suffixes", () => {
    expect(formatAuthors("Robert Downey Jr.")).toBe("Robert Downey Jr.");
  });
});

describe("formatApaDate", () => {
  it("renders full dates as (Year, Month Day) in UTC", () => {
    expect(formatApaDate("2024-03-09T10:30:00Z")).toBe("(2024, March 9)");
  });

  it("renders bare years", () => {
    expect(formatApaDate("2021")).toBe("(2021)");
  });

  it("renders (n.d.) for missing or unparseable dates", () => {
    expect(formatApaDate(undefined)).toBe("(n.d.)");
    expect(formatApaDate("last Tuesday-ish")).toBe("(n.d.)");
  });
});

describe("buildApaCitation", () => {
  it("builds the full author-date pattern", () => {
    const citation = buildApaCitation(base);
    expect(citation.text).toBe(
      "Doe, J. (2024, March 9). How rivers remember. The Atlas Review. https://atlasreview.com/rivers",
    );
  });

  it("moves the title into the author slot when the author is missing", () => {
    const citation = buildApaCitation({ ...base, byline: undefined });
    expect(citation.text).toBe(
      "How rivers remember. (2024, March 9). The Atlas Review. https://atlasreview.com/rivers",
    );
  });

  it("uses (n.d.) when the date is missing", () => {
    const citation = buildApaCitation({ ...base, publishedAt: undefined });
    expect(citation.text).toBe(
      "Doe, J. (n.d.). How rivers remember. The Atlas Review. https://atlasreview.com/rivers",
    );
  });

  it("handles missing author and date together", () => {
    const citation = buildApaCitation({ ...base, byline: undefined, publishedAt: undefined });
    expect(citation.text).toBe(
      "How rivers remember. (n.d.). The Atlas Review. https://atlasreview.com/rivers",
    );
  });

  it("omits the site name when the org is the author", () => {
    const citation = buildApaCitation({ ...base, byline: "The Atlas Review" });
    expect(citation.text).toBe(
      "The Atlas Review. (2024, March 9). How rivers remember. https://atlasreview.com/rivers",
    );
  });

  it("does not double up terminal punctuation on titles", () => {
    const citation = buildApaCitation({ ...base, title: "Where did the water go?" });
    expect(citation.text).toContain("Where did the water go? The Atlas Review.");
  });

  it("italicizes the title in the HTML rendering only", () => {
    const citation = buildApaCitation(base);
    expect(citation.html).toContain("<em>How rivers remember</em>");
    expect(citation.markdown).toContain("*How rivers remember*");
    expect(citation.text).not.toContain("<em>");
  });

  it("escapes HTML-sensitive characters in the HTML rendering", () => {
    const citation = buildApaCitation({ ...base, title: "Salt & <light>" });
    expect(citation.html).toContain("<em>Salt &amp; &lt;light&gt;</em>");
  });

  it("keeps the source URL as the final segment", () => {
    const citation = buildApaCitation(base);
    const last = citation.segments[citation.segments.length - 1];
    expect(last.text).toBe(base.sourceUrl);
    expect(last.italic).toBe(false);
  });
});
