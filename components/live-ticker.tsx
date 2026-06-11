"use client";

import { useEffect, useRef, useState } from "react";
import { formatPct } from "@/lib/utils";
import { TICKER_TIPS } from "@/lib/glossary";
import type { LiveQuote } from "@/lib/markets";
import Tooltip from "./tooltip";

type Flash = { dir: "up" | "down"; key: number };

/**
 * Live price tape. Server-rendered for first paint, then polls /api/quotes on
 * the same 60s cadence as the cache and FLASHES each cell green/red the instant
 * its price changes — the classic Bloomberg tick. Polling pauses when the tab is
 * hidden so a backgrounded terminal isn't hammering the endpoint.
 */
export default function LiveTicker({ initial }: { initial: LiveQuote[] }) {
  const [quotes, setQuotes] = useState<LiveQuote[]>(initial);
  const [flashes, setFlashes] = useState<Record<string, Flash>>({});
  const prev = useRef<Map<string, number>>(
    new Map(
      initial
        .filter((q) => q.price != null)
        .map((q) => [q.symbol, q.price as number]),
    ),
  );
  const counter = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch("/api/quotes", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: { quotes: LiveQuote[] } = await res.json();
        if (cancelled) return;

        const next: Record<string, Flash> = {};
        for (const q of data.quotes) {
          if (q.price == null) continue;
          const before = prev.current.get(q.symbol);
          if (before != null && q.price !== before) {
            counter.current += 1;
            next[q.symbol] = {
              dir: q.price > before ? "up" : "down",
              key: counter.current,
            };
          }
          prev.current.set(q.symbol, q.price);
        }
        setQuotes(data.quotes);
        if (Object.keys(next).length) setFlashes((f) => ({ ...f, ...next }));
      } catch {
        /* transient network error — keep last good quotes, try again next tick */
      }
    }

    const id = setInterval(poll, 60_000);
    function onVis() {
      if (!document.hidden) poll();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className="w-full border-b border-[var(--border)] bg-[var(--panel-head)]">
      <div className="panel-scroll mx-auto flex max-w-[1600px] flex-nowrap items-center gap-x-5 overflow-x-auto px-2 py-1 font-mono text-[11px] md:flex-wrap md:gap-y-1 md:overflow-visible">
        {quotes.map((q) => {
          const up = (q.changePct ?? 0) > 0;
          const down = (q.changePct ?? 0) < 0;
          const tip = TICKER_TIPS[q.symbol] ?? TICKER_TIPS[q.label] ?? "";
          const flash = flashes[q.symbol];
          const flashCls = flash
            ? flash.dir === "up"
              ? "tick-up"
              : "tick-down"
            : "";
          const labelEl = (
            <span className="uppercase tracking-wider text-[var(--amber-dim)]">
              {q.label}
            </span>
          );
          return (
            <div
              // Re-keying on each flash restarts the CSS pulse from the top.
              key={`${q.symbol}-${flash?.key ?? 0}`}
              className={`flex shrink-0 items-baseline gap-2 px-1 ${flashCls}`}
            >
              {tip ? <Tooltip text={tip}>{labelEl}</Tooltip> : labelEl}
              <span className="text-[var(--foreground)]">
                {q.price === null
                  ? "—"
                  : q.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </span>
              <span
                className={
                  up
                    ? "text-[var(--up)]"
                    : down
                      ? "text-[var(--down)]"
                      : "text-[var(--dim)]"
                }
              >
                {q.changePct === null ? "—" : formatPct(q.changePct)}
              </span>
            </div>
          );
        })}
        <span className="ml-auto flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-widest text-[var(--dim)]">
          <span className="term-blink glow-dot-up inline-block h-1.5 w-1.5 rounded-full bg-[var(--up)]" />
          YAHOO · 60s
        </span>
      </div>
    </div>
  );
}
