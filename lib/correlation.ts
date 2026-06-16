import type { DailyClose } from "@/lib/markets";

// ---------------------------------------------------------------------------
// Book correlation & beta. The open ideas can look diversified by ticker while
// being one bet by factor (e.g. NVDA / SK Hynix / SPCX are all AI-beta). This
// computes pairwise return correlation and beta to a benchmark, plus an
// "effective number of independent bets" so hidden concentration is visible.
//
// Correlations are PAIRWISE over each pair's own overlapping dates — a brand
// new listing (few bars) only weakens pairs that include it, never collapses
// the whole matrix.
// ---------------------------------------------------------------------------

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Aligned daily returns for two close series, over the dates they share. */
function pairReturns(a: DailyClose[], b: DailyClose[]): { ra: number[]; rb: number[] } {
  const ma = new Map(a.map((d) => [d.date, d.close]));
  const mb = new Map(b.map((d) => [d.date, d.close]));
  const common = a
    .map((d) => d.date)
    .filter((d) => mb.has(d))
    .sort();
  const ra: number[] = [];
  const rb: number[] = [];
  for (let i = 1; i < common.length; i++) {
    const a0 = ma.get(common[i - 1])!;
    const a1 = ma.get(common[i])!;
    const b0 = mb.get(common[i - 1])!;
    const b1 = mb.get(common[i])!;
    ra.push(a0 > 0 ? (a1 - a0) / a0 : 0);
    rb.push(b0 > 0 ? (b1 - b0) / b0 : 0);
  }
  return { ra, rb };
}

function pearson(a: number[], b: number[]): number | null {
  if (a.length < 2 || a.length !== b.length) return null;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  const den = Math.sqrt(da * db);
  return den > 0 ? num / den : null;
}

function betaOf(asset: number[], bench: number[]): number | null {
  if (asset.length < 2 || asset.length !== bench.length) return null;
  const mb = mean(bench);
  const ma = mean(asset);
  let cov = 0;
  let varb = 0;
  for (let i = 0; i < asset.length; i++) {
    const yb = bench[i] - mb;
    cov += (asset[i] - ma) * yb;
    varb += yb * yb;
  }
  return varb > 0 ? cov / varb : null;
}

export type BookCorrelation = {
  tickers: string[];
  /** Pairwise correlation; diagonal is 1; null where overlap < minDays. */
  matrix: (number | null)[][];
  /** Beta of each ticker to the benchmark; null where overlap < minDays. */
  betas: (number | null)[];
  /** Mean of the off-diagonal correlations that were computable. */
  avgCorr: number | null;
  /** n / (1 + (n−1)·avgCorr) — how many genuinely independent bets the book is. */
  effectiveBets: number | null;
  benchmark: string;
  minDays: number;
};

/**
 * Build the correlation/beta map. `seriesByTicker` maps a display ticker to its
 * daily closes; `benchSeries` is the benchmark (e.g. QQQ). Pairs with fewer than
 * `minDays` overlapping returns are left null rather than reported as noise.
 */
export function buildBookCorrelation(
  seriesByTicker: Record<string, DailyClose[]>,
  benchSeries: DailyClose[],
  benchmark = "QQQ",
  minDays = 20,
): BookCorrelation | null {
  const tickers = Object.keys(seriesByTicker).filter((t) => seriesByTicker[t].length > minDays);
  if (tickers.length < 2) return null;

  const n = tickers.length;
  const matrix: (number | null)[][] = Array.from({ length: n }, () =>
    Array<number | null>(n).fill(null),
  );

  const offDiag: number[] = [];
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const { ra, rb } = pairReturns(seriesByTicker[tickers[i]], seriesByTicker[tickers[j]]);
      const c = ra.length >= minDays ? pearson(ra, rb) : null;
      matrix[i][j] = c;
      matrix[j][i] = c;
      if (c != null) offDiag.push(c);
    }
  }

  const betas: (number | null)[] = tickers.map((t) => {
    const { ra, rb } = pairReturns(seriesByTicker[t], benchSeries);
    return ra.length >= minDays ? betaOf(ra, rb) : null;
  });

  const avgCorr = offDiag.length ? mean(offDiag) : null;
  // Clamp negative average to 0 for the effective-bets heuristic (diversification
  // can't manufacture more than n independent bets).
  const effectiveBets =
    avgCorr != null ? n / (1 + (n - 1) * Math.max(0, avgCorr)) : null;

  return { tickers, matrix, betas, avgCorr, effectiveBets, benchmark, minDays };
}
