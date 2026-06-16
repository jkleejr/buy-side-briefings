"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Panel from "@/components/panel";
import PaperDeskChart from "@/components/paper-desk-chart";
import {
  cancelOrder,
  createDesk,
  costBasis,
  equity,
  fillMarket,
  holdingsValue,
  placeLimit,
  positionFor,
  positionPnL,
  processLimitOrders,
  snapshotToday,
  trackedSymbols,
  type DeskState,
} from "@/lib/paper-desk";
import type { TradeQuote } from "@/lib/markets";

const KEY = "bsb_paper_desk_v1";
const DEFAULT_CASH = 100_000;
const POLL_MS = 30_000;

// ---- small helpers --------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString();
}
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  }
}
function usd(v: number, dp = 2): string {
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}
function qtyFmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}
function pctClass(n: number): string {
  return n > 0 ? "text-[var(--up)]" : n < 0 ? "text-[var(--down)]" : "text-[var(--dim)]";
}

function loadState(): DeskState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeskState;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

type QuoteMap = Record<string, TradeQuote>;

export default function PaperDesk() {
  const [state, setState] = useState<DeskState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [refreshing, setRefreshing] = useState(false);

  // Order-ticket form
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [qtyStr, setQtyStr] = useState("");
  const [limitStr, setLimitStr] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [cashInput, setCashInput] = useState(String(DEFAULT_CASH));

  // Refs so the polling loop reads the latest values without re-subscribing.
  // Updated in a post-render effect (not during render) so the interval/refresh
  // callbacks always see the freshest state and ticket symbol.
  const stateRef = useRef<DeskState | null>(null);
  const symbolRef = useRef("");
  useEffect(() => {
    stateRef.current = state;
    symbolRef.current = symbol.trim().toUpperCase();
  });

  // ---- load / persist -----------------------------------------------------
  useEffect(() => {
    const loaded = loadState() ?? createDesk(DEFAULT_CASH, nowIso());
    setState(loaded);
    setCashInput(String(loaded.startingCash));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && state) {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch {
        /* quota / private mode — desk still works for the session */
      }
    }
  }, [state, mounted]);

  // ---- price feed ---------------------------------------------------------
  const fetchQuotes = useCallback(async (symbols: string[]) => {
    const list = Array.from(new Set(symbols.filter(Boolean)));
    if (list.length === 0) return {} as QuoteMap;
    try {
      const res = await fetch(`/api/price?symbols=${encodeURIComponent(list.join(","))}`, {
        cache: "no-store",
      });
      if (!res.ok) return {} as QuoteMap;
      const data: { quotes: TradeQuote[] } = await res.json();
      const map: QuoteMap = {};
      for (const q of data.quotes) map[q.symbol] = q;
      setQuotes((prev) => ({ ...prev, ...map }));
      return map;
    } catch {
      return {} as QuoteMap;
    }
  }, []);

  const refresh = useCallback(async () => {
    const s = stateRef.current;
    if (!s) return;
    setRefreshing(true);
    const watch = [...trackedSymbols(s), symbolRef.current].filter(Boolean);
    const fresh = await fetchQuotes(watch);
    // Build a price map from everything we now know.
    setQuotes((prevQuotes) => {
      const merged = { ...prevQuotes, ...fresh };
      const priceMap: Record<string, number> = {};
      for (const sym of Object.keys(merged)) {
        const p = merged[sym]?.price;
        if (p != null) priceMap[sym] = p;
      }
      setState((prev) => {
        if (!prev) return prev;
        const processed = processLimitOrders(prev, priceMap, nowIso());
        return snapshotToday(processed.state, priceMap, todayUtc());
      });
      return merged;
    });
    setRefreshing(false);
  }, [fetchQuotes]);

  // Poll on mount + interval; pause when tab hidden.
  useEffect(() => {
    if (!mounted) return;
    refresh();
    const id = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [mounted, refresh]);

  // Pull a quote for the ticket symbol as it's typed (debounced).
  useEffect(() => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    const t = setTimeout(() => fetchQuotes([sym]), 400);
    return () => clearTimeout(t);
  }, [symbol, fetchQuotes]);

  if (!mounted || !state) {
    return (
      <Panel code="DESK" title="Paper Trading Desk">
        <div className="p-4 text-center font-mono text-[11px] text-[var(--dim)]">
          Loading desk…
        </div>
      </Panel>
    );
  }

  // ---- derived numbers ----------------------------------------------------
  const priceMap: Record<string, number> = {};
  for (const sym of Object.keys(quotes)) {
    const p = quotes[sym]?.price;
    if (p != null) priceMap[sym] = p;
  }
  const invested = holdingsValue(state, priceMap);
  const totalEquity = equity(state, priceMap);
  const totalPnl = totalEquity - state.startingCash;
  const totalPnlPct = (totalPnl / state.startingCash) * 100;
  const basis = costBasis(state);
  const unrealized = invested - basis;

  let dayPnl = 0;
  for (const p of state.positions) {
    const q = quotes[p.symbol];
    if (q?.price != null && q.changePct != null) {
      const prevClose = q.price / (1 + q.changePct / 100);
      dayPnl += p.qty * (q.price - prevClose);
    }
  }

  const openOrders = state.orders.filter((o) => o.status === "open");
  const closedOrders = state.orders.filter((o) => o.status !== "open");

  const ticketSym = symbol.trim().toUpperCase();
  const ticketQuote = ticketSym ? quotes[ticketSym] : undefined;
  const qty = Number(qtyStr);
  const limitPrice = Number(limitStr);
  const estPrice = orderType === "limit" ? limitPrice : ticketQuote?.price ?? null;
  const estCost = estPrice != null && qty > 0 ? qty * estPrice : null;

  // ---- actions ------------------------------------------------------------
  function flash(kind: "ok" | "err", text: string) {
    setMsg({ kind, text });
  }

  function submitOrder() {
    if (!state) return;
    const sym = ticketSym;
    if (!sym) return flash("err", "Enter a ticker.");
    if (!(qty > 0)) return flash("err", "Enter a positive quantity.");

    if (orderType === "limit") {
      if (!(limitPrice > 0)) return flash("err", "Enter a limit price.");
      const res = placeLimit(state, {
        side,
        symbol: sym,
        qty,
        limitPrice,
        ts: nowIso(),
        id: newId(),
      });
      if (!res.ok) return flash("err", res.error);
      setState(snapshotToday(res.state, priceMap, todayUtc()));
      flash("ok", `Limit ${side} ${qtyFmt(qty)} ${sym} @ ${usd(limitPrice)} queued.`);
      setQtyStr("");
      setLimitStr("");
      // Pull it once so it can fill immediately if already through the level.
      setTimeout(refresh, 50);
      return;
    }

    const px = ticketQuote?.price;
    if (px == null) return flash("err", "No live price yet — hit refresh and retry.");
    const res = fillMarket(state, { side, symbol: sym, qty, price: px, ts: nowIso(), id: newId() });
    if (!res.ok) return flash("err", res.error);
    setState(snapshotToday(res.state, priceMap, todayUtc()));
    flash("ok", `${side === "buy" ? "Bought" : "Sold"} ${qtyFmt(qty)} ${sym} @ ${usd(px)}.`);
    setQtyStr("");
  }

  function closePosition(sym: string) {
    if (!state) return;
    const pos = positionFor(state, sym);
    const px = quotes[sym]?.price;
    if (!pos) return;
    if (px == null) return flash("err", `No live price for ${sym} — try refresh.`);
    const res = fillMarket(state, {
      side: "sell",
      symbol: sym,
      qty: pos.qty,
      price: px,
      ts: nowIso(),
      id: newId(),
    });
    if (!res.ok) return flash("err", res.error);
    setState(snapshotToday(res.state, priceMap, todayUtc()));
    flash("ok", `Closed ${sym} @ ${usd(px)}.`);
  }

  function cancel(id: string) {
    if (!state) return;
    setState(cancelOrder(state, id, nowIso()));
  }

  function resetDesk() {
    const cash = Number(cashInput);
    const start = Number.isFinite(cash) && cash > 0 ? cash : DEFAULT_CASH;
    if (
      !confirm(
        `Reset the desk to ${usd(start, 0)} cash? This clears all positions, orders, and history.`,
      )
    )
      return;
    setState(createDesk(start, nowIso()));
    setQuotes({});
    flash("ok", `Desk reset to ${usd(start, 0)}.`);
  }

  const tileBorder = "border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5";

  return (
    <div className="space-y-1">
      {/* ---- Summary tiles ---- */}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
        <div className={tileBorder}>
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Total Equity
          </div>
          <div className="mt-0.5 font-mono text-[18px] font-bold tabular-nums text-[var(--foreground)]">
            {usd(totalEquity, 0)}
          </div>
        </div>
        <div className={tileBorder}>
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Total P&L
          </div>
          <div className={`mt-0.5 font-mono text-[18px] font-bold tabular-nums ${pctClass(totalPnl)}`}>
            {totalPnl >= 0 ? "+" : ""}
            {usd(totalPnl, 0)}
          </div>
          <div className={`font-mono text-[10px] ${pctClass(totalPnl)}`}>
            {totalPnl >= 0 ? "+" : ""}
            {totalPnlPct.toFixed(2)}%
          </div>
        </div>
        <div className={tileBorder}>
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Day P&L
          </div>
          <div className={`mt-0.5 font-mono text-[18px] font-bold tabular-nums ${pctClass(dayPnl)}`}>
            {dayPnl >= 0 ? "+" : ""}
            {usd(dayPnl, 0)}
          </div>
        </div>
        <div className={tileBorder}>
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Cash
          </div>
          <div className="mt-0.5 font-mono text-[18px] font-bold tabular-nums text-[var(--foreground)]">
            {usd(state.cash, 0)}
          </div>
        </div>
        <div className={tileBorder}>
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Invested
          </div>
          <div className="mt-0.5 font-mono text-[18px] font-bold tabular-nums text-[var(--foreground)]">
            {usd(invested, 0)}
          </div>
          <div className={`font-mono text-[10px] ${pctClass(unrealized)}`}>
            {unrealized >= 0 ? "+" : ""}
            {usd(unrealized, 0)} unreal.
          </div>
        </div>
        <div className={tileBorder}>
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Realized P&L
          </div>
          <div className={`mt-0.5 font-mono text-[18px] font-bold tabular-nums ${pctClass(state.realizedPnL)}`}>
            {state.realizedPnL >= 0 ? "+" : ""}
            {usd(state.realizedPnL, 0)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1 lg:grid-cols-12">
        {/* ---- Order ticket ---- */}
        <div className="lg:col-span-4">
          <Panel
            code="TICKET"
            title="Order Ticket"
            meta={
              <button
                type="button"
                onClick={refresh}
                className="font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] hover:text-[var(--amber)]"
              >
                {refreshing ? "…" : "↻ refresh"}
              </button>
            }
          >
            <div className="space-y-2 p-2 font-mono">
              {/* side toggle */}
              <div className="grid grid-cols-2 gap-1">
                {(["buy", "sell"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    className={`border px-2 py-1 text-[11px] uppercase tracking-widest ${
                      side === s
                        ? s === "buy"
                          ? "border-[var(--up)] bg-[rgba(34,197,94,0.1)] text-[var(--up)]"
                          : "border-[var(--down)] bg-[rgba(239,68,68,0.1)] text-[var(--down)]"
                        : "border-[var(--border)] text-[var(--dim)]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* symbol */}
              <label className="block">
                <span className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                  Ticker
                </span>
                <input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="AAPL, BTC-USD, GC=F…"
                  className="mt-0.5 w-full border border-[var(--border)] bg-black px-2 py-1 text-[13px] uppercase text-[var(--foreground)] placeholder:normal-case placeholder:text-[var(--dim)] focus:border-[var(--amber)] focus:outline-none"
                />
              </label>

              {/* live quote preview */}
              <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-1 text-[11px]">
                {ticketQuote ? (
                  ticketQuote.price != null ? (
                    <>
                      <span className="truncate text-[var(--dim)]">
                        {ticketQuote.name ?? ticketSym}
                      </span>
                      <span className="ml-2 shrink-0 tabular-nums text-[var(--foreground)]">
                        {usd(ticketQuote.price)}{" "}
                        {ticketQuote.changePct != null && (
                          <span className={pctClass(ticketQuote.changePct)}>
                            {ticketQuote.changePct >= 0 ? "+" : ""}
                            {ticketQuote.changePct.toFixed(2)}%
                          </span>
                        )}
                      </span>
                    </>
                  ) : (
                    <span className="text-[var(--down)]">No quote — check the symbol</span>
                  )
                ) : (
                  <span className="text-[var(--dim)]">Enter a ticker for a live quote</span>
                )}
              </div>

              {/* order type */}
              <div className="grid grid-cols-2 gap-1">
                {(["market", "limit"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setOrderType(t)}
                    className={`border px-2 py-1 text-[10px] uppercase tracking-widest ${
                      orderType === t
                        ? "border-[var(--amber)] text-[var(--amber)]"
                        : "border-[var(--border)] text-[var(--dim)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* qty + limit */}
              <div className="grid grid-cols-2 gap-1">
                <label className="block">
                  <span className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                    Quantity
                  </span>
                  <input
                    value={qtyStr}
                    onChange={(e) => setQtyStr(e.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                    className="mt-0.5 w-full border border-[var(--border)] bg-black px-2 py-1 text-[13px] tabular-nums text-[var(--foreground)] focus:border-[var(--amber)] focus:outline-none"
                  />
                </label>
                {orderType === "limit" && (
                  <label className="block">
                    <span className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                      Limit price
                    </span>
                    <input
                      value={limitStr}
                      onChange={(e) => setLimitStr(e.target.value)}
                      inputMode="decimal"
                      placeholder="0.00"
                      className="mt-0.5 w-full border border-[var(--border)] bg-black px-2 py-1 text-[13px] tabular-nums text-[var(--foreground)] focus:border-[var(--amber)] focus:outline-none"
                    />
                  </label>
                )}
              </div>

              {estCost != null && (
                <div className="flex justify-between text-[10px] text-[var(--dim)]">
                  <span>Est. {side === "buy" ? "cost" : "proceeds"}</span>
                  <span className="tabular-nums text-[var(--foreground)]">{usd(estCost)}</span>
                </div>
              )}

              <button
                type="button"
                onClick={submitOrder}
                className={`w-full border px-2 py-1.5 text-[12px] font-bold uppercase tracking-widest ${
                  side === "buy"
                    ? "border-[var(--up)] bg-[rgba(34,197,94,0.12)] text-[var(--up)] hover:bg-[rgba(34,197,94,0.2)]"
                    : "border-[var(--down)] bg-[rgba(239,68,68,0.12)] text-[var(--down)] hover:bg-[rgba(239,68,68,0.2)]"
                }`}
              >
                {orderType === "limit" ? `Place ${side} limit` : `${side} at market`}
              </button>

              {msg && (
                <div
                  className={`text-[10px] ${
                    msg.kind === "ok" ? "text-[var(--up)]" : "text-[var(--down)]"
                  }`}
                >
                  {msg.text}
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* ---- Equity curve ---- */}
        <div className="lg:col-span-8">
          <Panel
            code="EQTY"
            title="Equity Curve"
            learn="Your paper account's total value (cash + positions marked at the live price) snapshotted once per day. The dashed line is your starting cash. Stored in this browser only."
            meta={<span>{state.history.length} DAYS · START {usd(state.startingCash, 0)}</span>}
          >
            <PaperDeskChart points={state.history} startingCash={state.startingCash} />
          </Panel>
        </div>
      </div>

      {/* ---- Positions ---- */}
      <Panel code="POS" title="Positions" meta={<span>{state.positions.length} OPEN</span>}>
        {state.positions.length === 0 ? (
          <div className="p-3 text-center font-mono text-[11px] text-[var(--dim)]">
            No open positions. Use the ticket to buy something.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[11px] term-table">
              <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
                <tr>
                  <th className="px-2 py-1 text-left font-normal">Symbol</th>
                  <th className="px-2 py-1 text-right font-normal">Qty</th>
                  <th className="px-2 py-1 text-right font-normal">Avg Cost</th>
                  <th className="px-2 py-1 text-right font-normal">Last</th>
                  <th className="px-2 py-1 text-right font-normal">Mkt Value</th>
                  <th className="px-2 py-1 text-right font-normal">Unreal P&L</th>
                  <th className="px-2 py-1 text-right font-normal">Weight</th>
                  <th className="px-2 py-1 text-right font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {state.positions.map((p) => {
                  const q = quotes[p.symbol];
                  const last = q?.price ?? null;
                  const mv = last != null ? p.qty * last : p.qty * p.avgCost;
                  const pnl = positionPnL(p, last);
                  const weight = totalEquity > 0 ? (mv / totalEquity) * 100 : 0;
                  return (
                    <tr key={p.symbol} className="border-t border-[var(--border)]">
                      <td className="px-2 py-1 font-bold text-[var(--foreground)]">{p.symbol}</td>
                      <td className="px-2 py-1 text-right tabular-nums text-[var(--foreground)]">
                        {qtyFmt(p.qty)}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums text-[var(--dim)]">
                        {usd(p.avgCost)}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums text-[var(--foreground)]">
                        {last != null ? usd(last) : "—"}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums text-[var(--foreground)]">
                        {usd(mv, 0)}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {pnl ? (
                          <span className={pctClass(pnl.abs)}>
                            {pnl.abs >= 0 ? "+" : ""}
                            {usd(pnl.abs, 0)}{" "}
                            <span className="text-[10px]">
                              ({pnl.pct >= 0 ? "+" : ""}
                              {pnl.pct.toFixed(1)}%)
                            </span>
                          </span>
                        ) : (
                          <span className="text-[var(--dim)]">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums text-[var(--dim)]">
                        {weight.toFixed(1)}%
                      </td>
                      <td className="px-2 py-1 text-right">
                        <button
                          type="button"
                          onClick={() => closePosition(p.symbol)}
                          className="border border-[var(--border-strong)] px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-[var(--dim)] hover:border-[var(--down)] hover:text-[var(--down)]"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ---- Open orders ---- */}
      {openOrders.length > 0 && (
        <Panel code="OPEN" title="Working Orders" meta={<span>{openOrders.length} OPEN</span>}>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[11px] term-table">
              <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
                <tr>
                  <th className="px-2 py-1 text-left font-normal">Side</th>
                  <th className="px-2 py-1 text-left font-normal">Symbol</th>
                  <th className="px-2 py-1 text-right font-normal">Qty</th>
                  <th className="px-2 py-1 text-right font-normal">Limit</th>
                  <th className="px-2 py-1 text-right font-normal">Last</th>
                  <th className="px-2 py-1 text-left font-normal">Placed</th>
                  <th className="px-2 py-1 text-right font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {openOrders.map((o) => (
                  <tr key={o.id} className="border-t border-[var(--border)]">
                    <td
                      className={`px-2 py-1 uppercase ${
                        o.side === "buy" ? "text-[var(--up)]" : "text-[var(--down)]"
                      }`}
                    >
                      {o.side}
                    </td>
                    <td className="px-2 py-1 font-bold text-[var(--foreground)]">{o.symbol}</td>
                    <td className="px-2 py-1 text-right tabular-nums text-[var(--foreground)]">
                      {qtyFmt(o.qty)}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-[var(--amber)]">
                      {o.limitPrice != null ? usd(o.limitPrice) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-[var(--dim)]">
                      {quotes[o.symbol]?.price != null ? usd(quotes[o.symbol]!.price!) : "—"}
                    </td>
                    <td className="px-2 py-1 text-[var(--dim)]">{o.ts.slice(0, 10)}</td>
                    <td className="px-2 py-1 text-right">
                      <button
                        type="button"
                        onClick={() => cancel(o.id)}
                        className="border border-[var(--border-strong)] px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-[var(--dim)] hover:border-[var(--down)] hover:text-[var(--down)]"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ---- Blotter ---- */}
      <Panel code="BLOT" title="Order History">
        {closedOrders.length === 0 ? (
          <div className="p-3 text-center font-mono text-[11px] text-[var(--dim)]">
            No filled or canceled orders yet.
          </div>
        ) : (
          <div className="max-h-[320px] overflow-y-auto">
            <table className="w-full font-mono text-[11px] term-table">
              <thead className="sticky top-0 bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
                <tr>
                  <th className="px-2 py-1 text-left font-normal">When</th>
                  <th className="px-2 py-1 text-left font-normal">Side</th>
                  <th className="px-2 py-1 text-left font-normal">Type</th>
                  <th className="px-2 py-1 text-left font-normal">Symbol</th>
                  <th className="px-2 py-1 text-right font-normal">Qty</th>
                  <th className="px-2 py-1 text-right font-normal">Fill</th>
                  <th className="px-2 py-1 text-left font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {closedOrders.map((o) => (
                  <tr key={o.id} className="border-t border-[var(--border)]">
                    <td className="px-2 py-1 text-[var(--dim)]">
                      {(o.filledAt ?? o.ts).slice(0, 10)}
                    </td>
                    <td
                      className={`px-2 py-1 uppercase ${
                        o.side === "buy" ? "text-[var(--up)]" : "text-[var(--down)]"
                      }`}
                    >
                      {o.side}
                    </td>
                    <td className="px-2 py-1 uppercase text-[var(--dim)]">{o.type}</td>
                    <td className="px-2 py-1 font-bold text-[var(--foreground)]">{o.symbol}</td>
                    <td className="px-2 py-1 text-right tabular-nums text-[var(--foreground)]">
                      {qtyFmt(o.qty)}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-[var(--foreground)]">
                      {o.fillPrice != null ? usd(o.fillPrice) : "—"}
                    </td>
                    <td
                      className={`px-2 py-1 uppercase ${
                        o.status === "filled" ? "text-[var(--up)]" : "text-[var(--down)]"
                      }`}
                      title={o.note}
                    >
                      {o.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ---- Settings ---- */}
      <Panel code="SET" title="Desk Settings">
        <div className="flex flex-wrap items-end gap-3 p-2 font-mono">
          <label className="block">
            <span className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
              Starting cash (on reset)
            </span>
            <input
              value={cashInput}
              onChange={(e) => setCashInput(e.target.value)}
              inputMode="numeric"
              className="mt-0.5 w-40 border border-[var(--border)] bg-black px-2 py-1 text-[13px] tabular-nums text-[var(--foreground)] focus:border-[var(--amber)] focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={resetDesk}
            className="border border-[var(--border-strong)] px-3 py-1 text-[11px] uppercase tracking-widest text-[var(--dim)] hover:border-[var(--down)] hover:text-[var(--down)]"
          >
            Reset desk
          </button>
          <p className="max-w-md text-[10px] leading-snug text-[var(--dim)]">
            This desk is paper money, stored only in this browser. Limit orders fill on the
            next price refresh once the market trades through your level. Not investment
            advice.
          </p>
        </div>
      </Panel>
    </div>
  );
}
