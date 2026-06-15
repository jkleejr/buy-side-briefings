import type { Opportunity, OpportunityConviction } from "@/lib/data";

// ---------------------------------------------------------------------------
// Trade math — the profitability layer on top of the opportunities journal.
//   #1 computeTradePlan : risk-based position sizing + R-multiples per target
//   #2 expectancyStats  : win rate, payoff, profit factor, expectancy, Sharpe
//   #3 rankOpportunities: rank open ideas by expected value per unit of risk
// All pure functions over data the journal already carries (levels, size,
// conviction, outcome.return_pct) — no live calls, safe to run at render.
// ---------------------------------------------------------------------------

export function isLongish(direction: string): boolean {
  return direction === "long" || direction === "long_vol";
}

// ---- #1 Position sizing & reward-to-risk --------------------------------

export type TargetRR = { price: number; rMultiple: number; pct: number };

export type TradePlan = {
  direction: "long" | "short";
  entryMid: number;
  stop: number;
  /** Distance from entry to stop, as a percent of entry (the per-unit risk). */
  stopDistPct: number;
  targets: TargetRR[];
  /** Reward:risk to the first target, and to the furthest target. */
  firstRR: number | null;
  bestRR: number | null;
  /** The analyst's published size, and the book risk it actually implies. */
  statedSizePct: number;
  bookRiskAtStatedPct: number;
  /** Capital % to deploy so a stop-out costs exactly `riskBudgetPct` of book. */
  riskBudgetPct: number;
  suggestedSizePct: number;
};

/**
 * Turn a journal idea's numeric levels into a sized, R-multiplied plan.
 * Returns null when levels are missing or malformed (stop on the wrong side).
 * `riskBudgetPct` is the fraction of the book you're willing to lose if the
 * stop is hit (default 1%); `maxSizePct` caps the suggested allocation.
 */
export function computeTradePlan(
  o: Opportunity,
  riskBudgetPct = 1,
  maxSizePct = 25,
): TradePlan | null {
  const lv = o.levels;
  if (!lv || lv.stop == null) return null;
  const entryMid =
    lv.entry_low != null && lv.entry_high != null
      ? (lv.entry_low + lv.entry_high) / 2
      : (lv.entry_low ?? lv.entry_high ?? o.current_price ?? null);
  if (entryMid == null || entryMid <= 0) return null;

  const long = isLongish(o.direction);
  const risk = long ? entryMid - lv.stop : lv.stop - entryMid;
  if (!(risk > 0)) return null; // stop on the wrong side of entry — malformed

  const stopDistPct = (risk / entryMid) * 100;
  const targets: TargetRR[] = (lv.targets ?? []).map((price) => {
    const reward = long ? price - entryMid : entryMid - price;
    return { price, rMultiple: reward / risk, pct: (reward / entryMid) * 100 };
  });
  const rs = targets.map((t) => t.rMultiple).filter((r) => Number.isFinite(r));
  const statedSizePct = o.position_size_pct ?? 0;

  return {
    direction: long ? "long" : "short",
    entryMid,
    stop: lv.stop,
    stopDistPct,
    targets,
    firstRR: rs.length ? rs[0] : null,
    bestRR: rs.length ? Math.max(...rs) : null,
    statedSizePct,
    bookRiskAtStatedPct: (statedSizePct * stopDistPct) / 100,
    riskBudgetPct,
    suggestedSizePct: Math.min(maxSizePct, (riskBudgetPct / stopDistPct) * 100),
  };
}

// ---- #2 Edge & expectancy ------------------------------------------------

const CLOSED_STATUSES = ["target_hit", "stopped_out", "thesis_broken", "expired"];

