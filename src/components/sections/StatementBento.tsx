"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

function TickingClock() {
  const [seconds, setSeconds] = useState(1);
  useEffect(() => {
    const ticker = setInterval(() => setSeconds((s) => (s % 8) + 1), 1000);
    return () => clearInterval(ticker);
  }, []);
  return (
    <div className="clay-inset rounded-2xl border border-line-strong px-8 py-5">
      <span className="led font-mono text-5xl font-bold">00:0{seconds}</span>
    </div>
  );
}

function RadarDots() {
  const reduced = useReducedMotion() ?? false;
  const dots: Array<[string, string, string, number]> = [
    ["18%", "34%", "var(--color-accent)", 0],
    ["62%", "22%", "var(--color-positive)", 0.8],
    ["78%", "48%", "#8b7cf6", 1.6],
    ["38%", "58%", "#f2c14e", 2.4],
    ["55%", "40%", "#4cc9f0", 3.2],
  ];
  return (
    <div className="relative h-36 w-full overflow-hidden">
      <div className="absolute top-0 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full border border-line" />
      <div className="absolute top-6 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full border border-line" />
      <div className="absolute top-12 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full border border-line" />
      {dots.map(([left, top, color, delay], index) => (
        <motion.span
          key={index}
          className="absolute h-2 w-2 rounded-full"
          style={{ left, top, background: color }}
          animate={reduced ? undefined : { opacity: [0.35, 1, 0.35], scale: [1, 1.35, 1] }}
          transition={{ duration: 3, delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function TemplateCarousel() {
  const reduced = useReducedMotion() ?? false;
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="clay-inset h-16 w-12 shrink-0 rounded-lg opacity-50" />
      <div className="clay relative h-24 w-20 shrink-0 rounded-xl p-2.5">
        <div className="mb-1.5 flex gap-1">
          <span className="h-1 w-1 rounded-full bg-accent/80" />
          <span className="h-1 w-1 rounded-full bg-positive/80" />
          <span className="h-1 w-1 rounded-full bg-[#f2c14e]/80" />
        </div>
        <motion.div
          className="mb-1 h-4 w-6 rounded bg-accent"
          animate={reduced ? undefined : { opacity: [1, 0.25, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="h-4 w-10 rounded bg-positive"
          animate={reduced ? undefined : { opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="clay-inset h-16 w-12 shrink-0 rounded-lg opacity-50" />
    </div>
  );
}

function BentoCard({
  children,
  label,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  label?: string;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
      className={`flex flex-col items-center justify-center gap-5 rounded-3xl border border-line bg-card px-6 py-8 ${className}`}
    >
      {children}
      {label && <p className="text-center text-[15px] font-semibold text-balance">{label}</p>}
    </motion.div>
  );
}

export function StatementBento() {
  return (
    <section id="formats" aria-label="What Offprint does" className="relative px-4 py-32 sm:py-40">
      <div className="mx-auto max-w-5xl">
        <motion.p
          initial={{ opacity: 0, y: 44, filter: "blur(14px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-25%" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-3xl leading-snug font-medium tracking-[-0.01em] sm:text-4xl"
        >
          You&rsquo;ve saved pages before — and know the mess. Now it&rsquo;s time to{" "}
          <span className="text-accent">convert them cleanly</span> and{" "}
          <span className="text-positive">own what you read</span>.
        </motion.p>

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-4">
            <BentoCard label="An APA 7 citation in every file">
              <RadarDots />
            </BentoCard>
            <BentoCard label="Further reading, harvested for you" delay={0.1}>
              <div className="clay relative mt-2 h-28 w-40 rounded-2xl">
                <div className="absolute inset-x-0 top-0 h-0 w-0 border-t-52 border-r-80 border-l-80 border-t-card-deep border-r-transparent border-l-transparent opacity-80" />
                <div className="clay absolute -right-6 bottom-3 flex items-center gap-1.5 rounded-full px-3 py-1.5">
                  <span className="text-[10px] text-accent">✦</span>
                  <span className="text-[10px] font-bold tracking-wider text-ink-soft uppercase">
                    References attached
                  </span>
                </div>
              </div>
            </BentoCard>
          </div>

          <div className="flex flex-col gap-4">
            <BentoCard delay={0.05} className="py-12">
              <TickingClock />
            </BentoCard>
            <motion.div
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.55, delay: 0.15, ease: "easeOut" }}
              className="px-4 py-6"
            >
              <h3 className="text-xl font-semibold">Seconds, not sessions</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                Paste a link and a designed, cited file lands in your downloads — no cleanup, no
                copy-paste surgery.
              </p>
            </motion.div>
          </div>

          <div className="flex flex-col gap-4">
            <BentoCard label="One template, tuned for reading" delay={0.1}>
              <TemplateCarousel />
            </BentoCard>
            <BentoCard label="Three formats, three homes" delay={0.2}>
              <div className="flex w-full max-w-52 flex-col gap-2">
                {[
                  ["PDF", "read anywhere", "bg-accent"],
                  ["DOCX", "edit anywhere", "bg-[#4cc9f0]"],
                  ["MD", "straight to your vault", "bg-positive"],
                ].map(([format, home, color]) => (
                  <div
                    key={format}
                    className="clay-inset flex items-center gap-3 rounded-xl px-4 py-2.5"
                  >
                    <span className={`h-2.5 w-2.5 rounded ${color}`} />
                    <span className="text-xs font-bold tracking-wider">{format}</span>
                    <span className="ml-auto text-[11px] text-ink-faint">{home}</span>
                  </div>
                ))}
              </div>
            </BentoCard>
          </div>
        </div>
      </div>
    </section>
  );
}
