"use client";

import dynamic from "next/dynamic";

export type { VerdictMarker } from "./verdict-marker-chart-inner";

const VerdictMarkerChart = dynamic(() => import("./verdict-marker-chart-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[260px] w-full items-center justify-center font-mono text-[11px] text-[var(--dim)]">
      Loading chart…
    </div>
  ),
});

export default VerdictMarkerChart;
