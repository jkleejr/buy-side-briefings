"use client";

import { useEffect, useRef, useState } from "react";
import {
  INTRADAY_RANGES,
  pctForRange,
  type ChartRange,
  type ChartPoint,
} from "@/lib/chart-ranges";
import { formatPct } from "@/lib/utils";
import RangeSelector from "./range-selector";
import AssetChart from "./asset-chart";
import Tooltip from "./tooltip";
import { TICKER_TIPS } from "@/lib/glossary";

export type IndexAsset = {
  symbol: string;
  label: string;
  sublabel: string;
  color: string;
};

export type IndexQuote = {
  price: number | null;
  changePct: number | null;
};

type Props = {
  assets: IndexAsset[];
  initialRange: ChartRange;
  initialSeriesBySymbol: Record<string, ChartPoint[]>;
  quoteBySymbol: Record<string, IndexQuote>;
};

export default function UsIndicesClient({
  assets,
  initialRange,
  initialSeriesBySymbol,
  quoteBySymbol,
}: Props) {
  const [range, setRange] = useState<ChartRange>(initialRange);
  const [seriesMap, setSeriesMap] = useState(initialSeriesBySymbol);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current && range === initialRange) {
      isFirstMount.current = false;
      return;
    }
    isFirstMount.current = false;
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
      .catch((err) => console.error("[us-indices] fetch failed:", err))
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [range, assets, initialRange]);

  return (
    <div className="flex h-full flex-col">
      {/* Shared range selector */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
          Timeframe ▸
        </span>
        <RangeSelector value={range} onChange={setRange} loading={loading} />
      </div>

      {/* Three charts side-by-side on desktop; stacks on mobile */}
      <div className="grid grid-cols-1 divide-y divide-[var(--border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {assets.map((a) => {
          const series = seriesMap[a.symbol] ?? [];
          const quote = quoteBySymbol[a.symbol];
          const price = quote?.price ?? null;
          const pct = pctForRange(range, series, quote?.changePct ?? null);
          const up = (pct ?? 0) > 0;
          const down = (pct ?? 0) < 0;
          const pctCls = up
            ? "text-[var(--up)]"
            : down
              ? "text-[var(--down)]"
              : "text-[var(--dim)]";
          const tip = TICKER_TIPS[a.symbol] ?? "";
          return (
            <div key={a.symbol} className="flex min-w-0 flex-col">
              {/* Per-chart price header */}
              <div className="flex flex-wrap items-baseline gap-x-2 px-2 pt-1.5 font-mono text-[11px]">
                <span className="text-[var(--amber-dim)]">
                  {tip ? <Tooltip text={tip}>{a.label}</Tooltip> : a.label}
                </span>
                <span className="truncate text-[10px] text-[var(--dim)]">
                  {a.sublabel}
                </span>
                <span className="ml-auto text-[var(--foreground)]">
                  {price === null
                    ? "—"
                    : `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                </span>
                <span className={pctCls}>{pct === null ? "—" : formatPct(pct)}</span>
                <span className="text-[10px] text-[var(--dim)]">· {range}</span>
              </div>
              {/* Chart */}
              <div className="flex-1">
                <AssetChart
                  series={series}
                  color={a.color}
                  label={a.label}
                  intraday={INTRADAY_RANGES.has(range)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
