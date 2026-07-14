"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Stars } from "./Stars";

type CardId = "chaos" | "offprint";
type Verdict = "keep" | "toss";

const RESPAWN_DELAY_MS = 1_000;

function Face({ happy }: { happy: boolean }) {
  const stroke = happy ? "var(--color-positive)" : "var(--color-accent)";
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="17" stroke={stroke} strokeWidth="2.5" />
      <circle cx="18" cy="20" r="1.8" fill={stroke} />
      <circle cx="30" cy="20" r="1.8" fill={stroke} />
      {happy ? (
        <path d="M17 28c2 3.4 4.4 5 7 5s5-1.6 7-5" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <path d="M17 32c2-3.4 4.4-5 7-5s5 1.6 7 5" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

function cardVariants(reduced: boolean): Variants {
  if (reduced) {
    return {
      enter: { opacity: 0 },
      center: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }
  return {
    enter: { opacity: 0, y: 90, scale: 0.92, rotate: 0 },
    center: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotate: 0,
      transition: { type: "spring", bounce: 0.38, duration: 0.75 },
    },
    exit: (verdict: Verdict) => ({
      x: verdict === "keep" ? 230 : -230,
      y: -250,
      rotate: verdict === "keep" ? 16 : -16,
      opacity: 0,
      transition: { duration: 0.55, ease: [0.32, 0, 0.67, 0] },
    }),
  };
}

function AnswerCard({
  id,
  label,
  happy,
  verdict,
  onFling,
  reduced,
}: {
  id: CardId;
  label: string;
  happy: boolean;
  verdict: Verdict | null;
  onFling: (id: CardId, verdict: Verdict) => void;
  reduced: boolean;
}) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl border-2 border-dashed border-line-strong"
      />
      <AnimatePresence initial={false} custom={verdict ?? "keep"}>
        {verdict === null && (
          <motion.div
            key={id}
            variants={cardVariants(reduced)}
            initial="enter"
            animate="center"
            exit="exit"
            custom={verdict ?? "keep"}
            whileHover={reduced ? undefined : { y: -6, rotate: happy ? 1.2 : -1.2 }}
            className="relative flex flex-col items-center gap-5 rounded-2xl border border-line bg-card px-8 py-10"
          >
            <div className="clay-inset flex h-24 w-24 items-center justify-center rounded-3xl">
              <Face happy={happy} />
            </div>
            <p className="text-center text-[15px] font-semibold">{label}</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={`No — not ${label}`}
                onClick={() => onFling(id, "toss")}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-accent hover:text-accent"
              >
                ✕
              </button>
              <button
                type="button"
                aria-label={`Yes — ${label}`}
                onClick={() => onFling(id, "keep")}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-positive hover:text-positive"
              >
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor" aria-hidden>
                  <path d="M12 21s-7.5-4.7-10-9.3C.6 8.6 2.6 5 6.1 5c2 0 3.6 1.1 4.4 2.7h3c.8-1.6 2.4-2.7 4.4-2.7 3.5 0 5.5 3.6 4.1 6.7C19.5 16.3 12 21 12 21z" transform="scale(0.92) translate(1,1)" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Quiz() {
  const reduced = useReducedMotion() ?? false;
  const [verdicts, setVerdicts] = useState<Record<CardId, Verdict | null>>({
    chaos: null,
    offprint: null,
  });
  const [answered, setAnswered] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const fling = (id: CardId, verdict: Verdict) => {
    setVerdicts((current) => ({ ...current, [id]: verdict }));
    setAnswered(true);
    timers.current.push(
      setTimeout(() => {
        setVerdicts((current) => ({ ...current, [id]: null }));
      }, RESPAWN_DELAY_MS),
    );
  };

  return (
    <section id="how" aria-label="How do you save pages" className="relative px-4 py-32 sm:py-40">
      <Stars />
      <div className="relative mx-auto max-w-3xl">
        <motion.h2
          initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center text-4xl font-medium tracking-[-0.02em] text-balance sm:text-5xl"
        >
          How do you keep
          <br />
          what you read?
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 56, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14 grid gap-3 rounded-3xl border border-line bg-panel/60 p-3 sm:grid-cols-2"
        >
          <AnswerCard
            id="chaos"
            label="Print to PDF and pray"
            happy={false}
            verdict={verdicts.chaos}
            onFling={fling}
            reduced={reduced}
          />
          <AnswerCard
            id="offprint"
            label="Offprint it — clean and cited"
            happy
            verdict={verdicts.offprint}
            onFling={fling}
            reduced={reduced}
          />
        </motion.div>

        <div className="mt-8 h-6 text-center" aria-live="polite">
          <AnimatePresence>
            {answered && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : 0.45 }}
                className="text-sm text-ink-soft"
              >
                Either way — the rest of this page is for you.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
