"use client";

import dynamic from "next/dynamic";

export type { CandleChartProps } from "./candle-chart-inner";

/**
 * lightweight-charts is browser-only (uses DOM/Canvas), so this wrapper
 * lazy-loads via next/dynamic with ssr:false. Same pattern as AssetChart.
 */
const CandleChart = dynamic(() => import("./candle-chart-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center font-mono text-[10px] text-[var(--dim)]" />
  ),
});

export default CandleChart;