function closedReturns(opps: Opportunity[]): number[] {
  return opps
    .filter(
      (o) =>
        o.outcome != null &&
        typeof o.outcome.return_pct === "number" &&
        CLOSED_STATUSES.includes(o.status),
    )
    .map((o) => o.outcome!.return_pct);
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Sample-std Sharpe over the trade-return series (per-trade, not annualized). */
function perTradeSharpe(returns: number[]): number | null {
  if (returns.length < 2) return null;
  const m = mean(returns);
  const variance = returns.reduce((a, b) => a + (b - m) ** 2, 0) / (returns.length - 1);
  const sd = Math.sqrt(variance);
  return sd > 0 ? m / sd : null;
}

export type ExpectancyStats = {
  n: number;
  wins: number;
  losses: number;
  winRatePct: number | null;
  avgWinPct: number | null;
  avgLossPct: number | null;
  /** avgWin / |avgLoss| — how many losses one win pays for. */
  payoffRatio: number | null;
  /** Σwins / |Σlosses| — > 1 means the strategy makes money. */
  profitFactor: number | null;
  /** Expected return per trade, percent. */
  expectancyPct: number | null;
  sharpe: number | null;
};

export function expectancyStats(opps: Opportunity[]): ExpectancyStats {
  const rs = closedReturns(opps);
  const n = rs.length;
  const winsArr = rs.filter((r) => r > 0);
  const lossArr = rs.filter((r) => r <= 0);
  const sumWin = winsArr.reduce((a, b) => a + b, 0);
  const sumLossAbs = Math.abs(lossArr.reduce((a, b) => a + b, 0));
  const avgWin = winsArr.length ? mean(winsArr) : null;
  const avgLoss = lossArr.length ? mean(lossArr) : null; // <= 0
  const payoff =
    avgWin != null && avgLoss != null && avgLoss !== 0 ? avgWin / Math.abs(avgLoss) : null;
  const profitFactor =
    sumLossAbs > 0 ? sumWin / sumLossAbs : sumWin > 0 ? Infinity : null;

  return {
    n,
    wins: winsArr.length,
    losses: lossArr.length,
    winRatePct: n ? (winsArr.length / n) * 100 : null,
    avgWinPct: avgWin,
    avgLossPct: avgLoss,
    payoffRatio: payoff,
    profitFactor,
    expectancyPct: n ? mean(rs) : null,
    sharpe: perTradeSharpe(rs),
  };
}

/** Expectancy split out per conviction bucket — does HIGH actually earn more? */
export function expectancyByConviction(
  opps: Opportunity[],
): { conv: OpportunityConviction; stats: ExpectancyStats }[] {
  return (["high", "medium", "low"] as OpportunityConviction[]).map((conv) => ({
    conv,
    stats: expectancyStats(opps.filter((o) => o.conviction === conv)),
  }));
}

// ---- #3 Ranking open ideas by expected value per unit of risk ------------

const PRIOR_WIN: Record<OpportunityConviction, number> = {
  high: 0.55,
  medium: 0.5,
  low: 0.42,
};

/**
 * Win probability per conviction, blending the journal's own realized hit rate
 * with a sensible prior (so a 1–2 trade sample doesn't dominate). Empirical
 * weight grows with the number of decided (win/loss) trades in the bucket.
 */
export function convictionWinProb(
  opps: Opportunity[],
): Record<OpportunityConviction, number> {
  const out = {} as Record<OpportunityConviction, number>;
  for (const conv of ["high", "medium", "low"] as OpportunityConviction[]) {
    const decided = opps.filter(
      (o) =>
        o.conviction === conv &&
        (o.status === "target_hit" ||
          o.status === "stopped_out" ||
          o.status === "thesis_broken"),
    );
    const wins = decided.filter((o) => o.status === "target_hit").length;
    const prior = PRIOR_WIN[conv];
    if (decided.length === 0) {
      out[conv] = prior;
    } else {
      // Shrink toward the prior with a strength of 4 pseudo-observations.
      const k = 4;
      out[conv] = (wins + prior * k) / (decided.length + k);
    }
  }
  return out;
}

export type RankedIdea = {
  o: Opportunity;
  plan: TradePlan;
  rr: number;
  winProb: number;
  /** Expected value in R: winProb·RR − (1−winProb)·1. >0 ⇒ positive edge. */
  evR: number;
};

/**
 * Rank the open ideas by expected value per unit of risk. Only ideas with a
 * valid numeric plan and at least one target are rankable.
 */
export function rankOpportunities(opps: Opportunity[]): RankedIdea[] {
  const winProbByConv = convictionWinProb(opps);
  const ranked: RankedIdea[] = [];
  for (const o of opps) {
    if (o.status !== "active" && o.status !== "triggered") continue;
    const plan = computeTradePlan(o);
    if (!plan || plan.bestRR == null || plan.bestRR <= 0) continue;
    const rr = plan.bestRR;
    const winProb = winProbByConv[o.conviction];
    const evR = winProb * rr - (1 - winProb);
    ranked.push({ o, plan, rr, winProb, evR });
  }
  return ranked.sort((a, b) => b.evR - a.evR || b.rr - a.rr);
}
