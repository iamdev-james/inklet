import { Suspense } from "react";
import { HeroConverter } from "@/components/hero/HeroConverter";
import { ClayCollage } from "@/components/sections/ClayCollage";
import { FinalCta } from "@/components/sections/FinalCta";
import { Footer } from "@/components/sections/Footer";
import { ProductShot } from "@/components/sections/ProductShot";
import { Quiz } from "@/components/sections/Quiz";
import { Quotes } from "@/components/sections/Quotes";
import { StatementBento } from "@/components/sections/StatementBento";
import { CHROME_WEB_STORE_URL } from "@/lib/links";

const NAV_LINKS = [
  ["How it works", "#how"],
  ["Formats", "#formats"],
  ["Proof", "#proof"],
  ["Contact", "#contact"],
] as const;

export default function Home() {
  return (
    <>
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <p className="font-brand text-xl font-bold tracking-tight italic">
            Offprint<span className="text-accent">*</span>
          </p>
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-1 rounded-full border border-line bg-panel/70 px-2 py-1.5 backdrop-blur-sm">
              {NAV_LINKS.map(([label, href]) => (
                <li key={href}>
                  <a
                    href={href}
                    className="rounded-full px-4 py-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:text-ink"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <a
            href={CHROME_WEB_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-line-strong px-4 py-2 text-xs font-semibold tracking-wide text-ink transition-colors hover:border-accent hover:text-accent-soft"
          >
            Add to Chrome — Free
          </a>
        </div>
      </header>

      <main>
        <section
          aria-label="Convert a page"
          className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden rounded-b-[3rem] bg-linear-to-b from-[#111220] to-[#0b0c14] px-4 pt-28 pb-20 sm:px-6"
        >
          <ClayCollage />

          <div className="relative flex flex-col items-center">
            <p className="mb-7 flex items-center gap-4 text-xs font-medium tracking-[0.08em] text-ink-soft">
              <span aria-hidden className="h-px w-10 bg-line-strong" />
              Free · No signup · Nothing stored
              <span aria-hidden className="h-px w-10 bg-line-strong" />
            </p>
            <h1 className="text-center text-[clamp(2.9rem,8vw,5.75rem)] leading-[1.04] font-medium tracking-[-0.035em] text-balance">
              Any page.
              <br />
              Your file.
            </h1>
            <p className="mt-6 mb-12 max-w-md text-center text-base text-ink-soft sm:text-lg">
              Turn any article into a clean PDF, DOCX, or Markdown file — cited, clutter-free,
              yours.
            </p>

            <Suspense
              fallback={
                <div className="h-16 w-full max-w-2xl rounded-full border border-line bg-panel/80" />
              }
            >
              <HeroConverter />
            </Suspense>
          </div>

          <p
            aria-hidden
            className="absolute bottom-6 animate-bounce font-mono text-xs tracking-widest text-ink-faint"
          >
            ↓
          </p>
        </section>

        <Quiz />
        <StatementBento />
        <ProductShot />
        <Quotes />
        <FinalCta />
      </main>

      <Footer />
    </>
  );
}
