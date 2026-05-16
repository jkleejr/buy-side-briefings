"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { WatchlistEntry, RecentMention } from "@/lib/data";
import {
  CHART_RANGES,
  INTRADAY_RANGES,
  pctForRange,
  type ChartRange,
  type ChartPoint,
} from "@/lib/chart-ranges";
import { formatPct, verdictColor } from "@/lib/utils";
import Panel from "./panel";
import RangeSelector from "./range-selector";
import Sparkline from "./sparkline";

export type WatchQuote = {
  price: number | null;
  changePct: number | null;
  avg50pct: number | null;
};

type Props = {
  entries: WatchlistEntry[];
  initialRange: ChartRange;
  initialSeriesBySymbol: Record<string, ChartPoint[]>;
  quoteBySymbol: Record<string, WatchQuote>;
  mentions: Record<string, RecentMention | undefined>;
};

export default function WatchlistCards({
  entries,
  initialRange,
  initialSeriesBySymbol,
  quoteBySymbol,
  mentions,
}: Props) {
  // Lazy initializer: if URL has ?range=X, start with that; otherwise use the
  // server-provided initial range. Runs once on first render — no flicker.
  const [range, setRange] = useState<ChartRange>(() => {
    if (typeof window === "undefined") return initialRange;
    const params = new URLSearchParams(window.location.search);
    const urlRange = params.get("range");
    if (urlRange && (CHART_RANGES as readonly string[]).includes(urlRange)) {
      return urlRange as ChartRange;
    }
    return initialRange;
  });
  const [seriesMap, setSeriesMap] = useState(initialSeriesBySymbol);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);
  const isFirstMount = useRef(true);

  // Persist range in the URL so the timeframe survives sharing/refreshing.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (range === initialRange) {
      url.searchParams.delete("range");
    } else {
      url.searchParams.set("range", range);
    }
    window.history.replaceState(null, "", url.toString());
  }, [range, initialRange]);

  useEffect(() => {
    // Skip the very first render *only* when the chosen range matches what
    // the server pre-fetched. If URL deep-linked a different range, fall
    // through to fetch immediately.
    if (isFirstMount.current && range === initialRange) {
      isFirstMount.current = false;
      return;
    }
    isFirstMount.current = false;
    const id = ++reqId.current;
    setLoading(true);
    Promise.all(
      entries.map((e) =>
        fetch(`/api/chart?symbol=${encodeURIComponent(e.symbol)}&range=${range}`)
          .then((r) => r.json())
          .then((j) => [e.symbol, Array.isArray(j.data) ? j.data : []] as const),
      ),
    )
      .then((pairs) => {
        if (id !== reqId.current) return;
        setSeriesMap(Object.fromEntries(pairs));
      })
      .catch((err) => console.error("[watchlist] fetch failed:", err))
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [range, entries]);

  return (
    <>
      {/* Shared range selector — applies to every card on the page. */}
      <div className="flex items-center gap-2 border border-[var(--border)] bg-[var(--panel-head)] px-2 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
          Timeframe ▸
        </span>
        <RangeSelector value={range} onChange={setRange} loading={loading} />
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-[var(--dim)]">
          {entries.length} tickers
        </span>
      </div>

      <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
        {entries.map((e) => {
          const q = quoteBySymbol[e.symbol];
          const series = seriesMap[e.symbol] ?? [];
          const mention = mentions[e.symbol];
          const price = q?.price ?? null;
          const pct = pctForRange(range, series, q?.changePct ?? null);
          const m50 = q?.avg50pct ?? null;
          const up = (pct ?? 0) > 0;
          const down = (pct ?? 0) < 0;
          const pctCls = up
            ? "text-[var(--up)]"
            : down
              ? "text-[var(--down)]"
              : "text-[var(--dim)]";
          const m50Cls =
            m50 === null
              ? "text-[var(--dim)]"
              : m50 > 0
                ? "text-[var(--up)]"
                : "text-[var(--down)]";
          const sentimentCls = mention
            ? mention.sentiment === "positive"
              ? "text-[var(--up)]"
              : mention.sentiment === "negative"
                ? "text-[var(--down)]"
                : "text-[var(--foreground)]"
            : "text-[var(--dim)]";

          return (
            <Panel
              key={e.symbol}
              code={e.symbol}
              title={e.label}
              meta={
                <span className="flex items-center gap-2">
                  <span className="text-[var(--foreground)]">
                    {price === null
                      ? "—"
                      : `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                  </span>
                  <span className={pctCls}>{pct === null ? "—" : formatPct(pct)}</span>
                  <span className="text-[var(--dim)]">· {range}</span>
                </span>
              }
            >
              <div className="flex flex-col gap-1.5 p-2">
                {/* 50-day trend + optional note row */}
                <div className="flex flex-wrap items-baseline gap-x-3 font-mono text-[10px] uppercase tracking-widest">
                  <span className="text-[var(--amber-dim)]">~50d:</span>
                  <span className={m50Cls}>{m50 === null ? "—" : formatPct(m50)}</span>
                  {e.note && (
                    <span className="ml-auto normal-case tracking-normal text-[11px] text-[var(--dim)]">
                      {e.note}
                    </span>
                  )}
                </div>

                {/* Sparkline — hover for day/date/time/price popup */}
                <div className="relative h-12 w-full">
                  <Sparkline
                    points={series}
                    positive={up}
                    intraday={INTRADAY_RANGES.has(range)}
                  />
                </div>

                {/* Latest briefing mention */}
                {mention ? (
                  <div className="border-t border-[var(--border)] pt-1.5">
                    <div className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
                      <Link
                        href={`/briefings/${mention.routine}/${mention.date}-${mention.window}`}
                        className={`${verdictColor(mention.verdict_code).text} hover:underline`}
                      >
                        ▸ {mention.verdict_label}
                      </Link>
                      <span className="text-[var(--dim)]">
                        {mention.date} {mention.window ?? ""}
                      </span>
                    </div>
                    <div className={`mt-0.5 font-mono text-[11px] leading-snug ${sentimentCls}`}>
                      {mention.note}
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-[var(--border)] pt-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--dim)]">
                    no briefing mention yet
                  </div>
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
