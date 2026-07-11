"use client";
// Client component: the hero converter is the interactive product surface — it owns
// form state, posts to /api/convert, triggers the blob download, and animates the
// conversion moment. Everything around it stays server-rendered.

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ERROR_COPY, isConversionErrorCode, type ConversionErrorCode } from "@/lib/errors";
import type { OutputFormat } from "@/lib/types";
import { convertRequestSchema, parseHttpUrl } from "@/lib/validation";

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "DOCX" },
  { value: "md", label: "MD" },
];

const CLIENT_TIMEOUT_MS = 60_000;

const STAGE_LABELS = ["Fetching the page", "Shedding the clutter", "Typesetting your file"];

type Phase =
  | { name: "idle" }
  | { name: "validating" }
  | { name: "converting" }
  | { name: "success"; filename: string; size: number; blobUrl: string }
  | { name: "error"; code: ConversionErrorCode };

function isOutputFormat(value: string | null): value is OutputFormat {
  return value === "pdf" || value === "docx" || value === "md";
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = /filename="([^"]+)"/.exec(header);
  return match?.[1] ?? fallback;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FoldingSheet({ reduced }: { reduced: boolean }) {
  return (
    <div className="shrink-0" style={{ perspective: 220 }}>
      <motion.div
        className="clay relative h-9 w-7 rounded-md"
        animate={reduced ? undefined : { rotateY: [0, 180, 360] }}
        transition={{ duration: 1.7, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="absolute top-0 right-0 h-0 w-0 rounded-tr-md border-t-10 border-l-10 border-t-card-deep border-l-transparent" />
        <div className="absolute top-3 left-1.5 h-0.5 w-3 rounded bg-ink/25" />
        <div className="absolute top-4.5 left-1.5 h-0.5 w-4 rounded bg-ink/20" />
        <div className="absolute bottom-1.5 left-1.5 h-1 w-2.5 rounded-xs bg-accent/80" />
      </motion.div>
    </div>
  );
}

function ThinkingDots({ reduced }: { reduced: boolean }) {
  return (
    <span className="ml-1 inline-flex gap-0.5" aria-hidden>
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="h-1 w-1 rounded-full bg-ink-soft"
          animate={reduced ? undefined : { opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, delay: index * 0.2, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

function FoldProgress({ progress, reduced }: { progress: number; reduced: boolean }) {
  const stage = STAGE_LABELS[progress < 34 ? 0 : progress < 72 ? 1 : 2];
  return (
    <div
      className="flex w-full flex-col gap-4 px-2 pt-1 pb-2 sm:px-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-4">
        <FoldingSheet reduced={reduced} />
        <p className="flex items-baseline text-[15px] font-medium text-ink">
          {stage}
          <ThinkingDots reduced={reduced} />
        </p>
        <span className="ml-auto font-mono text-sm font-bold text-ink-soft tabular-nums">
          {Math.min(99, Math.round(progress))}%
        </span>
      </div>
      <div className="clay-inset relative h-2 overflow-hidden rounded-full">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-accent-deep via-accent to-accent-soft shadow-[0_0_14px_rgba(255,77,0,0.55)]"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={reduced ? { duration: 0.2 } : { type: "spring", stiffness: 60, damping: 20 }}
        >
          {!reduced && (
            <motion.span
              className="absolute inset-y-0 right-0 w-10 rounded-full bg-linear-to-l from-white/40 to-transparent"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </motion.div>
      </div>
      <p className="text-center text-xs text-ink-faint">
        Most pages take a few seconds — slow sites can need up to a minute.
      </p>
    </div>
  );
}

function FileBadge({ extension }: { extension: string }) {
  return (
    <div className="clay relative h-16 w-13 shrink-0 rounded-lg">
      <div className="absolute top-0 right-0 h-0 w-0 rounded-tr-lg border-t-14 border-l-14 border-t-card-deep border-l-transparent" />
      <div className="absolute top-3 left-2 h-0.5 w-6 rounded bg-ink/20" />
      <div className="absolute top-5 left-2 h-0.5 w-7 rounded bg-ink/20" />
      <div className="absolute right-1.5 bottom-1.5 left-1.5 rounded bg-accent px-1 py-0.5 text-center text-[10px] font-black tracking-widest text-void uppercase">
        {extension}
      </div>
    </div>
  );
}

export function HeroConverter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduced = useReducedMotion() ?? false;

  const initialFormat = searchParams.get("format");
  const [format, setFormat] = useState<OutputFormat>(
    isOutputFormat(initialFormat) ? initialFormat : "pdf",
  );
  const [url, setUrl] = useState(() => searchParams.get("url") ?? "");
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [progress, setProgress] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchParams.get("url")) inputRef.current?.focus();
  }, [searchParams]);

  useEffect(() => {
    if (phase.name !== "converting") return;
    const ticker = setInterval(() => {
      setProgress((current) => Math.min(92, current + (94 - current) * 0.055));
    }, 180);
    return () => clearInterval(ticker);
  }, [phase.name]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const selectFormat = useCallback(
    (next: OutputFormat) => {
      setFormat(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set("format", next);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const reset = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPhase({ name: "idle" });
    setProgress(0);
  }, []);

  const triggerDownload = useCallback((blobUrl: string, filename: string) => {
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = filename;
    anchor.click();
  }, []);

  const convert = useCallback(async () => {
    if (phase.name === "converting" || phase.name === "validating") return;

    setPhase({ name: "validating" });
    const candidate = { url: url.trim(), format };
    if (!convertRequestSchema.safeParse(candidate).success || !parseHttpUrl(candidate.url)) {
      setPhase({ name: "error", code: "INVALID_URL" });
      return;
    }

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setProgress(4);
    setPhase({ name: "converting" });

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(candidate),
        signal: controller.signal,
      });

      if (!response.ok) {
        let code: ConversionErrorCode = "INTERNAL";
        try {
          const payload = (await response.json()) as { error?: { code?: string } };
          if (payload.error?.code && isConversionErrorCode(payload.error.code)) {
            code = payload.error.code;
          }
        } catch {
          code = "INTERNAL";
        }
        setPhase({ name: "error", code });
        return;
      }

      const blob = await response.blob();
      const filename = filenameFromDisposition(
        response.headers.get("content-disposition"),
        `offprint.${format}`,
      );
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl;

      setProgress(100);
      triggerDownload(blobUrl, filename);
      setTimeout(
        () => setPhase({ name: "success", filename, size: blob.size, blobUrl }),
        reduced ? 0 : 350,
      );
    } catch (err) {
      setPhase({
        name: "error",
        code: err instanceof DOMException && err.name === "AbortError" ? "TIMEOUT" : "INTERNAL",
      });
    } finally {
      clearTimeout(timeout);
      abortRef.current = null;
    }
  }, [format, phase.name, reduced, triggerDownload, url]);

  const busy = phase.name === "converting" || phase.name === "validating";

  return (
    <MotionConfig reducedMotion="user">
      <div id="convert" className="w-full max-w-2xl scroll-mt-28">
        <motion.div
          layout={!reduced}
          className={`border border-line bg-panel/80 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-[border-color,box-shadow] duration-200 focus-within:border-line-strong focus-within:shadow-[0_24px_80px_rgba(0,0,0,0.6),0_0_0_4px_rgba(255,77,0,0.12)] ${
            phase.name === "success" || phase.name === "converting"
              ? "rounded-3xl p-5"
              : "rounded-3xl p-2 sm:rounded-full"
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {phase.name === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: reduced ? 1 : 0.92, y: reduced ? 0 : 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: reduced ? 1 : 0.97 }}
                transition={{ type: "spring", bounce: 0.38, duration: 0.55 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center gap-4">
                  <FileBadge extension={phase.filename.split(".").pop() ?? format} />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-bold" title={phase.filename}>
                      {phase.filename}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {humanSize(phase.size)} ·{" "}
                      <span className="text-positive">saved to your downloads</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => triggerDownload(phase.blobUrl, phase.filename)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-card px-5 py-2.5 text-sm font-semibold transition-colors duration-150 hover:bg-card-deep"
                  >
                    Download again
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="cursor-pointer rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                  >
                    Convert another
                  </button>
                </div>
                <p className="border-t border-line pt-3 text-xs text-ink-faint">
                  One click next time —{" "}
                  <span className="font-semibold text-ink-soft">Chrome extension coming soon.</span>
                </p>
              </motion.div>
            ) : phase.name === "converting" ? (
              <motion.div
                key="converting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <FoldProgress progress={progress} reduced={reduced} />
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onSubmit={(event) => {
                  event.preventDefault();
                  void convert();
                }}
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <label htmlFor="hero-url" className="sr-only">
                  Article URL
                </label>
                <input
                  ref={inputRef}
                  id="hero-url"
                  name="url"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Paste any article link…"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    if (phase.name === "error") setPhase({ name: "idle" });
                  }}
                  className="w-full min-w-0 flex-1 rounded-full bg-transparent px-5 py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-faint focus:outline-none focus-visible:outline-none"
                />
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <SegmentedControl
                    name="hero"
                    label="Output format"
                    options={FORMAT_OPTIONS}
                    value={format}
                    onChange={selectFormat}
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-void transition-all duration-150 hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Convert
                    <span aria-hidden>→</span>
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {phase.name === "error" && (
            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="mt-3 rounded-2xl border border-accent/30 bg-card px-5 py-4"
            >
              <p className="text-[15px] font-semibold text-accent-soft">
                {ERROR_COPY[phase.code].title}
              </p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">
                {ERROR_COPY[phase.code].body}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
