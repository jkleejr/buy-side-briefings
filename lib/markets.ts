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
  /** % change vs the 50-day moving average. A rough trend gauge. */
  avg50pct: number | null;
};

const TICKER_STRIP: Array<{ symbol: string; label: string }> = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^NDX", label: "NDX" },
  { symbol: "^VIX", label: "VIX" },
  { symbol: "^TNX", label: "10Y" },
  { symbol: "DX-Y.NYB", label: "DXY" },
  // Dollars per yen, so the number going up is the yen getting weaker. Labelled
  // as the pair rather than "Yen" for that reason — the same convention the
  // homepage chart switcher uses.
  { symbol: "JPY=X", label: "USD/JPY" },
  { symbol: "BTC-USD", label: "BTC" },
  { symbol: "GC=F", label: "Gold" },
  // WTI front-month — the barrel the briefings quote. Labelled "Oil" rather
  // than "WTI" so the row reads for someone who doesn't trade it.
  { symbol: "CL=F", label: "Oil" },
];

/** The quote fields that reconstruct a daily bar — see appendQuoteBar. */
type YQuoteBar = {
  regularMarketPrice?: number;
  regularMarketTime?: Date | number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
};

type YQuote = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  fiftyDayAverageChangePercent?: number;
};

/**
 * Yahoo's quote for the CBOE yield indices (^TNX and its siblings) collapses
 * while the bond market is shut: it returns the last value as BOTH the price
 * and the previous close, with open, dayHigh and dayLow all equal to it too. So
 * regularMarketChange is 0 and the strip printed "10Y 4.78 0.00%" every
 * weekend and every holiday, while the equity indices beside it kept a real
 * prior close and showed Friday's move.
 *
 * Detected by the shape rather than by symbol, since it is a property of the
 * quote and not of the instrument: no change, and a previous close identical to
 * the price.
 */
function quoteChangeIsMissing(q: YQuote | undefined): boolean {
  if (!q || q.regularMarketPrice == null) return false;
  const flat = q.regularMarketChange == null || q.regularMarketChange === 0;
  return flat && q.regularMarketPreviousClose === q.regularMarketPrice;
}

/**
 * Recover a day's move from the daily history, which still carries both
 * sessions when the quote does not. Returns null if there is nothing to
 * compare against, so the caller keeps whatever the quote said.
 */
async function changeFromHistory(
  symbol: string,
): Promise<{ change: number; changePct: number } | null> {
  const closes = await getDailyCloses(symbol, 1);
  if (closes.length < 2) return null;
  const prev = closes[closes.length - 2].close;
  const last = closes[closes.length - 1].close;
  if (!prev) return null;
  return { change: last - prev, changePct: ((last - prev) / prev) * 100 };
}

export async function getTickerStrip(): Promise<LiveQuote[]> {
  const symbols = TICKER_STRIP.map((t) => t.symbol);
  try {
    const results = (await yahooFinance.quote(symbols)) as YQuote | YQuote[];
    const arr: YQuote[] = Array.isArray(results) ? results : [results];
    const rows = TICKER_STRIP.map((t) => {
      const q = arr.find((r) => r?.symbol === t.symbol);
      return {
        symbol: t.symbol,
        label: t.label,
        price: q?.regularMarketPrice ?? null,
        change: q?.regularMarketChange ?? null,
        changePct: q?.regularMarketChangePercent ?? null,
        avg50pct: q?.fiftyDayAverageChangePercent ?? null,
        needsHistory: quoteChangeIsMissing(q),
      };
    });

    // Only the rows the quote could not answer for, and only then — on a normal
    // session this costs nothing.
    const repairs = await Promise.all(
      rows.map((r) => (r.needsHistory ? changeFromHistory(r.symbol) : null)),
    );

    return rows.map((row, i) => {
      const { needsHistory, ...r } = row;
      const fix = needsHistory ? repairs[i] : null;
      return fix ? { ...r, change: fix.change, changePct: fix.changePct } : r;
    });
  } catch (err) {
    console.error("[markets] ticker strip fetch failed:", err);
    return TICKER_STRIP.map((t) => ({
      symbol: t.symbol,
      label: t.label,
      price: null,
      change: null,
      changePct: null,
      avg50pct: null,
    }));
  }
}

export type DailyClose = { date: string; close: number };

