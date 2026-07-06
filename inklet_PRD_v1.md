# Offprint — Product Requirements Document (v1.0)

**Tagline:** *Any page. Your file. One click.*
**Status:** Draft for build — Landing Page is the only in-scope deliverable for Phase 1
**Owner:** Adigun James Oluwabukola
**Date:** July 2026

---

## 1. Product Name & Rationale

**Offprint** — In academic publishing, an *offprint* is a standalone printed copy of a single article, separated from the journal it appeared in. That is literally what this product does: it separates an article from the noise of the web and hands it to you as a clean, portable file. The name is short, memorable, brandable, and resonates directly with the student/researcher segment while remaining intuitive to everyone else.

**Backup name candidates (if domain/trademark conflicts arise):** Pagefold, Inklet, SnapDoc, Papyr.

---

## 2. Problem Statement

People constantly find web content they want to keep, share, cite, or read offline — articles, tutorials, documentation, research posts. Their current options are all bad:

- **Ctrl+P → Save as PDF** produces ugly output riddled with ads, cookie banners, navigation bars, and broken layouts.
- **Copy-paste into Word/Docs** destroys formatting, loses images, and takes manual cleanup.
- **Read-later apps (Pocket, Instapaper)** lock content inside their own ecosystem — no real file you own.
- **Online converter sites** are spammy, slow, ad-heavy, and mangle modern JavaScript-rendered pages.

There is no fast, clean, trustworthy way to turn a webpage into a well-formatted file you actually own.

## 3. Product Vision

Offprint is a free Chrome extension and companion web app that converts any article or resource page into a clean, beautifully formatted, downloadable file (PDF, DOCX, or Markdown) in one click. It strips the clutter, keeps the substance — headings, images, code blocks, tables, links, author, and date — and gives users a document that looks intentionally designed, not printed by accident.

## 4. Goals & Non-Goals

### Goals (v1)
1. One-click capture of the current page via the extension.
2. Paste-a-link conversion via the web app / landing page (no install required).
3. Three export formats: **PDF, DOCX, Markdown** — each with clean, consistent typography.
4. A landing page that converts visitors through delight: minimal copy, exceptional animation, and a working paste-link demo as the hero.
5. Completely free. Growth and word-of-mouth first; monetization deferred.

### Non-Goals (v1)
- No accounts, sync, libraries, folders, or cloud storage.
- No EPUB, batch conversion, or full-site crawling.
- No annotation, highlighting, or editing.
- No Firefox/Safari ports (Chromium-family only).
- No bypassing of paywalls or authentication walls — Offprint converts what the user can legitimately see.

## 5. Target Users

| Persona | Scenario | What they need |
|---|---|---|
| **The Student/Researcher** | Saving articles and papers for citation and offline study | Clean PDFs with preserved metadata (title, author, source URL, date) |
| **The Curator/Marketer** | Archiving competitor content, briefs, references for a team | DOCX they can drop into their workflow and edit |
| **The Developer/Writer** | Saving tutorials, docs, blog posts | Markdown with intact code blocks, ready for their notes vault (Obsidian/Notion) |
| **The Everyday Reader** | "I want to read this on the plane / keep this forever" | One click, zero decisions, a file in Downloads |

One product serves all four because the core job is identical — only the output format differs. Format choice is the single decision we surface.

## 6. Product Surfaces & Core Flows

### 6.1 Chrome Extension (Phase 2)

**Flow A — Capture current page**
1. User is on an article → clicks the Offprint toolbar icon (or presses `Alt+Shift+O`).
2. A compact popup slides in showing: detected page title, estimated reading length, a live thumbnail preview of the cleaned content, and three format buttons — PDF · DOCX · MD.
3. User clicks a format → progress micro-animation (page "folds" into a file icon) → file downloads. Total target time: **under 3 seconds** for a typical article.
4. Popup remembers the last-used format and highlights it as the default.

**Extraction requirements**
- Runs Readability-class content extraction in a content script (Mozilla Readability.js or equivalent) on the *rendered* DOM — so JS-rendered pages work by definition.
- Preserves: headings hierarchy, paragraphs, bold/italic, links (as real hyperlinks in PDF/DOCX, inline in MD), images (embedded, not hotlinked), ordered/unordered lists, blockquotes, tables, and code blocks with monospace styling.
- Prepends a metadata block: title, author (if detected), source URL, publication date (if detected), capture date.
- Appends a **References** section at the end of every exported file containing an APA 7th edition citation of the source (with correct fallbacks for missing author/date). Applies to all three formats and both surfaces (extension and web converter).
- Strips: nav, ads, cookie banners, comments, related-posts widgets, share buttons, sticky headers.
- Graceful fallback: if extraction confidence is low (e.g., a web app, not an article), offer "Capture full page instead?"

