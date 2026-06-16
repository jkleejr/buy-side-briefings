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

type Quote = { price: number | null; changePct: number | null };

type Props = {
  initialRange: ChartRange;
  initialSeries: ChartPoint[];
  initialQuote: Quote;
  symbol: string;
  color: string;
  /** Currency prefix for the price header (default "$"). e.g. "₩" for KRW. */
  currencySymbol?: string;
};

export default function SpyChartClient({
  initialRange,
  initialSeries,
  initialQuote,
  symbol,
  color,
  currencySymbol = "$",
}: Props) {
  const [range, setRange] = useState<ChartRange>(initialRange);
  const [series, setSeries] = useState(initialSeries);
  const [loading, setLoading] = useState(false);
  const [showVol, setShowVol] = useState(false);
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
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      .then((r) => r.json())
      .then((j) => {
        if (id !== reqId.current) return;
        if (Array.isArray(j.data)) setSeries(j.data);
      })
      .catch((err) => console.error("[spy-chart] fetch failed:", err))
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [range, symbol, initialRange]);

  const price = initialQuote.price;
  const pct = pctForRange(range, series, initialQuote.changePct);
  const up = (pct ?? 0) > 0;
  const down = (pct ?? 0) < 0;
  const pctCls = up
    ? "text-[var(--up)]"
    : down
      ? "text-[var(--down)]"
      : "text-[var(--dim)]";
  const intraday = INTRADAY_RANGES.has(range);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 px-2 pt-1.5 font-mono text-[11px]">
        <span className="text-[var(--amber-dim)]">{symbol}</span>
        <span className="text-[var(--foreground)]">
          {price === null
            ? "—"
            : `${currencySymbol}${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
        </span>
        <span className={pctCls}>{pct === null ? "—" : formatPct(pct)}</span>
        <span className="text-[10px] text-[var(--dim)]">· {range}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowVol((v) => !v)}
            aria-pressed={showVol}
            title="Toggle the volume-at-price profile (horizontal bars showing where volume traded)"
            className={
              "border px-1.5 py-0.5 text-[10px] uppercase tracking-widest transition-colors " +
              (showVol
                ? "border-[var(--amber)] text-[var(--amber)]"
                : "border-[var(--border)] text-[var(--dim)] hover:text-[var(--amber)]")
            }
          >
            Vol
          </button>
          <RangeSelector value={range} onChange={setRange} loading={loading} />
        </div>
      </div>
      <div className="flex-1">
        <AssetChart
          series={series}
          color={color}
          label={symbol}
          intraday={intraday}
          showVolumeProfile={showVol}
        />
      </div>
    </div>
  );
}
