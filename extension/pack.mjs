import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(dir, "dist");
const zip = path.join(dir, "offprint-extension.zip");

// Zip the built dist/ into a Web-Store-ready upload. Run `pnpm ext:build` first
// (the ext:pack script chains them).
await rm(zip, { force: true });
execFileSync("zip", ["-qr", zip, "."], { cwd: dist, stdio: "inherit" });
console.log(`✓ packed → ${path.relative(process.cwd(), zip)}  (upload this to the Chrome Web Store)`);
