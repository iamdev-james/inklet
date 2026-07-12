import type { ExtractedDocument } from "@/lib/types";
import type { StashPrintMessage } from "../shared/messages";

// PDF stays fully client-side: the shared Offprint document template is rendered
// in an extension print page and handed to the browser's own print engine
// (vector text, real pagination). No server round-trip, no extra permission.
export async function openPrintView(doc: ExtractedDocument): Promise<void> {
  const id = crypto.randomUUID();
  const message: StashPrintMessage = { __offprint: "stash-print", id, doc };
  await chrome.runtime.sendMessage(message);
  await chrome.tabs.create({
    url: chrome.runtime.getURL(`print.html?id=${id}`),
    active: true,
  });
}
