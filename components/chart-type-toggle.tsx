"use client";

export type ChartType = "line" | "candle";

type Props = {
  value: ChartType;
  onChange: (t: ChartType) => void;
};

/**
 * Small line/candle toggle that lives next to the timeframe selector on
 * any chart that supports both views.
 */
export default function ChartTypeToggle({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-px font-mono text-[10px] uppercase tracking-widest">
      {(["line", "candle"] as ChartType[]).map((t) => {
        const active = t === value;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={
              "border px-1.5 py-0.5 transition-colors " +
              (active
                ? "border-[var(--amber)] bg-[rgba(255,165,0,0.1)] text-[var(--amber)]"
                : "border-[var(--border)] text-[var(--dim)] hover:border-[var(--amber-dim)] hover:text-[var(--amber)]")
            }
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}
