"use client";

export type ChartType = "line" | "candle";

type Props = {
  value: ChartType;
  onChange: (t: ChartType) => void;
};

// Visual hint: "──" suggests a line; "▌" suggests a candlestick body.
const ICONS: Record<ChartType, string> = {
  line: "─",
  candle: "▌",
};

/**
 * Small line/candle toggle that lives next to the timeframe selector on
 * any chart that supports both views.
 */
export default function ChartTypeToggle({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-px font-mono text-[11px] uppercase tracking-widest">
      {(["line", "candle"] as ChartType[]).map((t) => {
        const active = t === value;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={
              "flex items-center gap-1 border px-2 py-1 transition-colors " +
              (active
                ? "border-[var(--amber)] bg-[rgba(255,165,0,0.1)] text-[var(--amber)]"
                : "border-[var(--border)] text-[var(--dim)] hover:border-[var(--amber-dim)] hover:text-[var(--amber)]")
            }
          >
            <span className="text-[12px] leading-none">{ICONS[t]}</span>
            <span>{t}</span>
          </button>
        );
      })}
    </div>
  );
}
