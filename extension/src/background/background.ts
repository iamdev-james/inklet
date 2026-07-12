import type { ExtractedDocument } from "@/lib/types";

// Short-lived hand-off between the popup and the print page. Nothing is
// persisted — the entry is deleted the moment the print page reads it.
const printJobs = new Map<string, ExtractedDocument>();

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const msg = message as { __offprint?: string; id?: string; doc?: ExtractedDocument };

  if (msg?.__offprint === "stash-print" && msg.id && msg.doc) {
    printJobs.set(msg.id, msg.doc);
    sendResponse({ ok: true });
    return;
  }

  if (msg?.__offprint === "take-print" && msg.id) {
    const doc = printJobs.get(msg.id) ?? null;
    printJobs.delete(msg.id);
    sendResponse({ doc });
    return;
  }
});
