# Offprint

*Any page. Your file.* — Offprint turns any public article URL into a clean, downloadable
**PDF**, **DOCX**, or **Markdown** file. Landing page and paste-link converter in one
Next.js monolith: one repository, one deployment unit, nothing persisted.

## Running it

```bash
pnpm install
npx playwright install chromium   # one-time browser download
pnpm dev                          # http://localhost:3000
```

Checks: `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build`

CLI conversion (no server needed):

```bash
pnpm convert https://example.com/article pdf    # pdf | docx | md | all → ./out/
```

## Architecture

One Next.js (App Router) application. Conversion runs in-process in Node route
handlers — no worker service, no queue. All conversion logic lives in `src/lib/`
as pure, framework-agnostic TypeScript; the route handler is a thin adapter
(validate → call lib → stream response).

```
POST /api/convert { url, format }
  → rateLimit.ts          in-memory sliding window, 10 conversions/hour per IP
  → fetcher/guard.ts      SSRF guard: http(s)-only, DNS-resolved public-IP check
  → concurrency.ts        render semaphore (see "Pressure valve" below)
  → fetcher/renderPage.ts Playwright Chromium render (15s cap, tracker/media blocking,
                          login-wall detection)
  → extract/extractArticle.ts  Readability + confidence score, adaptive two-pass
                          extraction for link-dense articles, comment-section cutoff
  → extract/normalize.ts  sanitize-html allowlist, relative-URL resolution,
                          image embedding (max 20 images / 15 MB, guarded fetches)
  → citation/apa.ts       APA 7 reference with fallback rules for missing author/date
  → citation/references.ts  "Further reading" list harvested from the article's own
                          cited links (deduped, tracking params stripped, max 8)
  → citation/discover.ts  "Related coverage" from a news-index RSS search, one entry
                          per outlet; fires only when references span < 3 sites,
                          4s timeout, fails silent
  → template/document.ts  the single Offprint HTML document template
  → convert/{toPdf,toDocx,toMarkdown}.ts  via the shared Converter interface
  → streamed download (Content-Disposition from the article title)
```

Errors are a design surface: every failure maps to one of eight `ConversionError`
codes (`src/lib/errors.ts`), each with fixed human-facing copy shared by the API
and the hero UI. Stack traces never reach the client; server logs carry a request ID.

### The pressure valve

Playwright renders are the expensive resource, so the monolith throttles itself
in `src/lib/concurrency.ts`: at most **2 renders in flight**, up to **4 requests
queued for 15s**, and everything beyond that is turned away immediately with a
busy response (`429` + `Retry-After`). This is intentional back-pressure — the
app degrades by refusing work early instead of piling up headless browsers.

Both limiters are in-memory by design (single deployment unit). Horizontal
scaling would need a shared store — out of scope for Phase 1.

### Privacy

Nothing is stored. Fetched pages, embedded images, and generated files live in
memory for the duration of one request and are gone when the response ends.

### Extraction-worker exit path (documented, not built)

If conversion ever needs to scale independently, `src/lib/` lifts out untouched:
the modules are pure TypeScript with no Next.js imports. A worker would import
`convertUrl` from `src/lib/pipeline.ts`, the route handler would enqueue instead
of calling it inline, and the SSRF guard, limiters, and error taxonomy move with
the lib. That is the entire migration.

## Frontend

Dark clay-morphism landing page: void `#05060a`, light ink `#f2f2f4`, signal
orange `#FF4D00` (primary action) with green `#12d56f` for success moments,
Inter throughout (Fraunces only in the wordmark), design tokens in `globals.css`
(Tailwind v4 `@theme`). Server Components by default; client islands are the
hero converter (`components/hero/HeroConverter.tsx`) and the animation sections
(`ClayCollage`, `Quiz`, `StatementBento`, `ProductShot`, `Quotes`, `FinalCta` —
Motion springs, `useScroll` word-reveal quotes, all with reduced-motion
fallbacks).
