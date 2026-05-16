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
              "border px-1.5 py-0.5 transition-colors " +
              (active
                ? "border-[var(--amber)] bg-[rgba(255,165,0,0.1)] text-[var(--amber)]"
                : "border-[var(--border)] text-[var(--dim)] hover:border-[var(--amber-dim)] hover:text-[var(--amber)]")
            }
          >
            {r}
          </button>
        );
      })}
      {loading && (
        <span className="ml-1 text-[var(--amber-dim)]">·</span>
      )}
    </div>
  );
}
