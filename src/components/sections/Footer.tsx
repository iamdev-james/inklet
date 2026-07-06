const NAV_LINKS = [
  ["How it works", "#how"],
  ["Formats", "#formats"],
  ["Proof", "#proof"],
  ["Voices", "#voices"],
  ["Convert", "#convert"],
] as const;

export function Footer() {
  return (
    <footer id="contact" className="px-3 pb-6 sm:px-4">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-line bg-panel px-6 pt-8 pb-8 sm:px-10">
        <p
          aria-hidden
          className="-mx-2 text-center text-[clamp(3.4rem,14.5vw,12.5rem)] leading-[0.95] font-semibold tracking-[-0.06em] whitespace-nowrap select-none"
        >
          offprint
        </p>

        <div className="mt-10 grid gap-10 border-t border-line pt-10 md:grid-cols-[1fr_auto]">
          <nav aria-label="Footer">
            <ul className="flex flex-col gap-3">
              {NAV_LINKS.map(([label, href]) => (
                <li key={href}>
                  <a href={href} className="text-[15px] text-ink-soft transition-colors hover:text-ink">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex max-w-md flex-col gap-8">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm text-ink-faint">For questions</p>
                <a href="mailto:hello@offprint.app" className="mt-1 block text-[15px] font-medium hover:text-accent-soft">
                  hello@offprint.app
                </a>
              </div>
              <div>
                <p className="text-sm text-ink-faint">For press</p>
                <a href="mailto:press@offprint.app" className="mt-1 block text-[15px] font-medium hover:text-accent-soft">
                  press@offprint.app
                </a>
              </div>
            </div>

            <form
              action="/"
              method="get"
              className="flex items-center rounded-full border border-line bg-void/60 p-1.5 transition-[border-color,box-shadow] duration-200 focus-within:border-line-strong focus-within:shadow-[0_0_0_4px_rgba(255,77,0,0.12)]"
            >
              <label htmlFor="footer-url" className="sr-only">
                Article URL
              </label>
              <input
                id="footer-url"
                name="url"
                type="url"
                inputMode="url"
                placeholder="Paste a link…"
                className="w-full min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:outline-none focus-visible:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 cursor-pointer rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-void transition-colors hover:bg-accent-soft"
              >
                Convert
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="text-xs text-ink-faint">
            © 2026 Offprint — nothing stored, files vanish after download.
          </p>
          <div className="flex gap-2.5">
            <a
              href="https://x.com/offprint"
              target="_blank"
              rel="noreferrer"
              aria-label="Offprint on X"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-sm text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              𝕏
            </a>
            <a
              href="mailto:hello@offprint.app"
              aria-label="Email Offprint"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-sm text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              ✉
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
