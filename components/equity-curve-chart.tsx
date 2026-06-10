"use client";

import dynamic from "next/dynamic";

const EquityCurveChart = dynamic(() => import("./equity-curve-chart-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] w-full items-center justify-center font-mono text-[11px] text-[var(--dim)] sm:h-[240px]">
      Loading chart…
    </div>
  ),
});

export default EquityCurveChart;