**Technical notes**
- Manifest V3. Permissions: `activeTab`, `downloads`, `scripting` only — minimal permission footprint is a trust feature and a store-review advantage.
- Conversion runs client-side where feasible: Markdown via Turndown; DOCX via the `docx` JS library; PDF via a print-pipeline against a clean HTML template (or offloaded to the conversion API below for pixel-perfect output).

### 6.2 Web App — Paste-a-Link Converter (Phase 1, lives on the landing page)

**Flow B — Convert by URL**
1. User pastes a URL into the hero input on the landing page.
2. Selects format (PDF default) → clicks **Convert**.
3. Backend fetches and renders the page headlessly, extracts content, converts, and streams the file back. Target: **under 8 seconds** p90.
4. Success state shows the filename, size, and a Download button — plus a soft prompt: "Do this in one click next time → Get the extension."

**Backend requirements**
- Headless Chromium (Playwright) render → Readability extraction → HTML normalization → conversion:
  - **PDF:** headless Chrome print against the Offprint document template (custom typography, margins, page numbers, footer with source URL).
  - **DOCX:** normalized HTML → docx (Pandoc or `html-to-docx`).
  - **Markdown:** normalized HTML → Turndown, GitHub-flavored, fenced code blocks.
- Images fetched and embedded server-side with size caps (e.g., max 20 images / 15 MB per document).
- Rate limiting: e.g., 10 conversions/hour per IP on the free web tool (extension is unlimited since it runs client-side). Invisible CAPTCHA only on abuse signals.
- Rejects: login-gated pages (return a friendly "This page requires a login — use the extension while you're on the page instead," which doubles as an extension-install driver), non-HTML resources, files over size cap.
- Nothing is stored: fetched content and generated files are deleted after delivery. This is a headline privacy promise.

## 7. Landing Page — Phase 1 Deliverable (detailed spec)

### 7.1 Purpose
Two jobs only: (1) make the visitor *understand and want* Offprint within 5 seconds, (2) let them experience the magic immediately via paste-link conversion — the demo *is* the marketing.

### 7.2 Structure (single page, five sections, minimal copy)

**S1 — Hero (the product, live)**
- Headline: **"Any page. Your file."** Subline: "Turn any article into a clean PDF, DOCX, or Markdown file. Free. No signup."
- The centerpiece: a large URL input with a format segmented-control (PDF · DOCX · MD) and a Convert button. This is a *working product*, not a mockup.
- Primary CTA button beside/below: **Add to Chrome — Free** (Chrome Web Store link; disabled state with "Coming soon" until Phase 2 ships).

**S2 — The transformation (signature animation)**
- A scroll-driven sequence: a chaotic, recognizable webpage (ads, banners, popups rendered as abstract blocks) visually *sheds* its clutter piece by piece as the user scrolls, elements flying off-canvas, until only clean typography remains — which then folds, origami-like, into a crisp file icon stamped PDF/DOCX/MD (cycling). This single animation communicates the entire value proposition wordlessly.
- Copy overlay (three short beats, appearing in sync): "The web is noisy." → "Your files shouldn't be." → "Offprint keeps only what matters."

**S3 — Three formats, three audiences**
- Three cards (PDF / DOCX / Markdown), each with a hover micro-interaction: the card's document preview subtly "prints," "types," or "renders" respectively. One line of copy each: *"PDF — read anywhere, cite everything." "DOCX — drop it into your workflow." "Markdown — straight into your notes vault."*

**S4 — Trust strip**
- Three quiet points with icons: **Free forever (v1)** · **Nothing stored — files are deleted after download** · **Minimal permissions**. No testimonials, no logos, no fluff at launch.

**S5 — Footer CTA**
- Repeat the URL input (small) + "Add to Chrome" + micro-footer (Privacy, Contact, X/Twitter).

### 7.3 Design & Animation Concept

