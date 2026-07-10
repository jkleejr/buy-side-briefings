"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SymbolSearchResult, TradeQuote } from "@/lib/markets";
import { formatPct } from "@/lib/utils";
import Panel from "./panel";

const KEY = "bsb_watchlist_v1";
const POLL_MS = 45_000;

type WatchItem = { symbol: string; name: string };
type QuoteMap = Record<string, TradeQuote>;
type SparkMap = Record<string, number[]>;

function load(): WatchItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function pctTone(n: number | null | undefined): string {
  return n == null
    ? "text-[var(--dim)]"
    : n > 0
      ? "text-[var(--up)]"
      : n < 0
        ? "text-[var(--down)]"
        : "text-[var(--dim)]";
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="h-7" />;
  const W = 120;
  const H = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = W / (values.length - 1);
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`)
    .join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-full" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={up ? "#22c55e" : "#ef4444"} strokeWidth={1.25} />
    </svg>
  );
}

export default function TickerSearch() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<WatchItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [sparks, setSparks] = useState<SparkMap>({});

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const itemsRef = useRef<WatchItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  });

  // ---- load / persist ----
  useEffect(() => {
    setItems(load());
    setMounted(true);
  }, []);
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem(KEY, JSON.stringify(items));
      } catch {
        /* private mode / quota — still works for the session */
      }
    }
  }, [items, mounted]);

  // ---- live quotes + sparklines ----
  const fetchSpark = useCallback(async (symbol: string) => {
    try {
      const res = await fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=5D`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data: { data?: Array<{ close: number }> } = await res.json();
      const closes = (data.data ?? []).map((d) => d.close).filter((n) => typeof n === "number");
      if (closes.length) setSparks((p) => ({ ...p, [symbol]: closes }));
    } catch {
      /* ignore */
    }
  }, []);

  const refreshQuotes = useCallback(async (syms: string[]) => {
    const list = Array.from(new Set(syms)).filter(Boolean);
    if (list.length === 0) return;
    try {
      const res = await fetch(`/api/price?symbols=${encodeURIComponent(list.join(","))}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data: { quotes: TradeQuote[] } = await res.json();
      const map: QuoteMap = {};
      for (const q of data.quotes) map[q.symbol] = q;
      setQuotes((p) => ({ ...p, ...map }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const syms = items.map((i) => i.symbol);
    refreshQuotes(syms);
    for (const s of syms) if (!sparks[s]) fetchSpark(s);
    const id = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) {
        refreshQuotes(itemsRef.current.map((i) => i.symbol));
      }
    }, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, items.length, refreshQuotes, fetchSpark]);

  // ---- search (debounced) ----
  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const data: { results: SymbolSearchResult[] } = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function add(item: WatchItem) {
    const sym = item.symbol.toUpperCase();
    if (items.some((i) => i.symbol === sym)) {
      setMsg(`${sym} is already on your watchlist.`);
    } else {
      setItems((prev) => [{ symbol: sym, name: item.name }, ...prev]);
      refreshQuotes([sym]);
      fetchSpark(sym);
      setMsg(`Added ${sym}.`);
    }
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function remove(symbol: string) {
    setItems((prev) => prev.filter((i) => i.symbol !== symbol));
  }

  return (
    <Panel
      code="ADD"
      title="Search & add a ticker"
    >
      <div className="space-y-2 p-2 font-mono">
        {/* search box */}
        <div className="relative">
          <div className="flex items-center gap-2 border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 focus-within:border-[var(--amber)]">
            <span className="text-[11px] text-[var(--amber)]">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length && setOpen(true)}
              placeholder="Search ticker or company… (AAPL, Nvidia, BTC-USD)"
              className="w-full bg-transparent text-[13px] text-[var(--foreground)] placeholder:text-[var(--dim)] focus:outline-none"
            />
            {searching && <span className="text-[10px] text-[var(--dim)]">…</span>}
          </div>

          {open && results.length > 0 && (
            <ul className="absolute z-20 mt-0.5 max-h-72 w-full overflow-y-auto border border-[var(--amber-dim)] bg-[var(--background)] shadow-[0_8px_30px_rgba(30,29,26,0.15)]">
              {results.map((r) => (
                <li key={`${r.symbol}-${r.exchange}`}>
                  <button
                    type="button"
                    onClick={() => add({ symbol: r.symbol, name: r.name })}
                    className="flex w-full items-baseline gap-2 px-2 py-1.5 text-left text-[12px] hover:bg-[rgba(255,165,0,0.1)]"
                  >
                    <span className="w-20 shrink-0 font-bold text-[var(--amber)]">{r.symbol}</span>
                    <span className="truncate text-[var(--foreground)]">{r.name}</span>
                    <span className="ml-auto shrink-0 text-[9px] uppercase tracking-widest text-[var(--dim)]">
                      {r.type} {r.exchange ? `· ${r.exchange}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {msg && <div className="text-[10px] text-[var(--dim)]">{msg}</div>}

        {/* your watchlist */}
        {!mounted ? (
          <div className="py-3 text-center text-[11px] text-[var(--dim)]">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-3 text-center text-[11px] text-[var(--dim)]">
            Your watchlist is empty — search above to add a ticker.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => {
              const q = quotes[it.symbol];
              const pct = q?.changePct ?? null;
              return (
                <div
                  key={it.symbol}
                  className="border border-[var(--border)] bg-[var(--background)] px-2.5 py-2"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <Link
                      href={`/watchlist#${it.symbol}`}
                      className="flex items-baseline gap-1.5 hover:underline"
                      title={it.name}
                    >
                      <span className="text-[13px] font-bold text-[var(--foreground)]">
                        {it.symbol}
                      </span>
                      <span className="truncate text-[9px] uppercase tracking-widest text-[var(--dim)]">
                        {q?.name ?? it.name}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(it.symbol)}
                      title={`Remove ${it.symbol}`}
                      className="shrink-0 text-[11px] text-[var(--dim)] hover:text-[var(--down)]"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-[15px] font-bold tabular-nums text-[var(--foreground)]">
                      {q?.price != null
                        ? `$${q.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                        : "—"}
                    </span>
                    <span className={`text-[11px] font-semibold tabular-nums ${pctTone(pct)}`}>
                      {pct == null ? "—" : formatPct(pct)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <Spark values={sparks[it.symbol] ?? []} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}
