# Offprint — Chrome extension

Capture the page you're reading as a clean, cited **PDF, DOCX, or Markdown**
file — one click, fully client-side, nothing stored. This is Phase 2 of the
Offprint roadmap; the paste-a-link web converter is the Next.js app in the repo
root.

## Why an extension in addition to the web app

The web converter fetches a URL server-side, so it only sees what an anonymous
request sees. The extension runs Readability on the **rendered DOM of the tab
you're on**, so it works on JavaScript-heavy pages and anything you're already
logged in to — "works on anything *you* can see." Conversion runs entirely in
the browser, so it's unlimited and costs nothing to run.

## Permissions (exactly three)

| Permission  | Why |
|-------------|-----|
| `activeTab` | Read the current tab's DOM — only when you click the icon. |
| `scripting` | Inject the one-shot capture script into that tab. |
| `downloads` | Save the finished DOCX / Markdown file. |

No host permissions, no background page listening on every site, no storage of
page content. The minimal footprint is a store-review and trust advantage.

## How it works

```
click toolbar icon  (Alt+Shift+O)
  └─ popup injects capture.js into the active tab  (scripting + activeTab)
       └─ Readability on a clone of the live DOM → strip clutter / comments
          → allowlist-sanitize → inline images (fetch with page origin)
          → harvest "Further reading" links
       └─ posts a serializable ExtractedDocument back to the popup
  └─ popup renders title · reading time · live cleaned-content preview
  └─ pick a format:
       • MD   → Turndown (GFM) → blob → downloads API
       • DOCX → docx library walker → blob → downloads API
       • PDF  → shared HTML template rendered in an extension print page
                → the browser's own print engine (vector text, real pagination)
```

Every file ends with an **APA 7 citation** of the source plus the harvested
**Further reading** list, and carries the source URL in its footer.

### Shared with the web app (DRY)

The extension imports the framework-agnostic modules from `../src/lib` via the
`@` alias — so citations and the document look are identical across both
surfaces:

- `@/lib/citation/apa` — APA 7 builder with all the fallback rules
- `@/lib/template/document` — the single Offprint HTML document template (drives PDF)
- `@/lib/types`, `@/lib/errors`

The DOM-dependent parts (`src/content/*`) are browser-native reimplementations,
because the input is a live rendered document rather than a fetched HTML string —
Readability runs on the real DOM, and images are fetched with the page's own
origin/cookies. The converters (`src/convert/*`) reuse the shared citation and
template modules and add browser blob output.

## Build

```bash
pnpm ext:build       # → extension/dist  (unpacked, load-ready)
pnpm ext:typecheck   # strict types, chrome globals
```

The build (`build.mjs`) runs four isolated Vite bundles — `capture.js` (IIFE,
injected), `popup.js`, `print.js`, `background.js` — then copies the manifest,
HTML, CSS, and icons into `dist/`.

## Load it unpacked

1. `pnpm ext:build`
2. Open `chrome://extensions`, enable **Developer mode**.
3. **Load unpacked** → select **`extension/dist`** — the compiled folder, **not**
   `extension/` itself. (The source folder has no built `background.js`, so Chrome
   rejects it with "Could not load manifest.")
4. Open any article, click the Offprint icon (or press **Alt+Shift+O**), pick a
   format. MD/DOCX land in Downloads; PDF opens a print-ready tab.

`extension/dist` is gitignored — always run `pnpm ext:build` first (or after any
change).

## Publish to the Chrome Web Store

```bash
pnpm ext:pack     # builds, then zips → extension/offprint-extension.zip
```

1. **Register** a Chrome Web Store developer account at
   <https://chrome.google.com/webstore/devconsole> (one-time US $5 fee).
2. **Create item** → upload `extension/offprint-extension.zip`.
3. **Fill the listing**: name, summary, a detailed description, at least one
   1280×800 (or 640×400) screenshot, the 128px icon (already in the zip), and a
   category (Productivity).
4. **Privacy**: declare the single-purpose ("convert the current page to a
   file"), justify each permission (activeTab/scripting to read the page you're
   on, downloads to save the file), and link a privacy policy. Offprint stores
   and transmits nothing — say exactly that. No data-collection disclosures are
   needed because none is collected.
5. **Submit for review.** MV3 items with this permission set usually clear in a
   few days.
6. **After approval**, copy the listing URL
   (`https://chromewebstore.google.com/detail/<id>`) into the landing page:
   set `NEXT_PUBLIC_CHROME_STORE_URL` in the web app's environment (see
   `src/lib/links.ts`). The "Add to Chrome" buttons already point at it.

To bump a release: raise `version` in `static/manifest.json`, `pnpm ext:pack`,
and upload the new zip.

## Known limits (v1)

- **PDF** uses the browser's print dialog (Save as PDF) rather than a silent
  download — this keeps output fully client-side with vector text and correct
  pagination, and needs no extra permission.
- **Related coverage** (the multi-outlet news search in the web app) is omitted
  here to avoid a network call from the extension; the page's own cited links
  still power "Further reading".
- **Images** are inlined via `fetch`; a cross-origin image that blocks CORS is
  dropped rather than hotlinked (nothing is stored or leaked).
