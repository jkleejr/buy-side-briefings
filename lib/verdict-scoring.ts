import type { MarketsVerdict, VerdictCode } from "@/lib/data";
import type { DailyClose } from "@/lib/markets";

export type ReturnWindow = {
  trading_days: number;
  end_date: string | null;
  end_close: number | null;
  pct: number | null;
  pending: boolean;
};

export type VerdictScore = {
  base_date: string;
  base_close: number | null;
  d1: ReturnWindow;
  d5: ReturnWindow;
  d20: ReturnWindow;
  /** Right / wrong / neutral per window. null when no opinion (hold) or pending. */
  right_d1: boolean | null;
  right_d5: boolean | null;
  right_d20: boolean | null;
};

/**
 * Decide if a verdict was directionally correct given the SPX return over the
 * window. We score the high-conviction codes binary; "hold" is informational
 * only (returns null) because it isn't a directional call.
 */
function judge(code: VerdictCode, pct: number | null): boolean | null {
  if (pct === null) return null;
  switch (code) {
    case "buy":
      return pct > 0;
    case "bearish":
      return pct < 0;
    case "step_aside":
      // "Don't chase" — counts as right if you didn't miss meaningful upside
      // (i.e., SPX flat or down). Threshold: a +1% rally over the window is
      // small enough not to count as a missed buy.
      return pct <= 1;
    case "hold":
      return null;
  }
}

/**
 * Find the index of the first daily-close entry on or after `date`. Returns
 * -1 if no such entry exists in the series.
 */
function indexAtOrAfter(series: DailyClose[], date: string): number {
  for (let i = 0; i < series.length; i++) {
    if (series[i].date >= date) return i;
  }
  return -1;
}

function buildWindow(
  series: DailyClose[],
  baseIdx: number,
  baseClose: number,
  tradingDays: number,
): ReturnWindow {
  const target = baseIdx + tradingDays;
  if (target >= series.length) {
    return {
      trading_days: tradingDays,
      end_date: null,
      end_close: null,
      pct: null,
      pending: true,
    };
  }
  const endRow = series[target];
  const pct = ((endRow.close - baseClose) / baseClose) * 100;
  return {
    trading_days: tradingDays,
    end_date: endRow.date,
    end_close: endRow.close,
    pct,
    pending: false,
  };
}

export function scoreVerdict(
  verdict: MarketsVerdict,
  series: DailyClose[],
): VerdictScore {
  const empty = (): ReturnWindow => ({
    trading_days: 0,
    end_date: null,
    end_close: null,
    pct: null,
    pending: true,
  });

  if (series.length === 0) {
    return {
      base_date: verdict.date,
      base_close: null,
      d1: { ...empty(), trading_days: 1 },
      d5: { ...empty(), trading_days: 5 },
      d20: { ...empty(), trading_days: 20 },
      right_d1: null,
      right_d5: null,
      right_d20: null,
    };
  }

  const baseIdx = indexAtOrAfter(series, verdict.date);
  if (baseIdx === -1) {
    return {
      base_date: verdict.date,
      base_close: null,
      d1: { ...empty(), trading_days: 1 },
      d5: { ...empty(), trading_days: 5 },
      d20: { ...empty(), trading_days: 20 },
      right_d1: null,
      right_d5: null,
      right_d20: null,
    };
  }
  const base = series[baseIdx];
  const d1 = buildWindow(series, baseIdx, base.close, 1);
  const d5 = buildWindow(series, baseIdx, base.close, 5);
  const d20 = buildWindow(series, baseIdx, base.close, 20);
  return {
    base_date: base.date,
    base_close: base.close,
    d1,
    d5,
    d20,
    right_d1: judge(verdict.verdict.code, d1.pct),
    right_d5: judge(verdict.verdict.code, d5.pct),
    right_d20: judge(verdict.verdict.code, d20.pct),
  };
}

// ---- Aggregate stats over many scored verdicts -----------------------------

type WindowKey = "d1" | "d5" | "d20";
type RightKey = "right_d1" | "right_d5" | "right_d20";

export type CodeStats = {
  count: number;
  /** Wins, losses, pending counts at +5d (the headline window for hit-rate). */
  d5_right: number;
  d5_wrong: number;
  d5_pending: number;
  /** Average SPX return at +5d for completed windows of this code. */
  avg_d5_pct: number | null;
};

export type StreakInfo = {
  /** Length of the current run of identical results, looking at +5d outcomes
   *  in chronological order, oldest-to-newest. */
  length: number;
  /** "right" / "wrong" / "none" — none = no scored windows or alternating. */
  kind: "right" | "wrong" | "none";
};

