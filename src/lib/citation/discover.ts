import { JSDOM, VirtualConsole } from "jsdom";
import { BROWSER_USER_AGENT } from "@/lib/fetcher/renderPage";
import type { ReferenceLink } from "@/lib/types";

const DISCOVER_TIMEOUT_MS = 4_000;
const MAX_RELATED = 4;
const MIN_TITLE_LENGTH = 8;

function directUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (/(^|\.)bing\.com$/i.test(url.hostname)) {
    const embedded = url.searchParams.get("url");
    if (!embedded) return null;
    try {
      url = new URL(embedded);
    } catch {
      return null;
    }
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return url;
}

export function parseNewsRss(xml: string, excludeHosts: ReadonlySet<string>): ReferenceLink[] {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", () => undefined);
  let dom: JSDOM;
  try {
    dom = new JSDOM(xml, { contentType: "text/xml", virtualConsole });
  } catch {
    return [];
  }

  const seenHosts = new Set<string>();
  const related: ReferenceLink[] = [];
  for (const item of Array.from(dom.window.document.querySelectorAll("item"))) {
    const title = item.querySelector("title")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const url = directUrl(item.querySelector("link")?.textContent ?? "");
    if (!url || title.length < MIN_TITLE_LENGTH) continue;

    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (excludeHosts.has(host) || seenHosts.has(host)) continue;

    seenHosts.add(host);
    url.hash = "";
    related.push({ title, url: url.href, host });
    if (related.length >= MAX_RELATED) break;
  }
  return related;
}

function searchQuery(title: string): string {
  return title
    .split(/\s+[-–—|·]\s+/)[0]
    .split(/\s+/)
    .slice(0, 12)
    .join(" ")
    .trim();
}

export async function discoverRelated(
  title: string,
  excludeHosts: ReadonlySet<string>,
): Promise<ReferenceLink[]> {
  const query = searchQuery(title);
  if (query.length < 4) return [];

  try {
    const response = await fetch(
      `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`,
      {
        headers: {
          "user-agent": BROWSER_USER_AGENT,
          accept: "application/rss+xml, text/xml;q=0.9, */*;q=0.5",
        },
        signal: AbortSignal.timeout(DISCOVER_TIMEOUT_MS),
      },
    );
    if (!response.ok) return [];
    return parseNewsRss(await response.text(), excludeHosts);
  } catch {
    return [];
  }
}
