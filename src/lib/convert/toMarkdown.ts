import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { buildApaCitation } from "@/lib/citation/apa";
import { CONVERTED_WITH_LINE, formatDisplayDate } from "@/lib/template/document";
import type { Converter } from "./Converter";

function yamlValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function buildFrontMatter(entries: Array<[string, string | undefined]>): string {
  const lines = entries
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `${key}: ${yamlValue(value)}`);
  return `---\n${lines.join("\n")}\n---`;
}

function createTurndown(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
  });
  turndown.use(gfm);
  turndown.addRule("definitionTerm", {
    filter: "dt",
    replacement: (content) => `\n**${content.trim()}**\n`,
  });
  turndown.addRule("definitionDetail", {
    filter: "dd",
    replacement: (content) => `\n: ${content.trim()}\n`,
  });
  return turndown;
}

export const markdownConverter: Converter = {
  format: "md",
  contentType: "text/markdown; charset=utf-8",
  extension: "md",

  async convert(doc) {
    const citation = buildApaCitation(doc);
    const body = createTurndown().turndown(doc.contentHtml).trim();

    const frontMatter = buildFrontMatter([
      ["title", doc.title],
      ["author", doc.byline],
      ["site", doc.siteName],
      ["published", formatDisplayDate(doc.publishedAt)],
      ["source", doc.sourceUrl],
      ["captured", formatDisplayDate(doc.capturedAt)],
    ]);

    const referenceList = (label: string, refs: typeof doc.references): string[] =>
      refs.length > 0
        ? [`### ${label}`, refs.map((ref) => `- [${ref.title}](${ref.url}) — ${ref.host}`).join("\n")]
        : [];

    const markdown = [
      frontMatter,
      `# ${doc.title}`,
      body,
      "## References",
      citation.markdown,
      ...referenceList("Further reading", doc.references),
      ...referenceList("Related coverage", doc.related),
      "---",
      `*Source: ${doc.sourceUrl} — ${CONVERTED_WITH_LINE}.*`,
    ].join("\n\n");

    return Buffer.from(`${markdown}\n`, "utf8");
  },
};
