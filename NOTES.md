# Backlog — discovered during Phase 1, out of scope

- **Analytics**: PRD calls for Plausible/Umami events (`hero_convert_attempt`,
  `hero_convert_success{format}`, `hero_convert_error{code}`, `cta_extension_click`).
  Needs an account + production domain; wire up at deploy time.
- **Privacy page**: footer currently links Contact and X only. Add a short
  privacy note page before launch (the "nothing stored" promise deserves a URL).
- **WebP/AVIF images in DOCX**: the `docx` library only embeds png/jpeg/gif/bmp.
  WebP images render fine in PDF and Markdown but fall back to an
  "[Image omitted]" placeholder in DOCX. Converting webp→png server-side would
  need an image codec dependency (e.g. sharp) — decide at Phase 3 quality pass.
- **Lighthouse budget run**: perf/a11y audits (≥90 mobile / ≥95 desktop, LCP < 2s)
  should be run against a production build on the deploy target and attached to
  the launch sign-off.
- **Regression fixture suite → 25 URLs**: CLI (`pnpm convert <url> all`) covers
  the mechanics; grow the fixture list and script the sweep before launch.
- **Chrome extension** (PRD Phase 2): the landing page CTA ships disabled
  ("Coming soon") until the extension exists.
