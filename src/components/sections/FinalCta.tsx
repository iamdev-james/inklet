"use client";
// Client component: animation section — the closing collage staggers in as it
// scrolls into view.

import { motion, useReducedMotion } from "motion/react";
import { CHROME_WEB_STORE_URL } from "@/lib/links";

function Collage() {
  const reduced = useReducedMotion() ?? false;
  return (
    <div className="relative mx-auto h-96 w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="clay absolute top-0 left-0 w-52 rounded-2xl p-5"
      >
        <p className="mb-3 text-[11px] font-bold tracking-widest text-ink-faint uppercase">
          Typical conversion
        </p>
        <div className="flex h-28 items-end gap-3">
          <div className="relative flex-1 rounded-t-lg bg-accent" style={{ height: "42%" }}>
            <span className="clay absolute -top-8 left-1/2 -translate-x-1/2 rounded-md px-2 py-0.5 text-[10px] font-bold whitespace-nowrap">
              ~6s
            </span>
          </div>
          <div className="clay-inset flex-1 rounded-t-lg" style={{ height: "78%" }} />
          <div className="clay-inset flex-1 rounded-t-lg" style={{ height: "95%" }} />
        </div>
        <div className="mt-2 flex gap-3 text-[9px] text-ink-faint">
          <span className="flex-1 text-center">Offprint</span>
          <span className="flex-1 text-center">Copy-paste</span>
          <span className="flex-1 text-center">Cleanup</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.55, delay: 0.15, ease: "easeOut" }}
        className="clay absolute top-40 left-10 flex items-center gap-2.5 rounded-2xl px-4 py-3"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-positive text-void">
          ✓
        </span>
        <span className="text-sm font-bold">File ready!</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.55, delay: 0.3, ease: "easeOut" }}
        animate={reduced ? undefined : { y: [0, -6, 0] }}
        className="clay absolute right-0 bottom-6 w-64 rounded-2xl p-5"
      >
        <div className="flex items-center gap-3">
          <div className="clay-inset relative h-14 w-11 shrink-0 rounded-lg">
            <span className="absolute right-1 bottom-1 left-1 rounded bg-accent px-1 py-0.5 text-center text-[8px] font-black tracking-widest text-void uppercase">
              PDF
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-xs font-bold">goodbye-clean-code.pdf</p>
            <p className="text-[11px] text-ink-soft">165 KB · cited &amp; clutter-free</p>
          </div>
        </div>
        <div className="clay-inset mt-4 flex items-center justify-between rounded-full px-4 py-2">
          <span className="text-[11px] font-semibold text-ink-soft">Sales pipeline? No — reading pile</span>
          <span className="flex gap-1">
            <span className="h-1.5 w-4 rounded-full bg-positive" />
            <span className="h-1.5 w-4 rounded-full bg-positive" />
            <span className="h-1.5 w-4 rounded-full bg-positive/30" />
          </span>
        </div>
      </motion.div>
    </div>
  );
}

export function FinalCta() {
  return (
    <section aria-label="Start converting" className="px-4 py-32 sm:py-40">
      <div className="mx-auto grid max-w-5xl items-center gap-16 md:grid-cols-2">
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-5xl font-medium tracking-[-0.02em] text-balance sm:text-6xl"
          >
            Own what
            <br />
            you read, today
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <a
              href="#convert"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-void transition-colors duration-150 hover:bg-accent-soft"
            >
              Convert a page <span aria-hidden>↑</span>
            </a>
            <a
              href={CHROME_WEB_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line-strong px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent-soft"
            >
              Add to Chrome — Free
            </a>
          </motion.div>
        </div>
        <Collage />
      </div>
    </section>
  );
}
