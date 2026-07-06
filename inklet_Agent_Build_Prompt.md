# Offprint — Phase 1 Build Prompt (AI Agent, Phased Workflow)

> Paste this entire document as the working instruction set for the coding agent. The agent must execute **one phase at a time** and **STOP at every Human Review Gate**. Do not proceed past a gate without explicit approval.

---

## ROLE

You are a senior full-stack engineer building **Offprint** — a monolithic Next.js web application that converts any public article URL into a clean, downloadable PDF, DOCX, or Markdown file. You will build the Phase 1 scope only: the landing page and the paste-link conversion engine, as specified in the Offprint PRD v1 (Sections 6.2 and 7).

## ARCHITECTURE MANDATE — MONOLITH

- **One Next.js (App Router) application. One repository. One deployment unit.** No microservices, no separate worker service, no external queue infrastructure.
- Conversion runs inside the same app via Node.js route handlers. Playwright executes in-process with a small in-memory concurrency limiter (max 2 concurrent renders; excess requests receive a queued/busy response). Document this limiter clearly — it is the monolith's pressure valve.
- Route handlers that perform conversion MUST declare `export const runtime = "nodejs"` and an explicit `maxDuration`.
- All conversion logic lives in `src/lib/` as **pure, framework-agnostic TypeScript modules**. Route handlers are thin adapters: validate → call lib → stream response. If we ever extract a worker later, `src/lib/` must lift out untouched.

## NON-NEGOTIABLE ENGINEERING PRINCIPLES

1. **KISS** — the simplest implementation that satisfies the acceptance criteria. No speculative abstraction.
2. **YAGNI** — build nothing outside the current phase's task list. No accounts, no database, no storage. Nothing is persisted; converted files stream to the client and vanish.
3. **DRY** — one source of truth per concern: one extraction module, one citation module, one document HTML template consumed by all converters, one error taxonomy.
4. **SOLID** — each module has a single responsibility; converters implement a common `Converter` interface (`convert(doc: ExtractedDocument): Promise<Buffer>`); depend on the interface, not implementations.
5. **Server Components by default.** Client components ONLY for: the hero converter form, and animation sections. Justify every `"use client"` in a code comment.
6. **URL-driven state** where state exists at all (e.g., `?format=pdf` preselects the format).
7. **Strict TypeScript** (`strict: true`), no `any`, Zod validation at every boundary (API input, extraction output).
8. **Errors are a design surface.** Central `ConversionError` taxonomy: `INVALID_URL`, `FETCH_BLOCKED`, `LOGIN_REQUIRED`, `NOT_ARTICLE`, `TOO_LARGE`, `RATE_LIMITED`, `TIMEOUT`, `INTERNAL`. Every code maps to exact human-facing copy defined in Phase 3. Never leak stack traces or raw errors to the client.
9. **No dead code, no commented-out code, no TODOs left in delivered phases.**

## TARGET STRUCTURE

```
src/
  app/
    page.tsx                  // Landing page (Server Component shell)
    layout.tsx
    api/convert/route.ts      // POST — the only conversion endpoint
  components/
    hero/HeroConverter.tsx    // "use client"
    sections/                 // S2–S5 (server components; S2 animation part is client)
    ui/                       // Button, Input, SegmentedControl, Card
  lib/
    fetcher/renderPage.ts     // Playwright: URL -> rendered HTML (+ final URL, status)
    extract/extractArticle.ts // Readability -> ExtractedDocument
    extract/normalize.ts      // sanitize + normalize HTML, embed images (caps enforced)
    citation/apa.ts           // ExtractedDocument -> APA 7 reference string
    convert/Converter.ts      // interface + registry
    convert/toPdf.ts
    convert/toDocx.ts
    convert/toMarkdown.ts
    template/document.ts      // the single Offprint HTML document template
    errors.ts                 // ConversionError taxonomy
    rateLimit.ts              // in-memory sliding window per IP
  styles/
```

---

## PHASE 0 — Scaffold & Conventions

