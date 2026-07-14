import type { ExtractedDocument } from "@/lib/types";
import type { StashPrintMessage } from "../shared/messages";

export async function openPrintView(doc: ExtractedDocument): Promise<void> {
  const id = crypto.randomUUID();
  const message: StashPrintMessage = { __offprint: "stash-print", id, doc };
  await chrome.runtime.sendMessage(message);
  await chrome.tabs.create({
    url: chrome.runtime.getURL(`print.html?id=${id}`),
    active: true,
  });
}
