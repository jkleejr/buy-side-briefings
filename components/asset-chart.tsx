"use client";

import dynamic from "next/dynamic";

export type { AssetChartProps } from "./asset-chart-inner";

const AssetChart = dynamic(() => import("./asset-chart-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[110px] w-full items-center justify-center font-mono text-[10px] text-[var(--dim)] sm:h-[150px]">
      …
    </div>
  ),
});

export default AssetChart;