**Tasks**
1. Scaffold Next.js (App Router) + TypeScript (strict) + Tailwind CSS. Configure ESLint + Prettier with agreed rules; add `pnpm lint`, `pnpm typecheck`, `pnpm test` scripts.
2. Install and pin: `playwright` (chromium only), `@mozilla/readability`, `jsdom`, `turndown` + gfm plugin, `docx`, `zod`, `sanitize-html`. Justify any additional dependency in the PR description; default answer is no.
3. Create the folder structure above with typed placeholder modules (compiling, no logic).
4. Define shared types in `src/lib/types.ts`: `ExtractedDocument { title; byline?; siteName?; publishedAt?; sourceUrl; capturedAt; contentHtml; images: EmbeddedImage[] }`, `OutputFormat = "pdf" | "docx" | "md"`.
5. Set up Vitest with one passing smoke test.

**Acceptance:** `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` all pass on a clean clone.

**⛔ HUMAN REVIEW GATE 0** — Reviewer approves structure, dependencies, and types before any logic is written.

---

## PHASE 1 — Conversion Engine (pure lib, no UI, no API)

**Tasks**
1. `renderPage.ts`: launch/reuse a single Chromium instance; navigate with 15s timeout; block trackers/fonts/media requests it doesn't need; return rendered HTML + metadata. Detect login walls and paywall signals → throw `LOGIN_REQUIRED`.
2. `extractArticle.ts`: Readability over jsdom → `ExtractedDocument`. Compute a confidence score; below threshold → throw `NOT_ARTICLE`.
3. `normalize.ts`: sanitize-html allowlist (headings, p, lists, blockquote, table, pre/code, img, a, strong/em); download and inline images as base64 with caps (max 20 images, 15 MB total, skip-with-placeholder beyond caps); resolve relative URLs.
4. **`citation/apa.ts` — APA 7th edition reference builder.** This is a first-class requirement:
   - Full pattern: `Author, A. A. (Year, Month Day). *Title of page*. Site Name. URL`
   - Missing author → move title to author position: `*Title*. (Year, Month Day). Site Name. URL`
   - Missing date → `(n.d.)`.
   - Site name equals author (org as author) → omit the duplicate site name.
   - Parse bylines like "By Jane Doe" / "Jane Doe and John Smith" into inverted APA form (`Doe, J., & Smith, J.`); if parsing is uncertain, use the byline verbatim rather than a wrong inversion.
   - Return both a plain-text and an HTML (italicized title) rendering.
   - Unit-test all fallback branches (≥ 10 cases).
5. `template/document.ts`: ONE HTML template used by PDF (directly) and DOCX/MD (as normalized source): metadata header (title, byline, site, dates, source link) → content → **"References" section containing the APA citation** → footer with source URL + "Converted with Offprint" line.
6. Converters:
   - `toPdf.ts`: template HTML → Playwright `page.pdf()` (A4, margins, page numbers, footer). Serif body, clean heading scale — the file must look designed.
   - `toDocx.ts`: normalized HTML → `docx` library mapping (headings, lists, tables, images, code as monospace shaded paragraphs, hyperlinks live). References section as a styled heading + hanging-indent paragraph.
   - `toMarkdown.ts`: Turndown GFM; fenced code blocks; metadata as YAML front matter; APA reference under a `## References` heading at the end.

**Acceptance:** a CLI script (`pnpm convert <url> <format>`) produces correct files for a fixture set of **10 diverse real URLs** (news article, dev blog with code, docs page, Wikipedia, image-heavy post, no-author page, no-date page, table-heavy page, long-read, non-English page). Every output file ends with a correct APA reference. All unit tests pass.

**⛔ HUMAN REVIEW GATE 1** — Reviewer manually inspects the 30 generated files (10 URLs × 3 formats) for extraction quality, typography, and citation correctness.

---

## PHASE 2 — API Layer

**Tasks**
1. `POST /api/convert`: Zod-validated body `{ url: string; format: OutputFormat }`. Enforce: http/https only, public host (reject private/loopback IP ranges and cloud metadata endpoints — **SSRF guard is mandatory**), max URL length.
2. In-memory rate limiter: 10 conversions/hour per IP → `RATE_LIMITED` with `Retry-After`.
3. Concurrency limiter (max 2 in-flight renders) with a bounded wait; overflow → busy response with retry guidance.
4. Stream the file with correct `Content-Type` and a sanitized `Content-Disposition` filename derived from the article title.
5. Map every `ConversionError` to status + stable error code JSON; log server-side with request ID; nothing persisted, temp data disposed in `finally`.
6. Integration tests: happy path per format, each error path, rate-limit path, SSRF rejection.

