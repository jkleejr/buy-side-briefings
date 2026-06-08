import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "data");

// ---------------------------------------------------------------------------
// Single-asset daily dossier. Powers the dedicated /nvidia and /bitcoin pages:
// a once-per-day, investor-facing read that answers three questions up front —
//   1. Who made money today, the bulls (long/calls) or the bears (short/puts)?
//   2. What's the call right now — BUY, HOLD, or SELL?
//   3. Everything an investor needs to act on that: price, positioning, news,
//      outlook, the bull and bear case, levels, and upcoming catalysts.
// Each day is one JSON file at data/asset-daily/<asset>/<YYYY-MM-DD>.json.
// ---------------------------------------------------------------------------

export type AssetId = "nvda" | "btc" | "skhynix";

/** Who was paid in today's session. */
export type DayWinner = "bulls" | "bears" | "flat";

/** The standing call for today. */
export type TradeAction = "buy" | "hold" | "sell";

export type Conviction = "low" | "medium" | "high";

export type AssetSnapshot = {
  /** Last price (USD). */
  price: number;
  /** Today's percentage change vs. the prior close. */
  change_pct: number;
  /** Today's absolute change (USD), optional. */
  change_abs?: number;
  prev_close?: number;
  day_high?: number;
  day_low?: number;
  week52_high?: number;
  week52_low?: number;
  /** Free-form, pre-formatted (e.g. "228M sh", "$41B"). */
  volume?: string;
  /** Free-form, pre-formatted (e.g. "$4.4T"). */
  market_cap?: string;
  /** Optional extra rows, pre-formatted label/value pairs. */
  extra?: { label: string; value: string; tone?: "up" | "down" | "neutral" }[];
};

/** Options / derivatives positioning — "what traders are doing." */
export type Positioning = {
  /** At-the-money implied volatility, percent. */
  iv?: number;
  iv_note?: string;
  /** Put/call ratio (volume or OI). */
  put_call?: number;
  /** Pre-formatted, e.g. "1.1% of float" or "perp funding +0.01%". */
  short_interest?: string;
  /** Pre-formatted level, e.g. "$180" / "$60,000". */
  max_pain?: string;
  /** Narrative of notable flow seen today. */
  notable_flow?: string;
};

export type LevelKind = "support" | "resistance" | "pivot";
export type KeyLevel = { label: string; level: string; kind: LevelKind };

export type Catalyst = {
  date: string;
  label: string;
  importance: "high" | "medium" | "low";
};

export type NewsItem = {
  label: string;
  url?: string;
  source?: string;
  sentiment?: "positive" | "neutral" | "negative";
};

export type AssetDaily = {
  asset: AssetId;
  symbol: string;
  name: string;
  date: string;
  generated_at: string;
  is_seed?: boolean;
  /** Currency symbol for prices/levels (default "$"). e.g. "₩" for KRW names. */
  currency_symbol?: string;

  /** Who made money today and a one-line read of the session. */
  day_winner: DayWinner;
  day_summary: string;
  /** Optional explicit P&L framing for longs vs. shorts. */
  long_pnl?: string;
  short_pnl?: string;

  /** The standing investment decision. */
  decision: {
    action: TradeAction;
    conviction: Conviction;
    horizon: string;
    rationale: string;
  };

  snapshot: AssetSnapshot;
  positioning: Positioning;
  what_traders_are_doing: string;

  news: NewsItem[];

  outlook: {
    short_term: string;
    long_term: string;
  };

  bull_case: string[];
  bear_case: string[];
  key_levels: KeyLevel[];
  catalysts: Catalyst[];

  /** Optional long-form markdown deep-dive, rendered under the structured view. */
  analysis?: string;
};

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

/** All daily dossiers for an asset, newest first. */
export function getAssetDailySeries(asset: AssetId): AssetDaily[] {
  const dir = path.join(DATA_DIR, "asset-daily", asset);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const series = files
    .map((f) => readJson<AssetDaily>(path.join(dir, f)))
    .filter((d): d is AssetDaily => d !== null);
  return series.sort((a, b) => b.date.localeCompare(a.date));
}

export function getLatestAssetDaily(asset: AssetId): AssetDaily | null {
  return getAssetDailySeries(asset)[0] ?? null;
}
