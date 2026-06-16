import type { KeyLevel } from "@/lib/asset-daily";

// ---------------------------------------------------------------------------
// Options helpers. Two jobs:
//   expectedMove        — the ~1σ price range implied by IV over N days, so you
//                         can see whether a target is even reachable.
//   suggestOptionStructure — turns the standing call + key levels into a
//                         defined-risk vertical spread (bull call / bear put):
//                         leverages the specific move with capped, known risk.
// No live options chain here, so premiums aren't invented — the structure,
// strikes, width, breakeven logic and expiry guidance are; the debit comes
// from a live quote.
// ---------------------------------------------------------------------------

function parseLevelNum(s: string): number | null {
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** ~1 standard-deviation move (absolute, in price) implied by IV over `days`. */
export function expectedMove(price: number, ivPct: number, days: number): number {
  return price * (ivPct / 100) * Math.sqrt(days / 365);
}

/** Round to a plausible listed strike increment for the price magnitude. */
export function strikeIncrement(price: number): number {
  if (price < 25) return 1;
  if (price < 100) return 2.5;
  if (price < 250) return 5;
  return 10;
}

function roundToStrike(x: number, inc: number): number {
  return Math.round(x / inc) * inc;
}

export type OptionStructure = {
  kind: "bull_call" | "bear_put";
  /** "call" | "put" — the option type used in both legs. */
  right: "call" | "put";
  conditional: boolean;
  longStrike: number;
  shortStrike: number;
  /** Max value of the spread at expiry (short − long for calls; long − short for puts). */
  width: number;
  /** The level the short leg is sold against (the directional target). */
  targetLevel: number;
  targetLabel: string;
  expiryHintDays: number;
  /** Expected (~1σ) move over the expiry horizon, if IV is known. */
  expectedMove: number | null;
  /** True when the target sits within ~1 expected move — i.e. realistically reachable. */
  withinExpectedMove: boolean | null;
  /** Implied volatility used, percent (for display). */
  ivPct: number | null;
};

/**
 * Suggest a defined-risk vertical spread from the dossier's standing call.
 *   buy / hold  → bull call debit spread (long ATM, short at nearest resistance)
 *   sell        → bear put  debit spread (long ATM, short at nearest support)
 * `hold` is returned as `conditional` (structure to put on if the lean confirms).
 * Returns null when there's no usable level on the target side.
 */
export function suggestOptionStructure(
  price: number,
  action: "buy" | "hold" | "sell",
  levels: KeyLevel[],
  opts: { ivPct?: number | null; horizonDays?: number } = {},
): OptionStructure | null {
  if (!(price > 0)) return null;
  const horizonDays = opts.horizonDays ?? 35;
  const ivPct = opts.ivPct ?? null;
  const inc = strikeIncrement(price);

  const parsed = levels
    .map((l) => ({ ...l, num: parseLevelNum(l.level) }))
    .filter((l): l is KeyLevel & { num: number } => l.num != null);

  const bullish = action === "buy" || action === "hold";

  let target: (KeyLevel & { num: number }) | undefined;
  if (bullish) {
    // nearest resistance above price (fall back to nearest level above)
    const above = parsed.filter((l) => l.num > price * 1.005);
    target =
      above.filter((l) => l.kind === "resistance").sort((a, b) => a.num - b.num)[0] ??
      above.sort((a, b) => a.num - b.num)[0];
  } else {
    const below = parsed.filter((l) => l.num < price * 0.995);
    target =
      below.filter((l) => l.kind === "support").sort((a, b) => b.num - a.num)[0] ??
      below.sort((a, b) => b.num - a.num)[0];
  }
  if (!target) return null;

  const longStrike = roundToStrike(price, inc);
  const shortStrike = roundToStrike(target.num, inc);
  const width = Math.abs(shortStrike - longStrike);
  if (width < inc) return null; // degenerate — target too close to round to a real spread

  const em = ivPct != null ? expectedMove(price, ivPct, horizonDays) : null;

  return {
    kind: bullish ? "bull_call" : "bear_put",
    right: bullish ? "call" : "put",
    conditional: action === "hold",
    longStrike,
    shortStrike,
    width,
    targetLevel: target.num,
    targetLabel: target.label,
    expiryHintDays: horizonDays,
    expectedMove: em,
    withinExpectedMove: em != null ? Math.abs(target.num - price) <= em : null,
    ivPct,
  };
}

// ---- Scenario payoff around a catalyst -----------------------------------

export type ScenarioLeg = {
  key: "bull" | "base" | "bear";
  label: string;
  price: number;
  /** Percent move from the current price. */
  pct: number;
  /** Approximate probability mass for this outcome (null when IV unknown). */
  prob: number | null;
};

export type ScenarioSet = {
  horizonDays: number;
  anchorLabel: string;
  expectedMove: number | null;
  byIV: boolean;
  longBias: boolean;
  legs: ScenarioLeg[];
};

/**
 * Bull / base / bear price scenarios into a catalyst. With IV, the bull/bear
 * legs are ±1σ (the ~68% range), tails ~16% each; without IV they fall back to
 * the nearest resistance/support. `longBias` is for the caller to translate a
 * price move into position P&L (a short profits on the bear leg).
 */
export function computeScenarios(
  price: number,
  action: "buy" | "hold" | "sell",
  levels: KeyLevel[],
  opts: { ivPct?: number | null; horizonDays: number; anchorLabel: string },
): ScenarioSet | null {
  if (!(price > 0)) return null;
  const ivPct = opts.ivPct ?? null;
  const em = ivPct != null ? expectedMove(price, ivPct, opts.horizonDays) : null;
  const byIV = em != null;

  const parsed = levels
    .map((l) => ({ num: parseLevelNum(l.level) }))
    .filter((l): l is { num: number } => l.num != null);
  const resAbove = parsed.filter((l) => l.num > price).sort((a, b) => a.num - b.num)[0];
  const supBelow = parsed.filter((l) => l.num < price).sort((a, b) => b.num - a.num)[0];

  const up = em != null ? price + em : (resAbove?.num ?? price * 1.06);
  const dn = em != null ? price - em : (supBelow?.num ?? price * 0.94);

  const legs: ScenarioLeg[] = [
    {
      key: "bull",
      label: byIV ? "Bull · +1σ" : "Bull · resistance",
      price: up,
      pct: ((up - price) / price) * 100,
      prob: byIV ? 16 : null,
    },
    {
      key: "base",
      label: byIV ? "Base · ~68%" : "Base · flat",
      price,
      pct: 0,
      prob: byIV ? 68 : null,
    },
    {
      key: "bear",
      label: byIV ? "Bear · −1σ" : "Bear · support",
      price: dn,
      pct: ((dn - price) / price) * 100,
      prob: byIV ? 16 : null,
    },
  ];

  return {
    horizonDays: opts.horizonDays,
    anchorLabel: opts.anchorLabel,
    expectedMove: em,
    byIV,
    longBias: action === "buy" || action === "hold",
    legs,
  };
}
