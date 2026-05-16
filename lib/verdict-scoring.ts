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