**Acceptance:** all integration tests pass; a `curl` of the endpoint downloads a valid file; malicious URL fixtures (localhost, 169.254.169.254, file://) are rejected.

**⛔ HUMAN REVIEW GATE 2** — Security-focused review: SSRF guard, rate limiting, error hygiene.

---

## PHASE 3 — Landing Page (static, no animation yet)

**Tasks**
1. Implement the design system: paper `#FAFAF7`, ink `#111110`, accent `#FF4D00`; display serif (Fraunces or Instrument Serif via `next/font`) + Inter for UI; spacing and type scale as Tailwind theme tokens — no magic values in components.
2. Build S1–S5 per PRD Section 7.2 as Server Components with semantic HTML (`header/main/section/footer`, one `h1`). Hero converter renders as a static form shell this phase (disabled submit).
3. Write ALL page copy (≤ 120 words) and ALL error-state copy for the eight error codes.
4. Responsive 360px → 1920px; keyboard navigable; visible focus states; WCAG AA contrast.

**Acceptance:** pixel-reviewed static page; Lighthouse a11y ≥ 95; zero client components except the (inert) hero form.

**⛔ HUMAN REVIEW GATE 3** — Design/copy review against PRD 7.2–7.3.

---

## PHASE 4 — Hero Converter (client integration)

**Tasks**
1. `HeroConverter.tsx` (`"use client"`): controlled URL input, format segmented control (default PDF, synced to `?format=`), submit → `POST /api/convert` → blob download.
2. Explicit state machine: `idle → validating → converting → success | error(code)`. Render exact copy per error code from Phase 3. Success card: filename, size, Download again, and the extension soft-prompt ("Coming soon" state).
3. Client-side URL pre-validation mirrors server rules (shared Zod schema — DRY).
4. Abort/timeout handling (60s client cap), double-submit prevention, loading affordance (plain progress this phase; animation lands in Phase 5).

**Acceptance:** full happy path works in the browser for all three formats against real URLs; every error state is reachable and readable; no unhandled promise rejections.

**⛔ HUMAN REVIEW GATE 4** — End-to-end product walkthrough.

---

## PHASE 5 — Animation & Motion

**Tasks**
1. S2 signature scroll sequence (clutter sheds → typography remains → folds into a file icon cycling PDF/DOCX/MD) using Motion's `useScroll` + transforms. Transform/opacity only; target 60fps; isolate as one client component.
2. Hero conversion animation: input morphs → page-fold progress → snap into download card (~2s, spring-based).
3. Micro-interactions on S3 cards and buttons.
4. `prefers-reduced-motion`: static before/after frame for S2, plain progress bar for the hero. Mobile: simplified S2 variant.

**Acceptance:** no dropped-frame jank on a mid-range laptop (DevTools performance trace attached to PR); reduced-motion verified; CLS < 0.05 maintained.

**⛔ HUMAN REVIEW GATE 5** — Motion quality review on desktop + real mobile device.

---

## PHASE 6 — Hardening & Launch Readiness

**Tasks**
1. SEO: metadata, OpenGraph/Twitter card (design a static OG image), sitemap, robots.
2. Analytics (Plausible or Umami): `hero_convert_attempt`, `hero_convert_success{format}`, `hero_convert_error{code}`, `cta_extension_click`.
3. Performance pass to PRD budgets: Lighthouse Perf ≥ 90 mobile / ≥ 95 desktop, LCP < 2.0s.
4. Regression fixture suite grown to 25 URLs, run via one script; failures triaged before launch.
5. README: architecture overview, module map, how to run, how the monolith's limiters work, and the extraction-worker exit path (documented only — not built).

**Acceptance:** budgets met with reports attached; regression suite ≥ 90% clean-output rate; README complete.

**⛔ HUMAN REVIEW GATE 6 — LAUNCH SIGN-OFF.**

---

## STANDING RULES FOR EVERY PHASE

- Deliver each phase as a single reviewable changeset with a summary: what was built, decisions made, deviations proposed (never silently applied).
- If a PRD requirement conflicts with a principle above, STOP and ask — do not guess.
- Never widen scope. Anything discovered but out-of-phase goes in a `NOTES.md` backlog.
- All commits conventional (`feat:`, `fix:`, `chore:`), imperative, scoped.
