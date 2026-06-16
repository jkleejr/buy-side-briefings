"use client";

import dynamic from "next/dynamic";

const PaperDeskChart = dynamic(() => import("./paper-desk-chart-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] w-full items-center justify-center font-mono text-[11px] text-[var(--dim)] sm:h-[220px]">
      Loading chart…
    </div>
  ),
});

export default PaperDeskChart;