/**
 * Fetch daily closes for any Yahoo symbol over the requested window. Used by
 * changeFromHistory() to fill a ticker-strip change Yahoo's quote left blank.
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

// ---- Unified range-based chart fetching ----------------------------------
// Used by every chart on the dashboard so the timeframe selector and the
// underlying data shape are consistent. Range type + constants are defined
// in chart-ranges.ts so client components can import them without dragging
// the (server-only) yahoo-finance2 dependency into the browser bundle.

export type { ChartRange } from "./chart-ranges";
export { CHART_RANGES } from "./chart-ranges";
import type { ChartRange, ChartInterval } from "./chart-ranges";

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

type YahooQuoteBar = {
  date?: Date;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
};

export type ChartBar = {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
};

async function fetchChartBars(
  symbol: string,
  sinceMs: number,
  interval: string,
): Promise<ChartBar[]> {
  const result = (await yahooFinance.chart(symbol, {
    period1: new Date(sinceMs),
    interval: interval as never,
    // Regular session only. Yahoo defaults to including pre- and post-market
    // bars, which on an hourly NVDA chart meant ~16 bars a day spanning
    // 4am–7pm ET instead of the 7 the session actually has. Those extra bars
    // are thin, erratic and jump against each other, which is what made the
    // intraday charts look full of holes.
    //
    // No symbol classification needed: Yahoo reports a 24-hour regular session
    // for crypto and FX, so BTC-USD and JPY=X keep every bar (measured — 482
    // and 333 respectively, unchanged), while equities and indices drop to
    // their real session.
    includePrePost: false,
  })) as { quotes?: YahooQuoteBar[] };
  const quotes = result?.quotes ?? [];
  const bars = quotes
    .filter((q): q is YahooQuoteBar & { date: Date; close: number } =>
      q.close != null && q.date != null,
    )
    .map((q) => {
      const bar: ChartBar = {
        // Keep full ISO datetime so intraday ranges retain the hour/minute.
        date: q.date.toISOString(),
        close: q.close,
      };
      // A price of zero is not a price. Yahoo returns O/H/L = 0 for the
      // in-progress bar on some symbols — the current week on 000660.KS and
      // ^KS11, for instance — while still reporting a real close. Stored as-is
      // that made a candle whose low was 0, so the last bar drew a wick from
      // the floor of the chart to the price, and dragged the y-axis and the
      // derived support levels down with it. Dropping the field instead leaves
      // a close-only bar, which is what the feed actually knows.
      const ok = (v: number | null | undefined): v is number =>
        typeof v === "number" && Number.isFinite(v) && v > 0;
      if (ok(q.open)) bar.open = q.open;
      if (ok(q.high)) bar.high = q.high;
      if (ok(q.low)) bar.low = q.low;
      if (q.volume != null && Number.isFinite(q.volume)) bar.volume = q.volume;
      return bar;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return interval === "1d" ? appendQuoteBar(symbol, bars) : bars;
}

/**
 * Close the gap between Yahoo's two feeds.
 *
 * The chart endpoint publishes a completed daily bar hours after the quote
 * endpoint has that session's close. At 3:20am ET on 2026-09-04 the ^GSPC
 * chart still ended at Sep 2 (7,666.60) while quote() already reported Sep 3's
 * close of 7,747.71 — and no request shape recovers the missing bar (tried
 * period1-only, period2=now, period2=now+30d; all returned the same 7 bars).
 *
 * The homepage reads both: the ticker strip from quote, the chart from bars.
 * So the same index printed two different prices a session apart, and the
 * chart's was a day stale.
 *
 * The quote is not just a price — it carries the whole session (open, day high,
 * day low, price, volume), so the missing bar can be appended as a real OHLCV
 * bar rather than a close-only stub that would draw as a hairline candle.
 *
 * Daily interval only: weekly and monthly bars aggregate sessions, so appending
 * one day to them would be a different unit, and intraday bars are finer than a
 * quote can reconstruct. Guarded on a strictly later UTC day, so the ordinary
 * case — Yahoo already including the in-progress session, which is what happens
 * during market hours and always for 24/7 crypto — appends nothing.
 */
async function appendQuoteBar(symbol: string, bars: ChartBar[]): Promise<ChartBar[]> {
  if (!bars.length) return bars;
  try {
    const q = (await yahooFinance.quote(symbol)) as YQuoteBar;
    const close = q?.regularMarketPrice;
    const t = q?.regularMarketTime;
    const when = t instanceof Date ? t : typeof t === "number" ? new Date(t * 1000) : null;
    if (!when || !Number.isFinite(when.getTime()) || typeof close !== "number") return bars;

    const day = when.toISOString().slice(0, 10);
    if (day <= bars[bars.length - 1].date.slice(0, 10)) return bars;

    const ok = (v: number | null | undefined): v is number =>
      typeof v === "number" && Number.isFinite(v) && v > 0;
    const bar: ChartBar = { date: when.toISOString(), close };
    if (ok(q.regularMarketOpen)) bar.open = q.regularMarketOpen;
    if (ok(q.regularMarketDayHigh)) bar.high = q.regularMarketDayHigh;
    if (ok(q.regularMarketDayLow)) bar.low = q.regularMarketDayLow;
    if (q.regularMarketVolume != null && Number.isFinite(q.regularMarketVolume)) {
      bar.volume = q.regularMarketVolume;
    }
    return [...bars, bar];
  } catch (err) {
    // A missing quote is not a reason to lose the chart.
    console.error(`[markets] quote-bar append failed for ${symbol}:`, err);
    return bars;
  }
}

export async function getChartSeries(
  symbol: string,
  range: ChartRange,
): Promise<ChartBar[]> {
  const { days, interval } = RANGE_PARAMS[range];
  try {
    return await fetchChartBars(symbol, Date.now() - days * 86_400_000, interval);
  } catch (err) {
    console.error(`[markets] chart series fetch failed for ${symbol} ${range}:`, err);
    return [];
  }
}

