"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

interface Quote {
  text: string;
  who: string;
  detail: string;
}

const QUOTES: Quote[] = [
  {
    text: "Clean PDFs with the citation already written — a reading list that finally cites itself.",
    who: "For researchers",
    detail: "Cite everything, read offline",
  },
  {
    text: "Tutorials drop straight into the vault as Markdown, code blocks intact.",
    who: "For developers",
    detail: "GFM with fenced code, ready for Obsidian",
  },
];

function Word({
  progress,
  range,
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  children: string;
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block">
      {children}&nbsp;
    </motion.span>
  );
}

function QuoteSlide({
  quote,
  progress,
  window,
}: {
  quote: Quote;
  progress: MotionValue<number>;
  window: [number, number, number, number];
}) {
  const [fadeInStart, revealStart, revealEnd, fadeOutEnd] = window;
  const words = quote.text.split(" ");
  const step = (revealEnd - revealStart) / words.length;
  const opacity = useTransform(
    progress,
    [fadeInStart, revealStart, fadeOutEnd - 0.04, fadeOutEnd],
    [0, 1, 1, 0],
  );
  const y = useTransform(progress, [fadeInStart, revealStart], [40, 0]);

  return (
    <motion.figure
      style={{ opacity, y }}
      className="absolute inset-0 flex flex-col items-center justify-center px-4"
    >
      <div className="relative w-full max-w-3xl">
        <span
          aria-hidden
          className="absolute -top-10 -left-2 font-brand text-8xl text-line-strong select-none sm:-left-10"
        >
          &ldquo;
        </span>
        <blockquote className="rounded-4xl border border-line bg-card/85 px-8 py-12 text-center text-2xl leading-snug font-medium tracking-[-0.01em] sm:px-14 sm:py-16 sm:text-4xl">
          {words.map((word, index) => (
            <Word
              key={index}
              progress={progress}
              range={[revealStart + index * step, revealStart + (index + 1) * step]}
            >
              {word}
            </Word>
          ))}
        </blockquote>
        <figcaption className="mt-8 text-center">
          <p className="font-semibold">{quote.who}</p>
          <p className="mt-1 text-sm text-ink-soft">{quote.detail}</p>
        </figcaption>
      </div>
    </motion.figure>
  );
}

function FloatingProps({ progress }: { progress: MotionValue<number> }) {
  const y1 = useTransform(progress, [0, 1], [60, -60]);
  const y2 = useTransform(progress, [0, 1], [-40, 50]);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
      <motion.div
        style={{ y: y1 }}
        className="clay absolute top-[18%] right-[10%] h-20 w-28 rotate-6 rounded-2xl p-3"
      >
        <span className="led font-mono text-xl font-bold">00:06</span>
      </motion.div>
      <motion.div
        style={{ y: y2 }}
        className="clay absolute bottom-[16%] left-[8%] h-24 w-32 -rotate-6 rounded-2xl"
      >
        <div className="absolute inset-x-0 top-0 h-0 w-0 border-t-44 border-r-64 border-l-64 border-t-card-deep border-r-transparent border-l-transparent opacity-80" />
      </motion.div>
    </div>
  );
}

export function Quotes() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  if (reduced) {
    return (
      <section id="voices" aria-label="Who Offprint is for" className="px-4 py-32">
        <div className="mx-auto flex max-w-3xl flex-col gap-12">
          {QUOTES.map((quote) => (
            <figure key={quote.who}>
              <blockquote className="rounded-4xl border border-line bg-card/85 px-8 py-12 text-center text-2xl leading-snug font-medium tracking-[-0.01em] sm:px-14 sm:py-16 sm:text-4xl">
                {quote.text}
              </blockquote>
              <figcaption className="mt-6 text-center">
                <p className="font-semibold">{quote.who}</p>
                <p className="mt-1 text-sm text-ink-soft">{quote.detail}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="voices" aria-label="Who Offprint is for" ref={ref} className="relative h-[320vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <FloatingProps progress={scrollYProgress} />
        <div className="relative h-full w-full">
          <QuoteSlide
            quote={QUOTES[0]}
            progress={scrollYProgress}
            window={[0.02, 0.1, 0.42, 0.5]}
          />
          <QuoteSlide quote={QUOTES[1]} progress={scrollYProgress} window={[0.5, 0.58, 0.88, 1]} />
        </div>
      </div>
    </section>
  );
}
