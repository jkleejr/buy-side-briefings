"use client";

import { useEffect, useRef, useState } from "react";
import { formatPct } from "@/lib/utils";
import type { LiveQuote } from "@/lib/markets";

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
  // Feed health: down = latest fetch failed or returned no usable prices.
  // lastOk = epoch ms of the last fetch that carried at least one live price.
  // The first paint comes from the (cached) server render, so we seed lastOk
  // from it when it has data, but treat an all-null initial as already down.
  const initialHasPrice = initial.some((q) => q.price != null);
  const [feedDown, setFeedDown] = useState(!initialHasPrice);
  const [lastOk, setLastOk] = useState<number | null>(null);
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
        if (cancelled) return;
        if (!res.ok) {
          setFeedDown(true);
          return;
        }
        const data: { quotes: LiveQuote[] } = await res.json();
        if (cancelled) return;

        // A response with zero usable prices means Yahoo failed upstream even
        // though the route returned 200 — that's still a feed outage.
        const live = data.quotes.some((q) => q.price != null);
        setFeedDown(!live);
        if (live) setLastOk(Date.now());

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
        // Keep the last good prices on an outage rather than blanking the tape.
        if (live) setQuotes(data.quotes);
        if (Object.keys(next).length) setFlashes((f) => ({ ...f, ...next }));
      } catch {
        /* transient network error — flag the feed, keep last good quotes */
        if (!cancelled) setFeedDown(true);
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
      <div className="mx-auto flex max-w-[1600px] items-center gap-x-3 px-2 py-1">
        {/* One line, always. It used to wrap at md and up, so narrowing a
            desktop window pushed the tape onto a second row and shoved the
            page down. It now scrolls sideways instead — quotes slide off the
            end and come back when the window widens. min-w-0 is what lets the
            flex child actually shrink below its content width. */}
        <div className="panel-scroll flex min-w-0 flex-1 flex-nowrap items-center gap-x-5 overflow-x-auto font-mono text-[11px]">
        {quotes.map((q) => {
          const up = (q.changePct ?? 0) > 0;
          const down = (q.changePct ?? 0) < 0;
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
              {labelEl}
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
        </div>

        {/* Outside the scroller so it stays put while the tape moves under it. */}
        {feedDown ? (
          <span
            className="flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-[var(--down)]"
            title={
              lastOk
                ? `Yahoo feed unreachable — showing last good prices from ${new Date(lastOk).toLocaleTimeString()}`
                : "Yahoo feed unreachable — prices below may be stale"
            }
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--down)]" />
            FEED DOWN
            {lastOk && (
              <span className="hidden text-[var(--dim)] sm:inline">
                · LAST{" "}
                {new Date(lastOk).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </span>
        ) : (
          // The dot alone carries it: green and blinking means live. The
          // source and cadence move to the tooltip rather than spending
          // characters on the bar.
          <span
            className="flex shrink-0 items-center"
            title="Live — Yahoo Finance, refreshed every 60s"
          >
            <span
              role="img"
              aria-label="Live prices from Yahoo Finance, refreshed every 60 seconds"
              className="term-blink glow-dot-up inline-block h-1.5 w-1.5 rounded-full bg-[var(--up)]"
            />
          </span>
        )}
      </div>
    </div>
  );
}
