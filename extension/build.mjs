import { rm, mkdir, copyFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build } from "vite";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "..");
const outDir = path.join(dir, "dist");

const alias = { "@": path.join(root, "src") };
const shared = {
  configFile: false,
  root,
  publicDir: false,
  resolve: { alias },
  logLevel: "warn",
};

async function bundle(entry, fileName, format, name) {
  await build({
    ...shared,
    define: format === "iife" ? { "process.env.NODE_ENV": '"production"' } : {},
    build: {
      target: "chrome111",
      outDir,
      emptyOutDir: false,
      minify: "esbuild",
      lib: {
        entry: path.join(dir, entry),
        formats: [format],
        name,
        fileName: () => fileName,
      },
    },
  });
}

async function copyDir(from, to) {
  await mkdir(to, { recursive: true });
  for (const name of await readdir(from)) {
    await copyFile(path.join(from, name), path.join(to, name));
  }
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await bundle("src/content/capture.ts", "capture.js", "iife", "OffprintCapture");
await bundle("src/popup/popup.ts", "popup.js", "es");
await bundle("src/print/print.ts", "print.js", "es");
await bundle("src/background/background.ts", "background.js", "es");

const staticDir = path.join(dir, "static");
await copyFile(path.join(staticDir, "manifest.json"), path.join(outDir, "manifest.json"));
await copyFile(path.join(staticDir, "index.html"), path.join(outDir, "index.html"));
await copyFile(path.join(staticDir, "print.html"), path.join(outDir, "print.html"));
await copyFile(path.join(dir, "src/popup/popup.css"), path.join(outDir, "popup.css"));
await copyDir(path.join(staticDir, "icons"), path.join(outDir, "icons"));

console.log("✓ extension built → extension/dist  (load THIS folder as unpacked)");