export type BestWorstCall = {
  v: MarketsVerdict;
  pct: number; // +20d return associated with this call
};

export type AggregateStats = {
  /** Per-verdict-code rollup. Hold is included but its hit-rate fields stay 0. */
  by_code: Record<VerdictCode, CodeStats>;
  /** Current streak in the +5d window — right or wrong, in a row. */
  streak_d5: StreakInfo;
  /** The verdict that worked best by the +20d window. Null if none scored yet. */
  best_call: BestWorstCall | null;
  /** The verdict that worked worst by the +20d window. Null if none scored. */
  worst_call: BestWorstCall | null;
};

const EMPTY_CODE_STATS: CodeStats = {
  count: 0,
  d5_right: 0,
  d5_wrong: 0,
  d5_pending: 0,
  avg_d5_pct: null,
};

/**
 * Roll up directional outcomes across a list of scored verdicts. Conventions:
 *  - "right/wrong" is judged from the verdict-code direction (BUY right if up,
 *    BEARISH right if down, STEP ASIDE right if ≤1%). HOLD is informational.
 *  - "best/worst" is judged from the *direction-adjusted* +20d return:
 *      BUY → return as-is
 *      BEARISH → return negated (a -5% SPX move is a +5% win for a bearish call)
 *      STEP ASIDE → return negated (a -5% move is a "win" for stepping aside)
 *      HOLD → excluded (no opinion to grade)
 */
export function aggregateStats(
  scored: Array<{ v: MarketsVerdict; score: VerdictScore }>,
): AggregateStats {
  const by_code: Record<VerdictCode, CodeStats> = {
    buy: { ...EMPTY_CODE_STATS },
    hold: { ...EMPTY_CODE_STATS },
    step_aside: { ...EMPTY_CODE_STATS },
    bearish: { ...EMPTY_CODE_STATS },
  };

  const d5SumByCode: Record<VerdictCode, { sum: number; n: number }> = {
    buy: { sum: 0, n: 0 },
    hold: { sum: 0, n: 0 },
    step_aside: { sum: 0, n: 0 },
    bearish: { sum: 0, n: 0 },
  };

  // Best/worst tracking (in direction-adjusted +20d space).
  let best: BestWorstCall | null = null;
  let worst: BestWorstCall | null = null;

  // Sort oldest-to-newest for streak computation.
  const chrono = [...scored].sort((a, b) => a.v.date.localeCompare(b.v.date));

  for (const { v, score } of chrono) {
    const c = v.verdict.code;
    by_code[c].count += 1;

    // +5d hit-rate breakdown
    if (score.d5.pending) {
      by_code[c].d5_pending += 1;
    } else if (score.right_d5 === true) {
      by_code[c].d5_right += 1;
    } else if (score.right_d5 === false) {
      by_code[c].d5_wrong += 1;
    }

    // +5d average return (only completed windows, only for tracked codes)
    if (!score.d5.pending && score.d5.pct !== null) {
      d5SumByCode[c].sum += score.d5.pct;
      d5SumByCode[c].n += 1;
    }

    // Best/worst at +20d
    if (!score.d20.pending && score.d20.pct !== null && c !== "hold") {
      const dirAdjusted = c === "buy" ? score.d20.pct : -score.d20.pct;
      if (best === null || dirAdjusted > best.pct) {
        best = { v, pct: dirAdjusted };
      }
      if (worst === null || dirAdjusted < worst.pct) {
        worst = { v, pct: dirAdjusted };
      }
    }
  }

  // Finalize averages
  (Object.keys(by_code) as VerdictCode[]).forEach((c) => {
    const { sum, n } = d5SumByCode[c];
    if (n > 0) by_code[c].avg_d5_pct = sum / n;
  });

  // Streak: walk newest-to-oldest, count consecutive same-outcome +5d results.
  let streak: StreakInfo = { length: 0, kind: "none" };
  for (let i = chrono.length - 1; i >= 0; i--) {
    const r = chrono[i].score.right_d5;
    if (r === null) continue; // skip hold and pending
    if (streak.kind === "none") {
      streak = { length: 1, kind: r ? "right" : "wrong" };
    } else if ((r && streak.kind === "right") || (!r && streak.kind === "wrong")) {
      streak.length += 1;
    } else {
      break; // streak broken
    }
  }

  return { by_code, streak_d5: streak, best_call: best, worst_call: worst };
}
