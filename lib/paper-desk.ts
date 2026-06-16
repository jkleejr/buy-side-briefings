// ---------------------------------------------------------------------------
// Paper-trading desk — pure state logic. No React, no localStorage, no clock:
// the caller passes in timestamps/ids/prices so every function is deterministic
// and unit-testable. The client component (components/paper-desk.tsx) owns
// persistence and the live-price feed; this file only knows how to mutate a
// portfolio correctly. Cash account, long-only (no shorting/margin), fractional
// quantities allowed (so crypto works).
// ---------------------------------------------------------------------------

export type DeskPosition = { symbol: string; qty: number; avgCost: number };

export type DeskOrder = {
  id: string;
  ts: string; // ISO when placed
  side: "buy" | "sell";
  symbol: string;
  qty: number;
  type: "market" | "limit";
  limitPrice?: number;
  status: "filled" | "open" | "canceled";
  fillPrice?: number;
  filledAt?: string; // ISO when filled/canceled
  note?: string; // e.g. why it was auto-canceled
};

export type EquityPoint = { date: string; equity: number };

export type DeskState = {
  version: 1;
  startingCash: number;
  cash: number;
  positions: DeskPosition[];
  orders: DeskOrder[];
  /** One equity snapshot per calendar day — the "track it over time" series. */
  history: EquityPoint[];
  realizedPnL: number;
  createdAt: string;
};

export type PriceMap = Record<string, number>;

export type FillResult =
  | { ok: true; state: DeskState }
  | { ok: false; error: string };

const HISTORY_CAP = 730; // ~2y of daily points

export function createDesk(startingCash: number, nowIso: string): DeskState {
  const cash = Number.isFinite(startingCash) && startingCash > 0 ? startingCash : 100_000;
  return {
    version: 1,
    startingCash: cash,
    cash,
    positions: [],
    orders: [],
    history: [],
    realizedPnL: 0,
    createdAt: nowIso,
  };
}

export function positionFor(state: DeskState, symbol: string): DeskPosition | undefined {
  return state.positions.find((p) => p.symbol === symbol);
}

/** Market value of holdings using whatever prices we have (unknown → skipped). */
export function holdingsValue(state: DeskState, prices: PriceMap): number {
  return state.positions.reduce((sum, p) => {
    const px = prices[p.symbol];
    return sum + (px != null ? p.qty * px : p.qty * p.avgCost);
  }, 0);
}

export function equity(state: DeskState, prices: PriceMap): number {
  return state.cash + holdingsValue(state, prices);
}

export function costBasis(state: DeskState): number {
  return state.positions.reduce((s, p) => s + p.qty * p.avgCost, 0);
}

/** Unrealized P&L for a single position at a given price. */
export function positionPnL(
  p: DeskPosition,
  price: number | null,
): { abs: number; pct: number } | null {
  if (price == null || p.avgCost <= 0) return null;
  return {
    abs: (price - p.avgCost) * p.qty,
    pct: (price / p.avgCost - 1) * 100,
  };
}

const EPS = 1e-6;

/**
 * Core cash/position mutation shared by market and limit fills. Long-only:
 * a sell can't exceed the held quantity. Returns a new state or an error.
 */
function applyFill(
  state: DeskState,
  side: "buy" | "sell",
  symbol: string,
  qty: number,
  price: number,
): FillResult {
  if (!(qty > 0)) return { ok: false, error: "Quantity must be positive." };
  if (!(price > 0)) return { ok: false, error: "No live price for that symbol." };

  if (side === "buy") {
    const cost = qty * price;
    if (cost > state.cash + EPS) {
      return { ok: false, error: "Insufficient cash for that order." };
    }
    const existing = positionFor(state, symbol);
    const newPositions = existing
      ? state.positions.map((p) =>
          p.symbol === symbol
            ? {
                symbol,
                qty: p.qty + qty,
                avgCost: (p.qty * p.avgCost + qty * price) / (p.qty + qty),
              }
            : p,
        )
      : [...state.positions, { symbol, qty, avgCost: price }];
    return {
      ok: true,
      state: { ...state, cash: state.cash - cost, positions: newPositions },
    };
  }

  // sell
  const existing = positionFor(state, symbol);
  if (!existing || existing.qty + EPS < qty) {
    return { ok: false, error: "You don't hold enough of that to sell." };
  }
  const proceeds = qty * price;
  const realized = (price - existing.avgCost) * qty;
  const remaining = existing.qty - qty;
  const newPositions =
    remaining > EPS
      ? state.positions.map((p) =>
          p.symbol === symbol ? { ...p, qty: remaining } : p,
        )
      : state.positions.filter((p) => p.symbol !== symbol);
  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash + proceeds,
      positions: newPositions,
      realizedPnL: state.realizedPnL + realized,
    },
  };
}

