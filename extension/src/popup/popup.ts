import type { ExtractedDocument, OutputFormat } from "@/lib/types";
import { isCaptureResponse, type CaptureFailure, type CaptureResponse } from "../shared/messages";
import { toDocxBlob } from "../convert/toDocx";
import { toMarkdownBlob } from "../convert/toMarkdown";
import { openPrintView } from "../convert/toPdf";

const CAPTURE_TIMEOUT_MS = 20000;
const LAST_FORMAT_KEY = "offprint:last-format";

const body = document.getElementById("body") as HTMLElement;
let captured: ExtractedDocument | null = null;

const FORMATS: Array<{ id: OutputFormat; label: string; glyph: string; ext: string }> = [
  { id: "pdf", label: "PDF", glyph: "▤", ext: "pdf" },
  { id: "docx", label: "DOCX", glyph: "❖", ext: "docx" },
  { id: "md", label: "MD", glyph: "❯", ext: "md" },
];

const FAILURE_COPY: Record<CaptureFailure | "timeout", { headline: string; body: string }> = {
  "not-article": {
    headline: "No article here",
    body: "This page doesn't read like an article. Try it on a post, story, or docs page.",
  },
  restricted: {
    headline: "Can't run on this page",
    body: "Browser and store pages are off-limits. Open an article and try again.",
  },
  error: {
    headline: "Couldn't read this page",
    body: "Something got in the way. Reload the page and try once more.",
  },
  timeout: {
    headline: "That took too long",
    body: "The page didn't respond. Reload it and try again.",
  },
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function suggestFilename(title: string, ext: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .toLowerCase();
  return `${slug || "offprint-document"}.${ext}`;
}

function readingTime(wordCount: number): string {
  const minutes = Math.max(1, Math.round(wordCount / 200));
  return `${minutes} min read`;
}

function lastFormat(): OutputFormat {
  const stored = localStorage.getItem(LAST_FORMAT_KEY);
  return stored === "pdf" || stored === "docx" || stored === "md" ? stored : "pdf";
}

function render(node: HTMLElement): void {
  body.replaceChildren(node);
}

function renderLoading(): void {
  const wrap = el("div", "state loading");
  wrap.append(el("div", "sheet"), el("p", undefined, "Reading this page…"));
  render(wrap);
}

function renderFailure(reason: CaptureFailure | "timeout"): void {
  const copy = FAILURE_COPY[reason];
  const wrap = el("div", "state error");
  wrap.append(el("p", "headline", copy.headline), el("p", undefined, copy.body));
  render(wrap);
}

async function download(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    await chrome.downloads.download({ url, filename, saveAs: false });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

function renderConverting(label: string): void {
  const wrap = el("div", "state loading");
  const bar = el("div", "bar");
  bar.append(el("span"));
  wrap.append(el("div", "sheet"), el("p", undefined, label), bar);
  render(wrap);
}

function renderSuccess(filename: string): void {
  const wrap = el("div", "state");
  const success = el("div", "success");
  success.append(el("span", undefined, "✓"), el("span", undefined, "Saved to your downloads"));
  const name = el("p", "meta");
  name.style.textAlign = "center";
  name.textContent = filename;
  const again = el("button", "link", "Convert another format");
  again.addEventListener("click", () => {
    if (captured) renderReady(captured);
  });
  const wrapCenter = el("div");
  wrapCenter.style.textAlign = "center";
  wrapCenter.append(again);
  wrap.append(success, name, wrapCenter);
  render(wrap);
}

async function handleFormat(format: OutputFormat): Promise<void> {
  if (!captured) return;
  localStorage.setItem(LAST_FORMAT_KEY, format);

  if (format === "pdf") {
    renderConverting("Opening print view…");
    await openPrintView(captured);
    return;
  }

  renderConverting(format === "docx" ? "Building your DOCX…" : "Writing your Markdown…");
  try {
    const blob = format === "docx" ? await toDocxBlob(captured) : toMarkdownBlob(captured);
    const filename = suggestFilename(captured.title, format === "docx" ? "docx" : "md");
    await download(blob, filename);
    renderSuccess(filename);
  } catch {
    renderFailure("error");
  }
}

function renderReady(doc: ExtractedDocument): void {
  const wrap = el("div", "state");

  wrap.append(el("h1", "title", doc.title));

  const meta = el("p", "meta");
  const bits = [doc.siteName, readingTime(doc.wordCount)].filter(Boolean) as string[];
  meta.innerHTML = bits.map((bit) => `<span>${bit}</span>`).join('<span class="dot">·</span>');
  wrap.append(meta);

  const preview = el("div", "preview");
  const inner = el("div", "preview-inner");
  inner.innerHTML = `<h1>${doc.title}</h1>${doc.contentHtml}`;
  preview.append(inner, el("div", "preview-fade"));
  wrap.append(preview);

  const formats = el("div", "formats");
  const preferred = lastFormat();
  for (const format of FORMATS) {
    const button = el("button", "format");
    if (format.id === preferred) button.classList.add("default");
    button.append(el("span", "glyph", format.glyph), el("span", undefined, format.label));
    button.addEventListener("click", () => void handleFormat(format.id));
    formats.append(button);
  }
  wrap.append(formats);

  const hint = el("p", "hint");
  hint.innerHTML = "APA citation &amp; source added to every file · <b>files are never stored</b>";
  wrap.append(hint);

  render(wrap);
}

async function capture(): Promise<void> {
  renderLoading();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    renderFailure("restricted");
    return;
  }

  const response = new Promise<CaptureResponse>((resolve) => {
    const listener = (message: unknown) => {
      if (isCaptureResponse(message)) {
        chrome.runtime.onMessage.removeListener(listener);
        resolve(message);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
  });

  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["capture.js"] });
  } catch {
    renderFailure("restricted");
    return;
  }

  const timeout = new Promise<"timeout">((resolve) =>
    setTimeout(() => resolve("timeout"), CAPTURE_TIMEOUT_MS),
  );
  const result = await Promise.race([response, timeout]);

  if (result === "timeout") {
    renderFailure("timeout");
    return;
  }
  if (!result.ok) {
    renderFailure(result.reason);
    return;
  }
  captured = result.doc;
  renderReady(result.doc);
}

void capture();
