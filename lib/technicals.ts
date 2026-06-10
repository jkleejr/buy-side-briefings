import { getChartSeries, type ChartBar } from "@/lib/markets";

// ---------------------------------------------------------------------------
// Mechanical technical analysis, computed live from one year of daily bars.
// Nothing here is editorial: moving averages, RSI, 52-week range, and
// support/resistance derived from swing-point clustering. The daily dossier's
// hand-written "Key levels" add judgment on top; this is the always-correct
// baseline that updates with every price tick (5-min chart cache).
// ---------------------------------------------------------------------------

export type Trend = "uptrend" | "downtrend" | "mixed";

export type MaRow = {
  period: 20 | 50 | 200;
  value: number;
  /** Last close vs. this MA, percent. Positive = price above the average. */
  vs_price_pct: number;
};

export type SrLevel = {
  level: number;
  /** Where the level comes from: "swing", "50-DMA", "200-DMA", "52W high"… */
  source: string;
  /** Distance from last close, percent (negative for supports). */
  distance_pct: number;
  /** Number of swing points that formed this level (1 for MA/52W levels). */
  touches: number;
};

export type Technicals = {
  symbol: string;
  as_of: string;
  last_close: number;
  trend: Trend;
  trend_note: string;
  rsi14: number | null;
  ma: MaRow[];
  week52_high: number;
  week52_low: number;
  /** Nearest-first (highest support first, lowest resistance first). */
  support: SrLevel[];
  resistance: SrLevel[];
};

function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const tail = closes.slice(-period);
  return tail.reduce((a, b) => a + b, 0) / period;
}

/** Wilder-smoothed 14-period RSI on daily closes. */
function rsi14(closes: number[]): number | null {
  const period = 14;
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, d)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -d)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Swing highs/lows: a bar is a swing high when its high is the maximum of the
 * surrounding ±k bars (symmetrical for lows). k=3 catches the levels a chart
 * reader would actually draw without flagging every wiggle.
 */
function swingPoints(bars: ChartBar[], k = 3): { highs: number[]; lows: number[] } {
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = k; i < bars.length - k; i++) {
    const hi = bars[i].high ?? bars[i].close;
    const lo = bars[i].low ?? bars[i].close;
    let isHigh = true;
    let isLow = true;
    for (let j = i - k; j <= i + k; j++) {
      if (j === i) continue;
      if ((bars[j].high ?? bars[j].close) > hi) isHigh = false;
      if ((bars[j].low ?? bars[j].close) < lo) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) highs.push(hi);
    if (isLow) lows.push(lo);
  }
  return { highs, lows };
}

/**
 * Cluster nearby swing levels (within `tolPct` percent) into one level whose
 * strength is the number of touches. More touches = the market has respected
 * that price more often.
 */
function clusterLevels(levels: number[], tolPct = 1.5): { level: number; touches: number }[] {
  const sorted = [...levels].sort((a, b) => a - b);
  const clusters: { sum: number; n: number }[] = [];
  for (const lv of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && Math.abs(lv - last.sum / last.n) / (last.sum / last.n) * 100 <= tolPct) {
      last.sum += lv;
      last.n += 1;
    } else {
      clusters.push({ sum: lv, n: 1 });
    }
  }
  return clusters.map((c) => ({ level: c.sum / c.n, touches: c.n }));
}

export async function getTechnicals(symbol: string): Promise<Technicals | null> {
  const bars = await getChartSeries(symbol, "1Y");
  if (bars.length < 60) return null;

  const closes = bars.map((b) => b.close);
  const last = closes[closes.length - 1];
  const asOf = bars[bars.length - 1].date.slice(0, 10);

  const ma: MaRow[] = ([20, 50, 200] as const)
    .map((period) => {
      const value = sma(closes, period);
      if (value === null) return null;
      return { period, value, vs_price_pct: ((last - value) / value) * 100 };
    })
    .filter((m): m is MaRow => m !== null);

  const ma50 = ma.find((m) => m.period === 50)?.value ?? null;
  const ma200 = ma.find((m) => m.period === 200)?.value ?? null;

  let trend: Trend = "mixed";
  let trend_note = "Signals are mixed — price and the major averages disagree.";
  if (ma50 !== null && ma200 !== null) {
    if (last > ma50 && ma50 > ma200) {
      trend = "uptrend";
      trend_note = "Price above the 50-DMA and the 50 above the 200 — intact uptrend.";
    } else if (last < ma50 && ma50 < ma200) {
      trend = "downtrend";
      trend_note = "Price below the 50-DMA and the 50 below the 200 — established downtrend.";
    } else if (last < ma50 && ma50 > ma200) {
      trend_note = "Below the 50-DMA but the 50 still rides above the 200 — pullback inside a longer uptrend until the 200-DMA breaks.";
    } else {
      trend_note = "Back above the 50-DMA while the 50 sits under the 200 — countertrend bounce until the averages re-cross.";
    }
  }

  const week52_high = Math.max(...bars.map((b) => b.high ?? b.close));
  const week52_low = Math.min(...bars.map((b) => b.low ?? b.close));

  // Build the support/resistance ladder: clustered swing levels + the major
  // moving averages + the 52-week extremes, split around the last close.
  const { highs, lows } = swingPoints(bars);
  const candidates: { level: number; source: string; touches: number }[] = [
    ...clusterLevels(highs).map((c) => ({ ...c, source: "swing" })),
    ...clusterLevels(lows).map((c) => ({ ...c, source: "swing" })),
  ];
  for (const m of ma) {
    if (m.period === 20) continue; // too fast to trade as a level
    candidates.push({ level: m.value, source: `${m.period}-DMA`, touches: 1 });
  }
  candidates.push({ level: week52_high, source: "52W high", touches: 1 });
  candidates.push({ level: week52_low, source: "52W low", touches: 1 });

  // Drop near-duplicates (within 1%), preferring the higher-touch entry.
  const dedup: { level: number; source: string; touches: number }[] = [];
  for (const c of candidates.sort((a, b) => b.touches - a.touches)) {
    if (dedup.some((d) => (Math.abs(d.level - c.level) / c.level) * 100 < 1)) continue;
    dedup.push(c);
  }

  const toSr = (c: { level: number; source: string; touches: number }): SrLevel => ({
    level: c.level,
    source: c.source,
    touches: c.touches,
    distance_pct: ((c.level - last) / last) * 100,
  });

  const support = dedup
    .filter((c) => c.level < last)
    .sort((a, b) => b.level - a.level)
    .slice(0, 4)
    .map(toSr);
  const resistance = dedup
    .filter((c) => c.level > last)
    .sort((a, b) => a.level - b.level)
    .slice(0, 4)
    .map(toSr);

  return {
    symbol,
    as_of: asOf,
    last_close: last,
    trend,
    trend_note,
    rsi14: rsi14(closes),
    ma,
    week52_high,
    week52_low,
    support,
    resistance,
  };
}