/** Execute an immediate market order at `price`, recording a filled order. */
export function fillMarket(
  state: DeskState,
  args: {
    side: "buy" | "sell";
    symbol: string;
    qty: number;
    price: number;
    ts: string;
    id: string;
  },
): FillResult {
  const res = applyFill(state, args.side, args.symbol, args.qty, args.price);
  if (!res.ok) return res;
  const order: DeskOrder = {
    id: args.id,
    ts: args.ts,
    side: args.side,
    symbol: args.symbol,
    qty: args.qty,
    type: "market",
    status: "filled",
    fillPrice: args.price,
    filledAt: args.ts,
  };
  return { ok: true, state: { ...res.state, orders: [order, ...res.state.orders] } };
}

/** Queue a limit order (status "open") after light validation. */
export function placeLimit(
  state: DeskState,
  args: {
    side: "buy" | "sell";
    symbol: string;
    qty: number;
    limitPrice: number;
    ts: string;
    id: string;
  },
): FillResult {
  if (!(args.qty > 0)) return { ok: false, error: "Quantity must be positive." };
  if (!(args.limitPrice > 0)) return { ok: false, error: "Limit price must be positive." };
  if (args.side === "sell") {
    const held = positionFor(state, args.symbol)?.qty ?? 0;
    if (held + EPS < args.qty) {
      return { ok: false, error: "Can't place a sell limit for more than you hold." };
    }
  }
  const order: DeskOrder = {
    id: args.id,
    ts: args.ts,
    side: args.side,
    symbol: args.symbol,
    qty: args.qty,
    type: "limit",
    limitPrice: args.limitPrice,
    status: "open",
  };
  return { ok: true, state: { ...state, orders: [order, ...state.orders] } };
}

export function cancelOrder(state: DeskState, id: string, ts: string): DeskState {
  return {
    ...state,
    orders: state.orders.map((o) =>
      o.id === id && o.status === "open"
        ? { ...o, status: "canceled", filledAt: ts, note: "Canceled by you" }
        : o,
    ),
  };
}

/**
 * Walk every open limit order against the current prices and fill the ones that
 * have crossed: a BUY fills when price ≤ limit, a SELL when price ≥ limit. Buys
 * fill at the better of price/limit; sells at the better of price/limit. Orders
 * that can no longer be afforded / covered are auto-canceled with a note.
 */
export function processLimitOrders(
  state: DeskState,
  prices: PriceMap,
  ts: string,
): { state: DeskState; filled: number } {
  let working = state;
  let filled = 0;
  // Oldest-first so earlier orders get first claim on cash/shares.
  const open = [...state.orders].filter((o) => o.status === "open").reverse();

  for (const o of open) {
    const px = prices[o.symbol];
    if (px == null) continue;
    const crosses = o.side === "buy" ? px <= o.limitPrice! : px >= o.limitPrice!;
    if (!crosses) continue;

    const fillPrice = o.side === "buy" ? Math.min(px, o.limitPrice!) : Math.max(px, o.limitPrice!);
    const res = applyFill(working, o.side, o.symbol, o.qty, fillPrice);
    if (res.ok) {
      filled += 1;
      working = {
        ...res.state,
        orders: res.state.orders.map((ord) =>
          ord.id === o.id
            ? { ...ord, status: "filled", fillPrice, filledAt: ts }
            : ord,
        ),
      };
    } else {
      working = {
        ...working,
        orders: working.orders.map((ord) =>
          ord.id === o.id
            ? { ...ord, status: "canceled", filledAt: ts, note: res.error }
            : ord,
        ),
      };
    }
  }
  return { state: working, filled };
}

/** Record/refresh today's equity snapshot for the over-time curve. */
export function snapshotToday(
  state: DeskState,
  prices: PriceMap,
  today: string,
): DeskState {
  const eq = equity(state, prices);
  const last = state.history[state.history.length - 1];
  let history: EquityPoint[];
  if (last && last.date === today) {
    history = state.history.slice(0, -1).concat({ date: today, equity: eq });
  } else {
    history = state.history.concat({ date: today, equity: eq });
  }
  if (history.length > HISTORY_CAP) history = history.slice(history.length - HISTORY_CAP);
  return { ...state, history };
}

/** Every symbol the desk needs a live price for. */
export function trackedSymbols(state: DeskState): string[] {
  const set = new Set<string>();
  state.positions.forEach((p) => set.add(p.symbol));
  state.orders.filter((o) => o.status === "open").forEach((o) => set.add(o.symbol));
  return [...set];
}
