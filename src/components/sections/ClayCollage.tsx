"use client";
// Client component: the hero collage is an animation surface — clay props float on
// slow loops, drift a few pixels against pointer movement, and the whole scene
// zooms toward the camera as the hero sheet scrolls away.

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

function Float({
  children,
  className,
  duration = 7,
  delay = 0,
  reduced,
}: {
  children: React.ReactNode;
  className: string;
  duration?: number;
  delay?: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      className={`absolute ${className}`}
      animate={reduced ? undefined : { y: [0, -9, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

function MiniDocLines() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-1.5 w-16 rounded bg-ink/15" />
      <div className="h-1 w-20 rounded bg-ink/10" />
      <div className="h-1 w-14 rounded bg-ink/10" />
      <div className="mt-1 h-4 w-9 rounded-full bg-accent/70" />
      <div className="mt-1 h-1 w-18 rounded bg-ink/10" />
      <div className="h-1 w-12 rounded bg-ink/10" />
    </div>
  );
}

export function ClayCollage() {
  const reduced = useReducedMotion() ?? false;
  const stageRef = useRef<HTMLDivElement>(null);
  const driftX = useSpring(0, { stiffness: 40, damping: 20 });
  const driftY = useSpring(0, { stiffness: 40, damping: 20 });

  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ["start start", "end start"],
  });
  const zoom = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 1.3]);

  useEffect(() => {
    if (reduced) return;
    const onMove = (event: PointerEvent) => {
      driftX.set((event.clientX / window.innerWidth - 0.5) * 18);
      driftY.set((event.clientY / window.innerHeight - 0.5) * 12);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [driftX, driftY, reduced]);

  return (
    <div ref={stageRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div style={{ x: driftX, y: driftY, scale: zoom }} className="absolute -inset-6">
        <Float className="top-[14%] right-[6%] hidden lg:block" duration={8} reduced={reduced}>
          <div className="clay flex h-11 w-64 rotate-3 items-center gap-2 rounded-xl px-3">
            <span className="h-2 w-2 rounded-full bg-ink/15" />
            <span className="h-2 w-2 rounded-full bg-ink/15" />
            <span className="h-2 w-2 rounded-full bg-ink/15" />
            <span className="clay-inset ml-2 h-5 flex-1 rounded-full" />
          </div>
        </Float>

        <Float
          className="top-[38%] right-[3%] hidden md:block"
          duration={9}
          delay={1.2}
          reduced={reduced}
        >
          <div className="clay relative h-40 w-32 -rotate-6 rounded-3xl">
            <div className="absolute top-0 right-0 h-0 w-0 rounded-tr-3xl border-t-34 border-l-34 border-t-card-deep border-l-transparent" />
            <div className="absolute top-12 left-5">
              <MiniDocLines />
            </div>
          </div>
        </Float>

        <Float
          className="right-[16%] bottom-[12%] hidden md:block"
          duration={7.5}
          delay={0.6}
          reduced={reduced}
        >
          <div className="clay relative h-40 w-56 rotate-6 rounded-2xl">
            <div className="absolute inset-x-0 top-0 h-0 w-0 border-t-70 border-r-112 border-l-112 border-t-card-deep border-r-transparent border-l-transparent opacity-80" />
          </div>
        </Float>

        <Float
          className="right-[34%] bottom-[26%] hidden lg:block"
          duration={8.5}
          delay={2}
          reduced={reduced}
        >
          <div className="clay flex -rotate-6 items-center gap-2 rounded-full px-4 py-2.5">
            <span className="engraved text-sm">✦</span>
            <span className="engraved text-xs font-bold tracking-[0.18em] uppercase">
              Cite my source
            </span>
          </div>
        </Float>

        <Float
          className="bottom-[6%] left-[4%] hidden md:block"
          duration={9.5}
          delay={0.3}
          reduced={reduced}
        >
          <div className="clay relative h-104 w-60 rotate-12 rounded-[2.4rem] p-3">
            <div className="clay-inset h-full w-full rounded-[1.9rem] p-5">
              <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-ink/15" />
              <div className="mb-2 h-2 w-28 rounded bg-ink/20" />
              <div className="mb-4 h-1.5 w-20 rounded bg-ink/10" />
              <div className="mb-1.5 h-1 w-full rounded bg-ink/10" />
              <div className="mb-1.5 h-1 w-5/6 rounded bg-ink/10" />
              <div className="mb-4 h-1 w-4/6 rounded bg-ink/10" />
              <div className="mb-4 h-7 w-16 rounded-full bg-accent/70" />
              <div className="mb-1.5 h-1 w-full rounded bg-ink/10" />
              <div className="mb-1.5 h-1 w-3/4 rounded bg-ink/10" />
              <div className="engraved mt-6 text-[10px] font-bold tracking-[0.2em] uppercase">
                References
              </div>
              <div className="mt-2 h-1 w-5/6 rounded bg-ink/10" />
              <div className="mt-1.5 h-1 w-4/6 rounded bg-ink/10" />
            </div>
          </div>
        </Float>

        <Float
          className="top-[52%] left-[-3%] hidden lg:block"
          duration={10}
          delay={1.6}
          reduced={reduced}
        >
          <div className="clay relative h-72 w-72 rounded-full">
            <div className="absolute inset-8 rounded-full border border-line" />
            <div className="absolute inset-16 rounded-full border border-line" />
            <div className="absolute inset-24 rounded-full border border-line" />
            <span className="absolute top-10 left-24 h-1.5 w-1.5 rounded-full bg-accent/80" />
            <span className="absolute top-24 right-12 h-1.5 w-1.5 rounded-full bg-positive/80" />
            <span className="absolute bottom-16 left-16 h-1.5 w-1.5 rounded-full bg-[#8b7cf6]/80" />
            <span className="absolute right-24 bottom-24 h-1.5 w-1.5 rounded-full bg-[#f2c14e]/80" />
          </div>
        </Float>

        <Float
          className="right-[5%] bottom-[30%] hidden xl:block"
          duration={7}
          delay={2.4}
          reduced={reduced}
        >
          <div className="flex rotate-6 gap-2">
            <div className="clay flex h-14 w-14 items-center justify-center rounded-xl">
              <span className="engraved text-lg font-bold">⌘</span>
            </div>
            <div className="clay relative flex h-14 w-14 -rotate-6 items-center justify-center rounded-xl">
              <span className="engraved text-lg font-bold">P</span>
              <span className="absolute h-0.5 w-9 rotate-45 rounded bg-accent/60" />
            </div>
          </div>
        </Float>

        <Float
          className="top-[16%] left-[8%] hidden lg:block"
          duration={8}
          delay={0.9}
          reduced={reduced}
        >
          <div className="clay flex h-32 w-32 -rotate-6 items-center justify-center rounded-4xl">
            <span className="engraved text-6xl font-black">✳</span>
          </div>
        </Float>
      </motion.div>

      <div className="hero-vignette absolute inset-0" />
    </div>
  );
}
