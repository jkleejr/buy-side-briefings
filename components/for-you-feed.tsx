"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SymbolSearchResult, TradeQuote } from "@/lib/markets";
import type { HolderRelevance } from "@/lib/relevance";
import { useHoldings, type Holding } from "@/lib/holdings";
import { formatPct } from "@/lib/utils";
import Panel from "./panel";

// ---------------------------------------------------------------------------
// "For You" — the so-what-for-me layer. Reads the user's holdings (this browser)
// and, for every covered name, shows the desk's standing call distilled to one
// holder-facing line + the strongest bull/bear point, plus a P&L read when a
// cost basis is set. Uncovered holdings get a slim live-price row (deeper
// coverage lands in a later phase). Pure client composition over data the build
// already produced — nothing here can break the static build.
// ---------------------------------------------------------------------------

const ACTION_LABEL: Record<HolderRelevance["action"], string> = {
  buy: "BUY",
  hold: "HOLD",
  sell: "SELL",
  step_aside: "STEP ASIDE",
};

function actionClasses(action: HolderRelevance["action"]): string {
  switch (action) {
    case "buy":
      return "border-[var(--up)] text-[var(--up)]";
    case "sell":
      return "border-[var(--down)] text-[var(--down)]";
    case "hold":
      return "border-[var(--amber-dim)] text-[var(--amber)]";
    default:
      return "border-[var(--border-strong)] text-[var(--dim)]";
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

function winnerChip(w: HolderRelevance["dayWinner"]) {
  const map = {
    bulls: { label: "BULLS PAID", cls: "text-[var(--up)]" },
    bears: { label: "BEARS PAID", cls: "text-[var(--down)]" },
    flat: { label: "FLAT", cls: "text-[var(--dim)]" },
  } as const;
  return map[w];
}

function fmtPrice(n: number, sym: string): string {
  return `${sym}${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

// P&L vs the user's cost basis, using the best price we have. Covered names use
// the dossier's last close (labeled by date); uncovered use a live quote.
function pnl(price: number | null | undefined, h: Holding) {
  if (price == null || h.costBasis == null || h.costBasis <= 0) return null;
  const pct = ((price - h.costBasis) / h.costBasis) * 100;
  const abs = h.shares != null ? (price - h.costBasis) * h.shares : null;
  return { pct, abs };
}

/** Inline, optional position-size editor (shares + average cost). */
function SizeEditor({
  h,
  onSave,
  onClose,
}: {
  h: Holding;
  onSave: (patch: Partial<Pick<Holding, "shares" | "costBasis">>) => void;
  onClose: () => void;
}) {
  const [shares, setShares] = useState(h.shares?.toString() ?? "");
  const [cost, setCost] = useState(h.costBasis?.toString() ?? "");
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-2 font-mono text-[11px]">
      <label className="flex items-center gap-1 text-[var(--dim)]">
        shares
        <input
          inputMode="decimal"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          className="w-20 border border-[var(--border)] bg-black px-1.5 py-0.5 text-[var(--foreground)] focus:border-[var(--amber)] focus:outline-none"
          placeholder="—"
        />
      </label>
      <label className="flex items-center gap-1 text-[var(--dim)]">
        avg cost
        <input
          inputMode="decimal"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="w-24 border border-[var(--border)] bg-black px-1.5 py-0.5 text-[var(--foreground)] focus:border-[var(--amber)] focus:outline-none"
          placeholder="—"
        />
      </label>
      <button
        type="button"
        onClick={() => {
          const s = parseFloat(shares);
          const c = parseFloat(cost);
          onSave({
            shares: Number.isFinite(s) && s > 0 ? s : undefined,
            costBasis: Number.isFinite(c) && c > 0 ? c : undefined,
          });
          onClose();
        }}
        className="border border-[var(--amber-dim)] px-2 py-0.5 text-[var(--amber)] hover:bg-[rgba(255,165,0,0.1)]"
      >
        save
      </button>
      <button
        type="button"
        onClick={onClose}
        className="px-1 text-[var(--dim)] hover:text-[var(--foreground)]"
      >
        cancel
      </button>
    </div>
  );
}

function PnlLine({
  price,
  date,
  h,
  sym,
}: {
  price: number | undefined;
  date?: string;
  h: Holding;
  sym: string;
}) {
  const p = pnl(price, h);
  if (!p) return null;
  const arrow = p.pct > 0 ? "▲" : p.pct < 0 ? "▼" : "■";
  return (
    <div className={`mt-1.5 font-mono text-[11px] ${pctTone(p.pct)}`}>
      {arrow} {formatPct(p.pct)} vs your {fmtPrice(h.costBasis as number, sym)} basis
      {p.abs != null && (
        <span>
          {" · "}
          {p.abs >= 0 ? "+" : "−"}
          {fmtPrice(Math.abs(p.abs), sym)}
        </span>
      )}
      {date && <span className="text-[var(--dim)]"> · at {date} close</span>}
    </div>
  );
}

export default function ForYouFeed({
  relevance,
}: {
  relevance: HolderRelevance[];
}) {
  const { mounted, holdings, add, remove, update } = useHoldings();

  // search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  // live quotes for uncovered holdings
  const [quotes, setQuotes] = useState<Record<string, TradeQuote>>({});
  // which card's size editor is open
  const [editing, setEditing] = useState<string | null>(null);

  // Resolve each holding to its covered relevance (by alias) or null.
  const { covered, uncovered } = useMemo(() => {
    const cov: Array<{ h: Holding; rel: HolderRelevance }> = [];
    const unc: Holding[] = [];
    for (const h of holdings) {
      const sym = h.symbol.toUpperCase();
      const rel = relevance.find((r) => r.aliases.includes(sym));
      if (rel) cov.push({ h, rel });
      else unc.push(h);
    }
    return { covered: cov, uncovered: unc };
  }, [holdings, relevance]);

  // Fetch prices for uncovered holdings (covered prices come from the dossier).
  useEffect(() => {
    const syms = uncovered.map((h) => h.symbol);
    if (syms.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/price?symbols=${encodeURIComponent(syms.join(","))}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data: { quotes: TradeQuote[] } = await res.json();
        if (cancelled) return;
        const map: Record<string, TradeQuote> = {};
        for (const q of data.quotes) map[q.symbol.toUpperCase()] = q;
        setQuotes((p) => ({ ...p, ...map }));
      } catch {
        /* ignore — slim row just shows no price */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uncovered]);

  // search (debounced)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          cache: "no-store",
        });
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

  const onAdd = useCallback(
    (r: SymbolSearchResult) => {
      add({ symbol: r.symbol, name: r.name });
      setQuery("");
      setResults([]);
      setOpen(false);
    },
    [add],
  );

  const coveredCount = relevance.length;

  return (
    <Panel
      code="FORYOU"
      title="Your book — so what for you?"
      learn="Add the tickers you actually own. For names we run a daily desk on, you get the standing call distilled to one line plus the strongest bull and bear point — and a P&L read if you add your cost basis. Holdings are stored in this browser only; nothing leaves your device."
    >
      <div className="space-y-2 p-2 font-mono">
        {/* add box */}
        <div className="relative">
          <div className="flex items-center gap-2 border border-[var(--border)] bg-black px-2 py-1.5 focus-within:border-[var(--amber)]">
            <span className="text-[11px] text-[var(--amber)]">＋</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length && setOpen(true)}
              placeholder="Add a holding — ticker or company (NVDA, Nvidia, BTC-USD)"
              className="w-full bg-transparent text-[13px] text-[var(--foreground)] placeholder:text-[var(--dim)] focus:outline-none"
            />
            {searching && <span className="text-[10px] text-[var(--dim)]">…</span>}
          </div>

          {open && results.length > 0 && (
            <ul className="absolute z-20 mt-0.5 max-h-72 w-full overflow-y-auto border border-[var(--amber-dim)] bg-black shadow-[0_8px_30px_rgba(0,0,0,0.8)]">
              {results.map((r) => (
                <li key={`${r.symbol}-${r.exchange}`}>
                  <button
                    type="button"
                    onClick={() => onAdd(r)}
                    className="flex w-full items-baseline gap-2 px-2 py-1.5 text-left text-[12px] hover:bg-[rgba(255,165,0,0.1)]"
                  >
                    <span className="w-20 shrink-0 font-bold text-[var(--amber)]">
                      {r.symbol}
                    </span>
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

        {/* states */}
        {!mounted ? (
          <div className="py-3 text-center text-[11px] text-[var(--dim)]">Loading…</div>
        ) : holdings.length === 0 ? (
          <div className="border border-dashed border-[var(--border-strong)] px-3 py-5 text-center">
            <div className="text-[12px] text-[var(--foreground)]">
              Add what you own to see what today actually means for your book.
            </div>
            <div className="mt-1 text-[10px] text-[var(--dim)]">
              {coveredCount} names have a daily desk — the rest get a live price for
              now. Stored in this browser only.
            </div>
          </div>
        ) : (
          <>
            {/* covered holdings — the rich "so what" cards */}
            {covered.length > 0 && (
              <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
                {covered.map(({ h, rel }) => {
                  const win = winnerChip(rel.dayWinner);
                  return (
                    <div
                      key={h.symbol}
                      className="border border-[var(--border)] bg-black p-2.5"
                    >
                      {/* header: ticker + call badge */}
                      <div className="flex items-baseline justify-between gap-2">
                        <Link
                          href={rel.href}
                          className="flex items-baseline gap-1.5 hover:underline"
                          title={`Open the ${rel.name} desk`}
                        >
                          <span className="text-[13px] font-bold text-[var(--foreground)]">
                            {rel.symbol}
                          </span>
                          <span className="truncate text-[9px] uppercase tracking-widest text-[var(--dim)]">
                            {rel.name}
                          </span>
                        </Link>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span
                            className={`border px-1.5 py-0.5 text-[10px] font-bold tracking-widest ${actionClasses(rel.action)}`}
                          >
                            {ACTION_LABEL[rel.action]}
                          </span>
                          <button
                            type="button"
                            onClick={() => remove(h.symbol)}
                            title={`Remove ${rel.symbol}`}
                            className="text-[11px] text-[var(--dim)] hover:text-[var(--down)]"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* price + day read */}
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-[14px] font-bold tabular-nums text-[var(--foreground)]">
                          {fmtPrice(rel.price, rel.currencySymbol)}
                        </span>
                        <span
                          className={`text-[11px] font-semibold tabular-nums ${pctTone(rel.changePct)}`}
                        >
                          {formatPct(rel.changePct)}
                        </span>
                        <span className={`ml-auto text-[9px] tracking-widest ${win.cls}`}>
                          {win.label}
                        </span>
                      </div>

                      {/* the so-what */}
                      <div className="mt-1.5 text-[12px] leading-snug text-[var(--foreground)]">
                        {rel.holderLine}
                      </div>

                      {/* strongest bull / bear */}
                      <div className="mt-2 space-y-1 text-[10.5px] leading-snug">
                        {rel.topBull && (
                          <div className="flex gap-1.5">
                            <span className="shrink-0 font-bold text-[var(--up)]">BULL</span>
                            <span className="text-[var(--dim)]">{rel.topBull}</span>
                          </div>
                        )}
                        {rel.topBear && (
                          <div className="flex gap-1.5">
                            <span className="shrink-0 font-bold text-[var(--down)]">BEAR</span>
                            <span className="text-[var(--dim)]">{rel.topBear}</span>
                          </div>
                        )}
                      </div>

                      {/* P&L + size editor */}
                      <PnlLine price={rel.price} date={rel.date} h={h} sym={rel.currencySymbol} />
                      {editing === h.symbol ? (
                        <SizeEditor
                          h={h}
                          onSave={(patch) => update(h.symbol, patch)}
                          onClose={() => setEditing(null)}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditing(h.symbol)}
                          className="mt-1.5 text-[10px] text-[var(--amber-dim)] hover:text-[var(--amber)]"
                        >
                          {h.costBasis != null ? "edit size" : "+ add shares / cost basis"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* uncovered holdings — slim live-price rows, no dead end */}
            {uncovered.length > 0 && (
              <div className="border border-[var(--border)] bg-black">
                <div className="border-b border-[var(--border)] px-2 py-1 text-[9px] uppercase tracking-widest text-[var(--dim)]">
                  Also in your book · no desk yet
                </div>
                {uncovered.map((h) => {
                  const q = quotes[h.symbol.toUpperCase()];
                  const p = pnl(q?.price, h);
                  return (
                    <div
                      key={h.symbol}
                      className="flex items-baseline gap-2 px-2 py-1.5 text-[12px]"
                    >
                      <span className="w-16 shrink-0 font-bold text-[var(--foreground)]">
                        {h.symbol}
                      </span>
                      <span className="truncate text-[10px] text-[var(--dim)]">{h.name}</span>
                      <span className="ml-auto shrink-0 tabular-nums text-[var(--foreground)]">
                        {q?.price != null ? fmtPrice(q.price, "$") : "—"}
                      </span>
                      <span
                        className={`w-16 shrink-0 text-right text-[11px] tabular-nums ${pctTone(q?.changePct ?? null)}`}
                      >
                        {q?.changePct == null ? "—" : formatPct(q.changePct)}
                      </span>
                      {p && (
                        <span className={`shrink-0 text-[10px] tabular-nums ${pctTone(p.pct)}`}>
                          {formatPct(p.pct)} vs basis
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(h.symbol)}
                        title={`Remove ${h.symbol}`}
                        className="shrink-0 text-[11px] text-[var(--dim)] hover:text-[var(--down)]"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
