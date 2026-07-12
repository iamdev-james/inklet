import type { CaptureResponse } from "../shared/messages";
import { extractFromPage } from "./extract";
import { normalizeContent } from "./normalize";
import { collectReferences } from "./references";

declare global {
  interface Window {
    __offprintCapturing?: boolean;
  }
}

function send(response: CaptureResponse): void {
  chrome.runtime.sendMessage(response).catch(() => undefined);
}

async function run(): Promise<void> {
  if (window.__offprintCapturing) return;
  window.__offprintCapturing = true;

  try {
    if (!/^https?:$/.test(location.protocol)) {
      send({ __offprint: "capture", ok: false, reason: "restricted" });
      return;
    }

    const result = extractFromPage();
    if (!result) {
      send({ __offprint: "capture", ok: false, reason: "not-article" });
      return;
    }

    const references = collectReferences(result.contentRoot, result.doc.sourceUrl);
    const { contentHtml, images } = await normalizeContent(
      result.contentRoot,
      result.doc.sourceUrl,
    );

    send({
      __offprint: "capture",
      ok: true,
      confidence: result.confidence,
      doc: { ...result.doc, contentHtml, images, references },
    });
  } catch (error) {
    send({
      __offprint: "capture",
      ok: false,
      reason: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    window.__offprintCapturing = false;
  }
}

void run();
