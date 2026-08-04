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
  { symbol: "BTC-USD", label: "BTC" },
  { symbol: "GC=F", label: "Gold" },
];

type YQuote = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  fiftyDayAverageChangePercent?: number;
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
        avg50pct: q?.fiftyDayAverageChangePercent ?? null,
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
      avg50pct: null,
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

/**
 * Lightweight live quotes for arbitrary symbols (used by the
 * live-check). Returns a symbol → price map; missing/failed symbols are
 * simply absent.
 */
export async function getLivePrices(
  symbols: string[],
): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};
  try {
    const results = (await yahooFinance.quote(symbols)) as YQuote | YQuote[];
    const arr: YQuote[] = Array.isArray(results) ? results : [results];
    const out: Record<string, number> = {};
    for (const q of arr) {
      if (q?.symbol && typeof q.regularMarketPrice === "number") {
        out[q.symbol] = q.regularMarketPrice;
      }
    }
    return out;
  } catch (err) {
    console.error("[markets] live price fetch failed:", err);
    return {};
  }
}

export type DailyClose = { date: string; close: number };

/**
 * Fetch daily closes for any Yahoo symbol over the requested window. Used for
 * the homepage asset charts and verdict scoring on the briefing pages. Adds a
 * 30-day forward pad so forward-return windows are queryable for recent
 * verdicts.
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

export type { ChartRange, ChartInterval } from "./chart-ranges";
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
  return quotes
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

// ---- Arbitrary-symbol quotes (For You feed, ticker search) ------------------

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

// ---- Company profile (sector / industry / beta) ----------------------------

export type CompanyProfile = {
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  beta: number | null;
};

/**
 * Sector / industry / beta for a list of symbols, via Yahoo quoteSummary. Lets
 * the For You feed generate a real factor-based read for ANY ticker the user
 * holds — not just the hand-curated names. Per-symbol try/catch; never throws.
 */
export async function getProfiles(symbols: string[]): Promise<CompanyProfile[]> {
  const list = Array.from(
    new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)),
  ).slice(0, 20);
  return Promise.all(
    list.map(async (symbol): Promise<CompanyProfile> => {
      try {
        const sum = (await yahooFinance.quoteSummary(symbol, {
          modules: ["assetProfile", "summaryDetail", "price"],
        })) as {
          assetProfile?: { sector?: string; industry?: string };
          summaryDetail?: { beta?: number };
          price?: { shortName?: string; longName?: string };
        };
        return {
          symbol,
          name: sum?.price?.shortName ?? sum?.price?.longName ?? null,
          sector: sum?.assetProfile?.sector ?? null,
          industry: sum?.assetProfile?.industry ?? null,
          beta: typeof sum?.summaryDetail?.beta === "number" ? sum.summaryDetail.beta : null,
        };
      } catch {
        return { symbol, name: null, sector: null, industry: null, beta: null };
      }
    }),
  );
}

// ---- Symbol search (ticker or company name) for the watchlist add box ------

export type SymbolSearchResult = {
  symbol: string;
  name: string;
  exchange: string | null;
  type: string | null;
};

/**
 * Resolve a free-text query (ticker or company/asset name) to candidate Yahoo
 * symbols via Yahoo's search endpoint. Drops option contracts; never throws.
 */
export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  try {
    // validateResult:false — Yahoo's search payload often carries fields the
    // library's strict schema rejects (which would otherwise throw); we read
    // the fields we need defensively, so skip validation.
    const res = (await yahooFinance.search(
      q,
      { quotesCount: 10, newsCount: 0 },
      { validateResult: false },
    )) as { quotes?: Array<Record<string, unknown>> };
    const quotes = res?.quotes ?? [];
    return quotes
      .filter((x) => typeof x.symbol === "string" && x.quoteType !== "OPTION")
      .map((x) => ({
        symbol: x.symbol as string,
        name:
          (x.shortname as string) ??
          (x.longname as string) ??
          (x.symbol as string),
        exchange: (x.exchange as string) ?? null,
        type: (x.quoteType as string) ?? null,
      }))
      .slice(0, 8);
  } catch (err) {
    console.error("[markets] symbol search failed:", err);
    return [];
  }
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
      avg50pct: item?.fiftyDayAverageChangePercent ?? null,
    };
  } catch (err) {
    console.error(`[markets] quote fetch failed for ${symbol}:`, err);
    return null;
  }
}
