// Pure types/constants for chart timeframes. No server-only imports so this
// file is safe to use from client components.

export type ChartRange = "1D" | "5D" | "1M" | "3M" | "1Y" | "5Y" | "ALL";

export const CHART_RANGES: ChartRange[] = ["1D", "5D", "1M", "3M", "1Y", "5Y", "ALL"];

/** Ranges where each data point is a partial trading day (need time display). */
export const INTRADAY_RANGES: ReadonlySet<ChartRange> = new Set(["1D", "5D"]);

/** Bar sizes the chart can draw. */
export type ChartInterval = "5m" | "30m" | "1h" | "1d" | "1wk" | "1mo";

/** How a bar size is written in the UI. */
export const INTERVAL_LABELS: Record<ChartInterval, string> = {
  "5m": "5-minute",
  "30m": "30-minute",
  "1h": "hourly",
  "1d": "daily",
  "1wk": "weekly",
  "1mo": "monthly",
};

/**
 * Short form for the picker. Lower case on purpose: the range buttons sit
 * immediately to the left in upper case, and "1D" the window next to "1D" the
 * bar size was unreadable. "1d" beside "1D" is a visible distinction, and the
 * group carries a "bars" label besides.
 */
export const INTERVAL_SHORT: Record<ChartInterval, string> = {
  "5m": "5m",
  "30m": "30m",
  "1h": "1h",
  "1d": "1d",
  "1wk": "1w",
  "1mo": "1mo",
};

/** Intervals that mean "part of a trading day" — the ones needing a clock. */
const INTRADAY_INTERVALS: ReadonlySet<ChartInterval> = new Set(["5m", "30m", "1h"]);

export function isIntradayInterval(i: ChartInterval): boolean {
  return INTRADAY_INTERVALS.has(i);
}

/**
 * Which bar sizes each window may be drawn at, first entry being the default.
 *
 * Bounded at both ends, and both bounds are real:
 *
 * Upstream, Yahoo simply refuses some pairs — 30-minute bars stop at 60 days,
 * hourly at 730 — so 3M/30m and 5Y/1h return an error, not a short series.
 * Verified against the live feed rather than assumed.
 *
 * Downstream, a request can succeed and still be useless: 1Y at hourly is 2,061
 * bars and 1M at 5-minute is 1,920, which paint a solid wall a few pixels wide
 * per bar. Those are left out even though the feed would serve them.
 */
export const RANGE_INTERVALS: Record<ChartRange, ChartInterval[]> = {
  "1D": ["5m", "30m", "1h"],
  "5D": ["30m", "5m", "1h"],
  "1M": ["1d", "30m", "1h"],
  "3M": ["1d", "1h", "1wk"],
  "1Y": ["1d", "1wk"],
  "5Y": ["1wk", "1d", "1mo"],
  ALL: ["1mo", "1wk"],
};

export function defaultInterval(range: ChartRange): ChartInterval {
  return RANGE_INTERVALS[range][0];
}

/** The requested interval if the range allows it, else that range's default. */
export function resolveInterval(
  range: ChartRange,
  interval: string | null | undefined,
): ChartInterval {
  const allowed = RANGE_INTERVALS[range];
  return allowed.includes(interval as ChartInterval)
    ? (interval as ChartInterval)
    : allowed[0];
}

export type ChartPoint = {
  date: string;
  close: number;
  /** Open/High/Low — present when fetched via getChartSeries; needed for
   *  candlestick rendering. Optional so line-only consumers ignore them. */
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
};

/**
 * % change to display alongside the price for the currently selected range:
 *   - 1D: today's quote change (matches Yahoo's "% change today")
 *   - 5D / 1M / 3M / 1Y / 5Y / ALL: (last − first) / first × 100 across the
 *     visible series, so the number always reflects the window the user picked.
 */
export function pctForRange(
  range: ChartRange,
  series: ChartPoint[],
  todayPct: number | null,
): number | null {
  if (range === "1D") return todayPct;
  if (series.length < 2) return null;
  const first = series[0].close;
  const last = series[series.length - 1].close;
  if (first === 0) return null;
  return ((last - first) / first) * 100;
}
