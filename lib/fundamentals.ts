import YahooFinance from "yahoo-finance2";

// ---------------------------------------------------------------------------
// Fundamentals & earnings intelligence for a single symbol — the "evidence
// layer" behind a dossier's verdict. Everything here comes from one Yahoo
// quoteSummary call (free), pulling the modules the rest of the app doesn't yet
// touch: valuation, growth/margins, balance-sheet health, analyst consensus,
// the next earnings event, the last four quarters' surprises, and — most
// useful — the DIRECTION analysts are revising estimates.
//
// Yahoo returns margins/growth/yields as decimals (0.55 = 55%); we normalise to
// percent here so the component never has to think about it. Every field is
// null-safe: a missing module degrades to "—", never a crash.
// ---------------------------------------------------------------------------

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

export type AnalystConsensus = {
  ratingKey: string | null; // e.g. "buy", "hold"
  ratingMean: number | null; // 1=strong buy … 5=sell
  numAnalysts: number | null;
  targetMean: number | null;
  targetHigh: number | null;
  targetLow: number | null;
  impliedUpsidePct: number | null;
  distribution: {
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
  } | null;
};

export type EarningsSurprise = {
  quarter: string; // YYYY-MM-DD of the reported quarter
  epsActual: number | null;
  epsEstimate: number | null;
  surprisePct: number | null;
  beat: boolean | null;
};

export type EstimateRevision = {
  label: string; // "Current Qtr" | "Next Qtr" | "Current Yr" | "Next Yr"
  current: number | null;
  days30Ago: number | null;
  days90Ago: number | null;
  dir: "up" | "down" | "flat" | null;
  upLast30: number | null;
  downLast30: number | null;
};

export type Fundamentals = {
  symbol: string;
  asOf: string;
  price: number | null;
  currency: string;

  // Valuation
  trailingPE: number | null;
  forwardPE: number | null;
  priceToSales: number | null;
  evToEbitda: number | null;
  peg: number | null;
  priceToBook: number | null;

  // Growth & profitability (percent)
  revenueGrowthPct: number | null;
  earningsGrowthPct: number | null;
  grossMarginPct: number | null;
  operatingMarginPct: number | null;
  netMarginPct: number | null;
  roePct: number | null;

  // Balance-sheet health
  totalCash: number | null;
  totalDebt: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  freeCashflow: number | null;

  // Income
  dividendYieldPct: number | null;

  // Next earnings event
  nextEarningsDate: string | null;
  nextEarningsDaysAway: number | null;
  nextEpsEstimate: number | null;

  analyst: AnalystConsensus;
  surprises: EarningsSurprise[];
  revisions: EstimateRevision[];
};

// Loose shapes for the modules we read. Yahoo's own types drift between
// versions, so we cast and null-check rather than depend on them.
type QS = {
  price?: { regularMarketPrice?: number; currency?: string };
  summaryDetail?: {
    trailingPE?: number;
    forwardPE?: number;
    priceToSalesTrailing12Months?: number;
    dividendYield?: number;
  };
  defaultKeyStatistics?: {
    enterpriseToEbitda?: number;
    pegRatio?: number;
    priceToBook?: number;
  };
  financialData?: {
    currentPrice?: number;
    targetHighPrice?: number;
    targetLowPrice?: number;
    targetMeanPrice?: number;
    recommendationMean?: number;
    recommendationKey?: string;
    numberOfAnalystOpinions?: number;
    totalCash?: number;
    totalDebt?: number;
    debtToEquity?: number;
    currentRatio?: number;
    freeCashflow?: number;
    grossMargins?: number;
    operatingMargins?: number;
    profitMargins?: number;
    returnOnEquity?: number;
    revenueGrowth?: number;
    earningsGrowth?: number;
  };
  calendarEvents?: {
    earnings?: { earningsDate?: (Date | string)[]; earningsAverage?: number };
  };
  earningsHistory?: {
    history?: {
      epsActual?: number | null;
      epsEstimate?: number | null;
      surprisePercent?: number | null;
      quarter?: Date | string | null;
    }[];
  };
  earningsTrend?: {
    trend?: {
      period?: string; // "0q" | "+1q" | "0y" | "+1y" | "-1q" …
      epsTrend?: {
        current?: number | null;
        "7daysAgo"?: number | null;
        "30daysAgo"?: number | null;
        "60daysAgo"?: number | null;
        "90daysAgo"?: number | null;
      };
      epsRevisions?: {
        upLast30days?: number | null;
        downLast30days?: number | null;
      };
    }[];
  };
  recommendationTrend?: {
    trend?: {
      period?: string;
      strongBuy?: number;
      buy?: number;
      hold?: number;
      sell?: number;
      strongSell?: number;
    }[];
  };
};

const pct = (n: number | null | undefined): number | null =>
  n === null || n === undefined ? null : n * 100;

function toDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return isNaN(date.getTime()) ? null : date;
}

const TREND_LABELS: Record<string, string> = {
  "0q": "Current Qtr",
  "+1q": "Next Qtr",
  "0y": "Current Yr",
  "+1y": "Next Yr",
};

