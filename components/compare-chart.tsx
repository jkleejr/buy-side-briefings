"use client";

import dynamic from "next/dynamic";

export type { CompareChartProps, CompareSeries } from "./compare-chart-inner";

const CompareChart = dynamic(() => import("./compare-chart-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[220px] w-full items-center justify-center font-mono text-[11px] text-[var(--dim)] sm:h-[300px]">
      Loading chart…
    </div>
  ),
});

export default CompareChart;