- **Design direction: "Editorial minimalism."** The landing page should look like the documents Offprint produces — because that *is* the product proof. Generous whitespace, a serif display face for headlines (e.g., *Instrument Serif* or *Fraunces*) paired with a clean grotesk for UI (e.g., *Inter* or *General Sans*), near-monochrome palette (paper white `#FAFAF7`, ink `#111110`) with a single confident accent (e.g., signal orange `#FF4D00`) used only for the Convert action and moments of delight.
- **Motion principles:** motion always tells the product story (clutter → clarity → file); scroll-driven for the S2 set-piece, spring-based micro-interactions elsewhere; 60fps, transform/opacity only; full `prefers-reduced-motion` fallback (static before/after frames).
- **Conversion moment:** when a user converts in the hero, the input morphs into a progress bar rendered as a page folding, then snaps into a download card — this 2-second animation is the emotional payoff and the thing people screen-record and share.

### 7.4 Landing Page Tech Stack
- **Next.js (App Router) + Tailwind CSS** — Server Components by default; the only client components are the hero converter and animation sections.
- **Motion (Framer Motion) + a scroll-timeline approach** (Motion's `useScroll` or GSAP ScrollTrigger — pick one, not both) for S2.
- Conversion API as Next.js route handlers backed by a Playwright worker (queue via a lightweight job runner; scale-to-zero friendly).
- Analytics: privacy-friendly (Plausible/Umami). Events: `hero_convert_attempt`, `hero_convert_success` (by format), `cta_extension_click`, scroll-depth on S2.
- Lighthouse targets: Performance ≥ 90 mobile, ≥ 95 desktop; LCP < 2.0s; CLS < 0.05.

### 7.5 Landing Page Acceptance Criteria
1. A visitor can paste a public article URL and download a correctly formatted PDF, DOCX, or MD file with no signup.
2. The S2 scroll animation runs at 60fps on a mid-range laptop and degrades gracefully on mobile and reduced-motion.
3. Total copy on the page is under ~120 words (excluding footer/legal).
4. Fully responsive 360px → 1920px; converter is usable one-handed on mobile.
5. Clear, honest states: converting, success, unsupported page, rate-limited, server error — each with human copy, never a raw error.

## 8. Success Metrics

| Metric | Target (90 days post-launch) |
|---|---|
| Hero conversion success rate (attempts → downloaded file) | ≥ 75% |
| Visitor → conversion attempt | ≥ 25% |
| Web converter → extension install click-through | ≥ 8% |
| p90 conversion time (web) | ≤ 8s |
| Extraction quality (manual audit, 100-page sample) | ≥ 90% rated "clean, no manual fixes needed" |
| Chrome Web Store rating (Phase 2) | ≥ 4.5 |

## 9. Phased Roadmap

- **Phase 1 (now):** Landing page + working paste-link converter (PDF/DOCX/MD). This is the full current scope.
- **Phase 2:** Chrome extension (capture current page), Web Store launch, landing page CTA goes live.
- **Phase 3:** Quality depth — better tables, math/LaTeX rendering, dark-mode PDF theme, keyboard shortcut, context-menu "Offprint this page."
- **Phase 4 (exploratory):** Batch/URL-list conversion, EPUB, team/API offering — the natural future monetization surface, without ever paywalling the core single-page conversion.

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Extraction fails on exotic layouts | Confidence scoring + "capture full page" fallback; maintain a regression suite of 100 diverse URLs |
| Anti-bot walls block server-side fetching | Position the extension as the answer ("works on anything *you* can see"); honest error copy on the web tool |
| Copyright misuse concerns | Files are for personal use of content the user can access; source URL stamped in every document footer; no paywall circumvention; clear ToS |
| Free = unbounded server cost | Client-side conversion in the extension (near-zero cost); rate limits + size caps on the web tool; scale-to-zero infra |
| PDF fidelity across formats is hard | One opinionated, beautiful document template rather than trying to mirror source styling — consistency is the brand |

## 11. Open Questions

1. Domain availability for offprint.app / getoffprint.com — verify before brand lock.
2. Should the web converter watermark a tiny "Made with Offprint" footer line in files (growth loop) or stay 100% clean? Recommendation: a single subtle footer line, removable via the extension.
3. Self-host the Playwright worker vs. a managed browser-rendering API for Phase 1 speed-to-launch.

---

*End of PRD v1.0 — Phase 1 build scope is Section 7 plus the Section 6.2 backend it depends on.*
