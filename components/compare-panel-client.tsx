"use client";

import { useEffect, useRef, useState } from "react";
import {
  INTRADAY_RANGES,
  type ChartRange,
  type ChartPoint,
} from "@/lib/chart-ranges";
import RangeSelector from "./range-selector";
import CompareChart, { type CompareSeries } from "./compare-chart";

type AssetSpec = { symbol: string; label: string; color: string };

type Props = {
  assets: AssetSpec[];
  initialRange: ChartRange;
  initialSeriesBySymbol: Record<string, ChartPoint[]>;
  /** If true, plot the ratio (assets[0]/assets[1]) instead of both lines. */
  asRatio?: boolean;
};

export default function ComparePanelClient({
  assets,
  initialRange,
  initialSeriesBySymbol,
  asRatio,
}: Props) {
  const [range, setRange] = useState<ChartRange>(initialRange);
  const [seriesMap, setSeriesMap] = useState(initialSeriesBySymbol);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    Promise.all(
      assets.map((a) =>
        fetch(`/api/chart?symbol=${encodeURIComponent(a.symbol)}&range=${range}`)
          .then((r) => r.json())
          .then((j) => [a.symbol, Array.isArray(j.data) ? j.data : []] as const),
      ),
    )
      .then((pairs) => {
        if (id !== reqId.current) return;
        setSeriesMap(Object.fromEntries(pairs));
      })
      .catch((err) => console.error("[compare] fetch failed:", err))
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [range, assets]);

  const compareSeries: CompareSeries[] = assets.map((a) => ({
    label: a.label,
    color: a.color,
    data: seriesMap[a.symbol] ?? [],
  }));

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
          {asRatio ? "Ratio" : "Normalized to 100"}
        </span>
        <span className="font-mono text-[10px] text-[var(--dim)]">·</span>
        <RangeSelector value={range} onChange={setRange} loading={loading} />
      </div>
      <CompareChart
        series={compareSeries}
        intraday={INTRADAY_RANGES.has(range)}
        asRatio={asRatio}
      />
    </div>
  );
}
