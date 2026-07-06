import { motion } from "motion/react";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  name,
  label,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  name: string;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="relative inline-flex shrink-0 rounded-full border border-line bg-void/60 p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`relative cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.14em] transition-colors duration-200 ${
            value === option.value ? "text-ink" : "text-ink-faint hover:text-ink-soft"
          }`}
        >
          {value === option.value && (
            <motion.span
              layoutId={`segment-thumb-${name}`}
              className="absolute inset-0 rounded-full border border-line-strong bg-card-deep"
              transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
            />
          )}
          <span className="relative">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
