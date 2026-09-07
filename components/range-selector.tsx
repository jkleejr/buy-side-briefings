"use client";

import { CHART_RANGES, type ChartRange } from "@/lib/chart-ranges";

type Props = {
  value: ChartRange;
  onChange: (r: ChartRange) => void;
  loading?: boolean;
  className?: string;
};

export default function RangeSelector({ value, onChange, loading, className }: Props) {
  return (
    <div
      className={`flex items-center gap-px font-mono text-[10px] uppercase tracking-widest ${className ?? ""}`}
    >
      {CHART_RANGES.map((r) => {
        const active = r === value;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            disabled={loading && active}
            className={
              // The active window is the one fact this row carries, so it is
              // stated at full contrast rather than as a tinted outline — the
              // the tinted outline read as "hovered", not "selected".
              "border px-1.5 py-0.5 transition-colors " +
              (active
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                : "border-[var(--border)] text-[var(--dim)] hover:border-[var(--lapis-dim)] hover:text-[var(--lapis)]")
            }
          >
            {r}
          </button>
        );
      })}
    </div>
  );
}
