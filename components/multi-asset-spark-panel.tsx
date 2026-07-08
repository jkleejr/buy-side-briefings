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
import Sparkline from "./sparkline";

type Asset = { symbol: string; label: string };
type Quote = { price: number | null; changePct: number | null };

type Props = {
  assets: Asset[];
  initialRange: ChartRange;
  initialSeriesBySymbol: Record<string, ChartPoint[]>;
  initialQuoteBySymbol: Record<string, Quote>;
  priceDigits?: number;
};

export default function MultiAssetSparkPanel({
  assets,
  initialRange,
  initialSeriesBySymbol,
  initialQuoteBySymbol,
  priceDigits = 2,
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
      .then((entries) => {
        if (id !== reqId.current) return;
        setSeriesMap(Object.fromEntries(entries));
      })
      .catch((err) => console.error("[multi-asset-spark] fetch failed:", err))
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [range, assets]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border)] px-2 py-1">
        <RangeSelector value={range} onChange={setRange} loading={loading} />
      </div>
      <div className="divide-y divide-[var(--border)]">
        {assets.map((a) => {
          const quote = initialQuoteBySymbol[a.symbol];
          const price = quote?.price ?? null;
          const series = seriesMap[a.symbol] ?? [];
          const pct = pctForRange(range, series, quote?.changePct ?? null);
          const up = (pct ?? 0) > 0;
          const down = (pct ?? 0) < 0;
          const pctCls = up
            ? "text-[var(--up)]"
            : down
              ? "text-[var(--down)]"
              : "text-[var(--dim)]";
          return (
            <div
              key={a.symbol}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-1.5 font-mono text-[11px]"
            >
              <span className="text-[var(--amber-dim)]">
                {a.label}
              </span>
              <span className="text-[var(--foreground)]">
                {price === null
                  ? "—"
                  : `$${price.toLocaleString("en-US", { maximumFractionDigits: priceDigits })}`}
              </span>
              <span>
                <span className={pctCls}>{pct === null ? "—" : formatPct(pct)}</span>
                <span className="ml-1 text-[10px] text-[var(--dim)]">· {range}</span>
              </span>
              <div className="col-span-3 h-10">
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