export async function getFundamentals(symbol: string): Promise<Fundamentals | null> {
  let sum: QS;
  try {
    sum = (await yahooFinance.quoteSummary(
      symbol,
      {
        modules: [
          "price",
          "summaryDetail",
          "defaultKeyStatistics",
          "financialData",
          "calendarEvents",
          "earningsHistory",
          "earningsTrend",
          "recommendationTrend",
        ],
      },
      // Don't throw if Yahoo adds/removes a field we don't model.
      { validateResult: false },
    )) as QS;
  } catch (err) {
    console.error(`[fundamentals] fetch failed for ${symbol}:`, err);
    return null;
  }

  const fd = sum.financialData ?? {};
  const sd = sum.summaryDetail ?? {};
  const ks = sum.defaultKeyStatistics ?? {};
  const price = sum.price?.regularMarketPrice ?? fd.currentPrice ?? null;

  // ---- Analyst consensus ----
  const recTrend = sum.recommendationTrend?.trend ?? [];
  const latestRec = recTrend[0];
  const distribution = latestRec
    ? {
        strongBuy: latestRec.strongBuy ?? 0,
        buy: latestRec.buy ?? 0,
        hold: latestRec.hold ?? 0,
        sell: latestRec.sell ?? 0,
        strongSell: latestRec.strongSell ?? 0,
      }
    : null;
  const targetMean = fd.targetMeanPrice ?? null;
  const impliedUpsidePct =
    targetMean !== null && price !== null && price > 0
      ? (targetMean / price - 1) * 100
      : null;

  const analyst: AnalystConsensus = {
    ratingKey: fd.recommendationKey ?? null,
    ratingMean: fd.recommendationMean ?? null,
    numAnalysts: fd.numberOfAnalystOpinions ?? null,
    targetMean,
    targetHigh: fd.targetHighPrice ?? null,
    targetLow: fd.targetLowPrice ?? null,
    impliedUpsidePct,
    distribution:
      distribution &&
      distribution.strongBuy +
        distribution.buy +
        distribution.hold +
        distribution.sell +
        distribution.strongSell >
        0
        ? distribution
        : null,
  };

  // ---- Earnings surprise history (most recent 4 quarters, newest first) ----
  const surprises: EarningsSurprise[] = (sum.earningsHistory?.history ?? [])
    .map((h) => {
      const q = toDate(h.quarter);
      const actual = h.epsActual ?? null;
      const estimate = h.epsEstimate ?? null;
      let surprisePct: number | null = pct(h.surprisePercent);
      if (surprisePct === null && actual !== null && estimate !== null && estimate !== 0) {
        surprisePct = ((actual - estimate) / Math.abs(estimate)) * 100;
      }
      return {
        quarter: q ? q.toISOString().slice(0, 10) : "—",
        epsActual: actual,
        epsEstimate: estimate,
        surprisePct,
        beat: actual !== null && estimate !== null ? actual >= estimate : null,
      };
    })
    .filter((s) => s.epsActual !== null || s.epsEstimate !== null)
    .reverse()
    .slice(0, 4);

  // ---- Estimate revisions: are analysts raising or cutting? ----
  const trend = sum.earningsTrend?.trend ?? [];
  const revisions: EstimateRevision[] = ["0q", "+1q", "0y", "+1y"]
    .map((period) => {
      const t = trend.find((x) => x.period === period);
      if (!t) return null;
      const current = t.epsTrend?.current ?? null;
      const days30Ago = t.epsTrend?.["30daysAgo"] ?? null;
      const days90Ago = t.epsTrend?.["90daysAgo"] ?? null;
      let dir: EstimateRevision["dir"] = null;
      if (current !== null && days30Ago !== null) {
        dir = current > days30Ago ? "up" : current < days30Ago ? "down" : "flat";
      }
      return {
        label: TREND_LABELS[period] ?? period,
        current,
        days30Ago,
        days90Ago,
        dir,
        upLast30: t.epsRevisions?.upLast30days ?? null,
        downLast30: t.epsRevisions?.downLast30days ?? null,
      };
    })
    .filter((r): r is EstimateRevision => r !== null && r.current !== null);

  // ---- Next earnings event ----
  const earningsDates = (sum.calendarEvents?.earnings?.earningsDate ?? [])
    .map(toDate)
    .filter((d): d is Date => d !== null && d.getTime() > Date.now())
    .sort((a, b) => a.getTime() - b.getTime());
  const nextEarnings = earningsDates[0] ?? null;
  const nextEarningsDaysAway = nextEarnings
    ? Math.max(0, Math.round((nextEarnings.getTime() - Date.now()) / 86_400_000))
    : null;

  return {
    symbol,
    asOf: new Date().toISOString().slice(0, 10),
    price,
    currency: sum.price?.currency ?? "USD",

    trailingPE: sd.trailingPE ?? null,
    forwardPE: sd.forwardPE ?? null,
    priceToSales: sd.priceToSalesTrailing12Months ?? null,
    evToEbitda: ks.enterpriseToEbitda ?? null,
    peg: ks.pegRatio ?? null,
    priceToBook: ks.priceToBook ?? null,

    revenueGrowthPct: pct(fd.revenueGrowth),
    earningsGrowthPct: pct(fd.earningsGrowth),
    grossMarginPct: pct(fd.grossMargins),
    operatingMarginPct: pct(fd.operatingMargins),
    netMarginPct: pct(fd.profitMargins),
    roePct: pct(fd.returnOnEquity),

    totalCash: fd.totalCash ?? null,
    totalDebt: fd.totalDebt ?? null,
    debtToEquity: fd.debtToEquity ?? null,
    currentRatio: fd.currentRatio ?? null,
    freeCashflow: fd.freeCashflow ?? null,

    dividendYieldPct: pct(sd.dividendYield),

    nextEarningsDate: nextEarnings ? nextEarnings.toISOString().slice(0, 10) : null,
    nextEarningsDaysAway,
    nextEpsEstimate: sum.calendarEvents?.earnings?.earningsAverage ?? null,

    analyst,
    surprises,
    revisions,
  };
}
