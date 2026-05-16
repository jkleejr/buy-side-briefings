import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

export type LiveQuote = {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
};

const TICKER_STRIP: Array<{ symbol: string; label: string }> = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^NDX", label: "NDX" },
  { symbol: "^VIX", label: "VIX" },
  { symbol: "^TNX", label: "10Y" },
  { symbol: "DX-Y.NYB", label: "DXY" },
  { symbol: "BTC-USD", label: "BTC" },
  { symbol: "ETH-USD", label: "ETH" },
  { symbol: "GC=F", label: "Gold" },
  { symbol: "CL=F", label: "WTI" },
];

type YQuote = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
};

export async function getTickerStrip(): Promise<LiveQuote[]> {
  const symbols = TICKER_STRIP.map((t) => t.symbol);
  try {
    const results = (await yahooFinance.quote(symbols)) as YQuote | YQuote[];
    const arr: YQuote[] = Array.isArray(results) ? results : [results];
    return TICKER_STRIP.map((t) => {
      const q = arr.find((r) => r?.symbol === t.symbol);
      return {
        symbol: t.symbol,
        label: t.label,
        price: q?.regularMarketPrice ?? null,
        change: q?.regularMarketChange ?? null,
        changePct: q?.regularMarketChangePercent ?? null,
      };
    });
  } catch (err) {
    console.error("[markets] ticker strip fetch failed:", err);
    return TICKER_STRIP.map((t) => ({
      symbol: t.symbol,
      label: t.label,
      price: null,
      change: null,
      changePct: null,
    }));
  }
}

export type SparkPoint = { t: number; price: number };

export async function getSparkline(
  symbol: string,
  range: "1d" | "5d" | "1mo" | "3mo" | "1y" = "5d",
): Promise<SparkPoint[]> {
  try {
    const interval = range === "1d" ? "5m" : range === "5d" ? "30m" : range === "1mo" ? "1d" : "1d";
    const result = (await yahooFinance.chart(symbol, {
      period1: rangeToStart(range),
      interval,
    })) as { quotes?: Array<{ date?: Date; close?: number | null }> };
    const quotes = result?.quotes ?? [];
    return quotes
      .filter((q): q is { date: Date; close: number } => q.close != null && q.date != null)
      .map((q) => ({ t: q.date.getTime(), price: q.close }));
  } catch (err) {
    console.error(`[markets] sparkline fetch failed for ${symbol}:`, err);
    return [];
  }
}

function rangeToStart(range: string): Date {
  const now = Date.now();
  const day = 86_400_000;
  switch (range) {
    case "1d":
      return new Date(now - 1 * day);
    case "5d":
      return new Date(now - 7 * day);
    case "1mo":
      return new Date(now - 31 * day);
    case "3mo":
      return new Date(now - 93 * day);
    case "1y":
      return new Date(now - 365 * day);
    default:
      return new Date(now - 7 * day);
  }
}

export type YieldLevels = {
  ust5y: number | null;
  ust10y: number | null;
  ust30y: number | null;
};

export async function getYieldLevels(): Promise<YieldLevels> {
  const symbols = ["^FVX", "^TNX", "^TYX"];
  try {
    const results = (await yahooFinance.quote(symbols)) as YQuote | YQuote[];
    const arr: YQuote[] = Array.isArray(results) ? results : [results];
    const find = (s: string) => arr.find((r) => r.symbol === s)?.regularMarketPrice ?? null;
    return { ust5y: find("^FVX"), ust10y: find("^TNX"), ust30y: find("^TYX") };
  } catch (err) {
    console.error("[markets] yield levels fetch failed:", err);
    return { ust5y: null, ust10y: null, ust30y: null };
  }
}

export type DailyClose = { date: string; close: number };

/**
 * Fetch daily closes for any Yahoo symbol over the requested window. Used for
 * the homepage asset charts and the track-record SPX chart. Adds a 30-day
 * forward pad so forward-return windows are queryable for recent verdicts.
 */
