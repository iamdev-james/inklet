import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { closeBrowser } from "../src/lib/fetcher/browser";
import { assertPublicUrl } from "../src/lib/fetcher/guard";
import { convertUrl, suggestFilename } from "../src/lib/pipeline";
import { ConversionError } from "../src/lib/errors";
import type { OutputFormat } from "../src/lib/types";

const FORMATS: OutputFormat[] = ["pdf", "docx", "md"];

async function main(): Promise<number> {
  const [url, formatArg = "pdf"] = process.argv.slice(2);
  if (!url) {
    console.error("Usage: pnpm convert <url> <pdf|docx|md|all>");
    return 1;
  }
  const formats = formatArg === "all" ? FORMATS : [formatArg as OutputFormat];
  if (!formats.every((format) => FORMATS.includes(format))) {
    console.error(`Unknown format "${formatArg}". Use pdf, docx, md, or all.`);
    return 1;
  }

  try {
    await assertPublicUrl(url);
    const outDir = path.join(process.cwd(), "out");
    await mkdir(outDir, { recursive: true });

    for (const format of formats) {
      const started = Date.now();
      const { buffer, doc, converter } = await convertUrl(url, format);
      const filename = suggestFilename(doc.title, converter.extension);
      await writeFile(path.join(outDir, filename), buffer);
      console.log(
        `✓ ${format.padEnd(4)} ${filename} (${(buffer.byteLength / 1024).toFixed(1)} KB, ${Date.now() - started}ms, ${doc.wordCount} words, ${doc.images.length} images)`,
      );
    }
    return 0;
  } catch (err) {
    if (err instanceof ConversionError) {
      console.error(`✗ ${err.code}: ${err.message}`);
    } else {
      console.error("✗ unexpected failure:", err);
    }
    return 1;
  } finally {
    await closeBrowser();
  }
}

main().then((code) => {
  process.exitCode = code;
});
