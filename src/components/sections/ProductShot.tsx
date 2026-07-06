"use client";
// Client component: animation section — the product frame rises with scroll
// parallax while proof chips float over it.

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Stars } from "./Stars";

export function ProductShot() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [110, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], reduced ? [1, 1] : [0.94, 1]);

  return (
    <section
      id="proof"
      aria-label="The file Offprint produces"
      className="relative overflow-hidden px-4 py-32 sm:py-40"
    >
      <Stars />
      <div ref={ref} className="relative mx-auto max-w-4xl">
        <motion.h2
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center text-4xl font-medium tracking-[-0.02em] text-balance sm:text-5xl"
        >
          Files that look
          <br />
          designed on purpose
        </motion.h2>

        <motion.div style={{ y, scale }} className="relative mt-16">
          <div className="rounded-3xl border border-line bg-panel p-3 shadow-[0_40px_120px_rgba(0,0,0,0.65)]">
            <div className="mb-3 flex items-center gap-2 px-2 pt-1">
              <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
              <span className="clay-inset mx-auto flex h-7 w-64 max-w-[50%] items-center justify-center rounded-full text-[11px] text-ink-faint">
                offprint.app/convert
              </span>
              <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-black tracking-widest text-void uppercase">
                PDF
              </span>
            </div>
            <div className="relative max-h-136 overflow-hidden rounded-xl bg-white">
              <Image
                src="/product-page.png"
                alt="A page converted by Offprint: serif typography, orange site eyebrow, ruled metadata header, and a shaded code block"
                width={596}
                height={843}
                className="w-full"
                sizes="(min-width: 1024px) 56rem, 100vw"
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-void/70 to-transparent" />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="clay absolute top-24 -left-4 flex items-center gap-2 rounded-full px-4 py-2.5 sm:-left-10"
          >
            <span className="text-positive">✓</span>
            <span className="text-xs font-bold tracking-wide">Clutter removed</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="clay absolute -right-4 bottom-28 flex items-center gap-2 rounded-full px-4 py-2.5 sm:-right-10"
          >
            <span className="text-accent">✦</span>
            <span className="text-xs font-bold tracking-wide">APA citation appended</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