export async function getDailyCloses(
  symbol: string,
  monthsBack: number = 9,
): Promise<DailyClose[]> {
  try {
    const now = Date.now();
    const start = new Date(now - monthsBack * 31 * 86_400_000);
    const end = new Date(now + 30 * 86_400_000);
    const result = (await yahooFinance.chart(symbol, {
      period1: start,
      period2: end,
      interval: "1d",
    })) as { quotes?: Array<{ date?: Date; close?: number | null }> };
    const quotes = result?.quotes ?? [];
    return quotes
      .filter((q): q is { date: Date; close: number } => q.close != null && q.date != null)
      .map((q) => ({
        date: q.date.toISOString().slice(0, 10),
        close: q.close,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    console.error(`[markets] daily history fetch failed for ${symbol}:`, err);
    return [];
  }
}

export function getSpxDailyCloses(monthsBack: number = 9): Promise<DailyClose[]> {
  return getDailyCloses("^GSPC", monthsBack);
}

// ---- Unified range-based chart fetching ----------------------------------
// Used by every chart on the dashboard so the timeframe selector and the
// underlying data shape are consistent. Range type + constants are defined
// in chart-ranges.ts so client components can import them without dragging
// the (server-only) yahoo-finance2 dependency into the browser bundle.

export type { ChartRange } from "./chart-ranges";
export { CHART_RANGES } from "./chart-ranges";
import type { ChartRange } from "./chart-ranges";

const RANGE_PARAMS: Record<
  ChartRange,
  { days: number; interval: "5m" | "30m" | "1h" | "1d" | "1wk" | "1mo" }
> = {
  "1D": { days: 2, interval: "5m" }, // padded 2d so weekend doesn't return empty
  "5D": { days: 7, interval: "30m" },
  "1M": { days: 32, interval: "1d" },
  "3M": { days: 95, interval: "1d" },
  "1Y": { days: 370, interval: "1d" },
  "5Y": { days: 1830, interval: "1wk" },
  // ~40 years back at monthly resolution. Yahoo gracefully clips to the symbol's
  // actual start date (SPY 1993, GLD 2004, BTC 2014, etc.), so this is safe to
  // over-request — you just won't get bars before the asset existed.
  ALL: { days: 365 * 40, interval: "1mo" },
};

export async function getChartSeries(
  symbol: string,
  range: ChartRange,
): Promise<DailyClose[]> {
  const { days, interval } = RANGE_PARAMS[range];
  try {
    const now = Date.now();
    const start = new Date(now - days * 86_400_000);
    const result = (await yahooFinance.chart(symbol, {
      period1: start,
      interval: interval as never,
    })) as { quotes?: Array<{ date?: Date; close?: number | null }> };
    const quotes = result?.quotes ?? [];
    return quotes
      .filter((q): q is { date: Date; close: number } => q.close != null && q.date != null)
      .map((q) => ({
        // Keep full ISO datetime so intraday ranges retain the hour/minute.
        date: q.date.toISOString(),
        close: q.close,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    console.error(`[markets] chart series fetch failed for ${symbol} ${range}:`, err);
    return [];
  }
}

// ---- Earnings calendar (Yahoo quoteSummary calendarEvents) -----------------

export type UpcomingEarnings = {
  symbol: string;
  date: string; // ISO date (YYYY-MM-DD)
  /** Estimate for the upcoming report, if Yahoo provides one. */
  epsEstimate?: number;
  /** "amc" / "bmo" timing if Yahoo provides it, otherwise undefined. */
  timing?: string;
};

/**
 * Fetch upcoming earnings dates for a list of symbols. Returns only those with
 * a future earnings date within the next ~14 days. Sorted ascending by date.
 */
export async function getUpcomingEarnings(
  symbols: string[],
  daysAhead = 14,
): Promise<UpcomingEarnings[]> {
  const cutoff = Date.now() + daysAhead * 86_400_000;
  const results = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const sum = (await yahooFinance.quoteSummary(symbol, {
          modules: ["calendarEvents"],
        })) as {
          calendarEvents?: {
            earnings?: {
              earningsDate?: Date[];
              earningsCallDate?: Date[];
              earningsAverage?: number;
            };
          };
        };
        const dates = sum?.calendarEvents?.earnings?.earningsDate ?? [];
        // Yahoo often returns a range (2 dates). Take the earliest future one.
        const future = dates
          .map((d) => (d instanceof Date ? d : new Date(d)))
          .filter((d) => !isNaN(d.getTime()) && d.getTime() > Date.now() && d.getTime() < cutoff)
          .sort((a, b) => a.getTime() - b.getTime());
        if (future.length === 0) return null;
        return {
          symbol,
          date: future[0].toISOString().slice(0, 10),
          epsEstimate: sum?.calendarEvents?.earnings?.earningsAverage,
        } as UpcomingEarnings;
      } catch (err) {
        console.error(`[earnings] fetch failed for ${symbol}:`, err);
        return null;
      }
    }),
  );
  return results
    .filter((r): r is UpcomingEarnings => r !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getQuote(symbol: string): Promise<LiveQuote | null> {
  try {
    const q = (await yahooFinance.quote(symbol)) as YQuote | YQuote[];
    const item = Array.isArray(q) ? q[0] : q;
    return {
      symbol,
      label: symbol,
      price: item?.regularMarketPrice ?? null,
      change: item?.regularMarketChange ?? null,
      changePct: item?.regularMarketChangePercent ?? null,
    };
  } catch (err) {
    console.error(`[markets] quote fetch failed for ${symbol}:`, err);
    return null;
  }
}
