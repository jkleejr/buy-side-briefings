"use client";

import dynamic from "next/dynamic";

const LevelsChart = dynamic(() => import("./levels-chart-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[220px] w-full items-center justify-center font-mono text-[11px] text-[var(--dim)] sm:h-[280px]">
      Loading chart…
    </div>
  ),
});

export default LevelsChart;
