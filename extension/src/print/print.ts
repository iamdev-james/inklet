import { buildApaCitation } from "@/lib/citation/apa";
import { buildDocumentHtml } from "@/lib/template/document";
import type { ExtractedDocument } from "@/lib/types";

function waitForImages(): Promise<void> {
  const images = Array.from(document.images);
  return Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
    ),
  ).then(() => undefined);
}

async function main(): Promise<void> {
  const id = new URLSearchParams(location.search).get("id");
  const status = document.getElementById("status");
  if (!id) {
    if (status) status.textContent = "Nothing to print.";
    return;
  }

  const response = (await chrome.runtime.sendMessage({ __offprint: "take-print", id })) as {
    doc: ExtractedDocument | null;
  };
  const doc = response?.doc;
  if (!doc) {
    if (status) status.textContent = "This print job expired — close this tab and try again.";
    return;
  }

  const parsed = new DOMParser().parseFromString(
    buildDocumentHtml(doc, buildApaCitation(doc)),
    "text/html",
  );
  document.title = doc.title;
  for (const style of Array.from(parsed.head.querySelectorAll("style"))) {
    document.head.appendChild(style.cloneNode(true));
  }
  document.body.innerHTML = parsed.body.innerHTML;

  await waitForImages();
  window.focus();
  window.print();
}

void main();
