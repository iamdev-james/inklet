import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { buildApaCitation } from "@/lib/citation/apa";
import { CONVERTED_WITH_LINE, formatDisplayDate } from "@/lib/template/document";
import type { ExtractedDocument, ReferenceLink } from "@/lib/types";

function yamlValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function frontMatter(entries: Array<[string, string | undefined]>): string {
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

function referenceList(label: string, refs: ReferenceLink[]): string[] {
  if (refs.length === 0) return [];
  return [`### ${label}`, refs.map((ref) => `- [${ref.title}](${ref.url}) — ${ref.host}`).join("\n")];
}

export function toMarkdownBlob(doc: ExtractedDocument): Blob {
  const citation = buildApaCitation(doc);
  const body = createTurndown().turndown(doc.contentHtml).trim();

  const markdown = [
    frontMatter([
      ["title", doc.title],
      ["author", doc.byline],
      ["site", doc.siteName],
      ["published", formatDisplayDate(doc.publishedAt)],
      ["source", doc.sourceUrl],
      ["captured", formatDisplayDate(doc.capturedAt)],
    ]),
    `# ${doc.title}`,
    body,
    "## References",
    citation.markdown,
    ...referenceList("Further reading", doc.references),
    ...referenceList("Related coverage", doc.related),
    "---",
    `*Source: ${doc.sourceUrl} — ${CONVERTED_WITH_LINE}.*`,
  ].join("\n\n");

  return new Blob([`${markdown}\n`], { type: "text/markdown;charset=utf-8" });
}