/**
 * Extra calendar days fetched BEFORE the visible window when the caller wants
 * indicator warm-up — enough history that a 50-period EMA (and 14-period RSI)
 * is converged by the first visible bar, so the lines span the whole window
 * instead of fading in partway across. Sized for ~110 extra bars at each
 * range's interval. ALL already reaches back to inception, so there is nothing
 * earlier to fetch.
 */
const WARMUP_DAYS: Record<ChartRange, number> = {
  "1D": 7,
  "5D": 14,
  "1M": 160,
  "3M": 160,
  "1Y": 160,
  "5Y": 800,
  ALL: 0,
};

/**
 * Warm-up sized per bar size rather than per window, in calendar days that hold
 * roughly 110 bars. The old table assumed daily bars: asking for a 1M window at
 * 30-minute resolution would have requested 32 + 160 days of history, and Yahoo
 * refuses 30-minute data past 60 days — the whole chart would have come back
 * empty rather than merely un-warmed.
 */
const WARMUP_DAYS_FOR_INTERVAL: Record<ChartInterval, number> = {
  "5m": 3,
  "30m": 12,
  "1h": 23,
  "1d": 160,
  "1wk": 800,
  "1mo": 0,
};

/**
 * How far back Yahoo will serve each intraday size at all. Requests past these
 * error out, so the total lookback is clamped rather than left to fail. Sat
 * just inside the documented cliff (60 / 730 days) to leave room for weekends.
 */
const MAX_LOOKBACK_DAYS: Partial<Record<ChartInterval, number>> = {
  "5m": 58,
  "30m": 58,
  "1h": 720,
};

export type ChartSeriesWithWarmup = {
  /** Warm-up bars followed by the visible window, oldest first. */
  data: ChartBar[];
  /** Index of the first bar inside the visible window. */
  visibleFrom: number;
};

/** Calendar day in New York for an ISO timestamp — session identity for intraday bars. */
function etDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export async function getChartSeriesWithWarmup(
  symbol: string,
  range: ChartRange,
  intervalOverride?: ChartInterval,
): Promise<ChartSeriesWithWarmup> {
  const { days } = RANGE_PARAMS[range];
  const interval = intervalOverride ?? RANGE_PARAMS[range].interval;
  const warmup = intervalOverride
    ? WARMUP_DAYS_FOR_INTERVAL[interval]
    : WARMUP_DAYS[range];
  const cap = MAX_LOOKBACK_DAYS[interval] ?? Number.POSITIVE_INFINITY;
  const lookback = Math.min(days + warmup, cap);
  const now = Date.now();
  try {
    const data = await fetchChartBars(symbol, now - lookback * 86_400_000, interval);
    if (!data.length) return { data, visibleFrom: 0 };

    let visibleFrom: number;
    if (range === "1D") {
      // "1D" means the last trading session, not the last 24-48 hours — the
      // padded fetch can span two sessions midweek, so cut at the ET day of
      // the final bar.
      const lastDay = etDay(data[data.length - 1].date);
      visibleFrom = data.findIndex((b) => etDay(b.date) === lastDay);
    } else {
      const cutoff = new Date(now - days * 86_400_000).toISOString();
      visibleFrom = data.findIndex((b) => b.date >= cutoff);
    }
    return { data, visibleFrom: Math.max(0, visibleFrom) };
  } catch (err) {
    console.error(`[markets] warmup chart fetch failed for ${symbol} ${range}:`, err);
    return { data: [], visibleFrom: 0 };
  }
}

// ---- Quotes for the homepage ticker cards ----------------------------------

export type TradeQuote = {
  symbol: string;
  name: string | null;
  price: number | null;
  changePct: number | null;
  currency: string | null;
};

type YTradeQuote = YQuote & {
  shortName?: string;
  longName?: string;
  currency?: string;
};

/**
 * Live quotes for a caller-supplied list of symbols. Returns a
 * null-filled entry for any symbol Yahoo doesn't recognize so the UI can flag a
 * bad ticker instead of silently dropping it. Never throws.
 */
export async function getTradeQuotes(symbols: string[]): Promise<TradeQuote[]> {
  if (symbols.length === 0) return [];
  try {
    const results = (await yahooFinance.quote(symbols)) as YTradeQuote | YTradeQuote[];
    const arr: YTradeQuote[] = Array.isArray(results) ? results : [results];
    return symbols.map((s) => {
      const q = arr.find((r) => r?.symbol === s);
      return {
        symbol: s,
        name: q?.shortName ?? q?.longName ?? null,
        price: q?.regularMarketPrice ?? null,
        changePct: q?.regularMarketChangePercent ?? null,
        currency: q?.currency ?? null,
      };
    });
  } catch (err) {
    console.error("[markets] trade quotes fetch failed:", err);
    return symbols.map((s) => ({
      symbol: s,
      name: null,
      price: null,
      changePct: null,
      currency: null,
    }));
  }
}
