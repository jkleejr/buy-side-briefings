"use client";

import { useEffect, useRef, useState } from "react";
import {
  INTRADAY_RANGES,
  pctForRange,
  type ChartRange,
  type ChartPoint,
} from "@/lib/chart-ranges";
import { formatPct } from "@/lib/utils";
import { TICKER_TIPS } from "@/lib/glossary";
import RangeSelector from "./range-selector";
import Sparkline from "./sparkline";
import Tooltip from "./tooltip";

export type TechAsset = { symbol: string; label: string; sublabel: string };
export type TechQuote = { price: number | null; changePct: number | null };

type Props = {
  assets: TechAsset[];
  initialRange: ChartRange;
  initialSeriesBySymbol: Record<string, ChartPoint[]>;
  quoteBySymbol: Record<string, TechQuote>;
};

export default function TechStocksClient({
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
      .catch((err) => console.error("[tech-stocks] fetch failed:", err))
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

      {/* Responsive grid: 2-up mobile, 4-up tablet+, all share one range. */}
      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] lg:grid-cols-4 lg:divide-y-0">
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
            <div key={a.symbol} className="flex flex-col gap-1 px-2 py-1.5">
              {/* Price header */}
              <div className="flex flex-wrap items-baseline gap-x-2 font-mono text-[11px]">
                <span className="text-[var(--amber-dim)]">
                  {tip ? <Tooltip text={tip}>{a.label}</Tooltip> : a.label}
                </span>
                <span className="truncate text-[10px] text-[var(--dim)]">{a.sublabel}</span>
              </div>
              <div className="flex items-baseline gap-x-2 font-mono text-[11px]">
                <span className="text-[var(--foreground)]">
                  {price === null
                    ? "—"
                    : `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                </span>
                <span className={pctCls}>{pct === null ? "—" : formatPct(pct)}</span>
                <span className="ml-auto text-[10px] text-[var(--dim)]">{range}</span>
              </div>
              {/* Sparkline */}
              <div className="h-10 w-full">
                <Sparkline
                  points={series}
                  positive={up}
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
