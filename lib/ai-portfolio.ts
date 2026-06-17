import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// The AI Conviction Book — the model's *own* paper portfolio. Unlike the
// browser-local Paper Desk (components/paper-desk.tsx), this is a single
// server-side, committed source of truth that every visitor sees: the AI starts
// with $1,000,000 and makes documented buy/hold/sell calls over time, grounded
// in the same daily analysis that drives the dossiers. The daily cloud routine
// appends to data/ai-portfolio/portfolio.json (new decisions, updated stances,
// one equity mark per day); the page marks positions to live prices at render.
// ---------------------------------------------------------------------------

export type AiCategory =
  | "ai-semis"
  | "big-tech"
  | "crypto"
  | "financials"
  | "consumer";

/** Current stance on a held position (or an action in the decision log). */
export type AiLean = "buy" | "add" | "hold" | "trim" | "sell";

export type AiConviction = "low" | "medium" | "high";

export type AiHolding = {
  symbol: string;
  name: string;
  qty: number;
  /** Average cost basis per share/coin (USD). */
  avgCost: number;
  category: AiCategory;
  /** The AI's current stance on the position. */
  lean: AiLean;
  /** Why it's in the book. */
  thesis: string;
  /** Date first bought (YYYY-MM-DD). */
  opened: string;
};

/** One dated entry in the running activity log of the AI's calls. */
export type AiDecision = {
  date: string;
  action: AiLean;
  symbol: string;
  name: string;
  qty?: number;
  price?: number;
  conviction: AiConviction;
  rationale: string;
};

/** One daily snapshot of the book's value — the track-record curve. */
export type EquityMark = {
  date: string;
  equity: number;
  cash: number;
  invested: number;
};

export type AiPortfolio = {
  version: 1;
  name: string;
  /** Inception date (YYYY-MM-DD). */
  inception: string;
  startingCash: number;
  cash: number;
  realizedPnL: number;
  /** ISO timestamp of the last update. */
  updated: string;
  /** The current market read driving the book. */
  outlook: string;
  positions: AiHolding[];
  /** Newest first. */
  decisions: AiDecision[];
  /** Chronological (oldest → newest). */
  equity: EquityMark[];
};

const DATA_DIR = path.resolve(process.cwd(), "data");

export function getAiPortfolio(): AiPortfolio | null {
  try {
    const raw = fs.readFileSync(
      path.join(DATA_DIR, "ai-portfolio", "portfolio.json"),
      "utf-8",
    );
    const parsed = JSON.parse(raw) as AiPortfolio;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export type PriceMap = Record<string, number>;

/** Cost basis of all open positions. */
export function costBasis(positions: AiHolding[]): number {
  return positions.reduce((s, p) => s + p.qty * p.avgCost, 0);
}

/**
 * Market value of holdings using whatever live prices we have; positions
 * without a price fall back to cost so equity never silently drops to zero.
 */
export function holdingsValue(positions: AiHolding[], prices: PriceMap): number {
  return positions.reduce((s, p) => {
    const px = prices[p.symbol];
    return s + (px != null ? p.qty * px : p.qty * p.avgCost);
  }, 0);
}

export function liveEquity(
  portfolio: AiPortfolio,
  prices: PriceMap,
): number {
  return portfolio.cash + holdingsValue(portfolio.positions, prices);
}

/** Unrealized P&L for one position at a given price. */
export function positionPnL(
  p: AiHolding,
  price: number | null,
): { abs: number; pct: number } | null {
  if (price == null || p.avgCost <= 0) return null;
  return {
    abs: (price - p.avgCost) * p.qty,
    pct: (price / p.avgCost - 1) * 100,
  };
}
