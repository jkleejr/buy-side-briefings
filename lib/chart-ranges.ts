// Pure types/constants for chart timeframes. No server-only imports so this
// file is safe to use from client components.

export type ChartRange = "1D" | "5D" | "1M" | "3M" | "1Y" | "5Y" | "ALL";

export const CHART_RANGES: ChartRange[] = ["1D", "5D", "1M", "3M", "1Y", "5Y", "ALL"];

/** Ranges where each data point is a partial trading day (need time display). */
export const INTRADAY_RANGES: ReadonlySet<ChartRange> = new Set(["1D", "5D"]);

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
