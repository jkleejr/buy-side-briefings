"use client";

import { useChartType } from "./chart-type-provider";

/**
 * Single-button candle toggle that lives in the top header. Click to switch
 * every chart on the site between line and candlestick view.
 *
 * The icon ▌▍ approximates a pair of candlestick bodies. Active state is
 * amber-highlighted (matches the Learn toggle's "on" treatment). Tooltip
 * spells out what it does for first-time visitors.
 */
export default function ChartTypeHeaderToggle() {
  const { chartType, toggle } = useChartType();
  const isCandle = chartType === "candle";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isCandle}
      title={
        isCandle
          ? "Candle view ON — click to switch back to line view (applies to the main charts; small sparkline panels stay as lines because candles are unreadable at that size)"
          : "Candle view OFF — click to switch the main charts to candlestick view (small sparklines stay as lines either way)"
      }
      className={
        "flex items-center gap-1 border px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors " +
        (isCandle
          ? "border-[var(--amber)] bg-[rgba(255,165,0,0.1)] text-[var(--amber)]"
          : "border-[var(--border)] text-[var(--dim)] hover:border-[var(--amber-dim)] hover:text-[var(--amber)]")
      }
    >
      <span className="font-mono text-[14px] leading-none">▌</span>
      <span>Candle {isCandle ? "ON" : "OFF"}</span>
    </button>
  );
}
