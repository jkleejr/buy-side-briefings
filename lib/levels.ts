// Support / resistance derived from price action.
//
// A level isn't a line someone drew — it's a price the market kept turning at.
// So we find the turns (swing pivots), group the ones that sit at effectively
// the same price, and let the size of each group be that level's strength. The
// output works for any ticker we can fetch bars for; nothing is hand-authored.
//
// Pure functions over ChartPoint[] with no server-only imports, so this is safe
// to run in a client component.

import type { ChartPoint } from "@/lib/chart-ranges";

/**
 * Bars either side of a candidate that must not exceed it for a pivot.
 *
 * Scales with the series: a fixed ±5 needs 11 bars per pivot, which finds
 * nothing on a 21-bar month — the chart came up with zero levels. Short
 * windows get a tighter definition of "a turn" so they still resolve.
 */
function pivotWindow(barCount: number): number {
  return Math.max(2, Math.min(5, Math.floor(barCount / 20)));
}
/**
 * How close two pivots must be to count as the same level, as a fraction of
 * price. Scales with how much the window actually moved: a fixed 1.8% is
 * wider than an entire intraday session, so every pivot collapsed into one
 * "level" spanning the whole day. Roughly a seventh of the visible range,
 * bounded so a quiet window stays meaningful and a wild one stays tight.
 */
function clusterTolerance(bars: ChartPoint[], price: number): number {
  const hi = Math.max(...bars.map((b) => b.high ?? b.close));
  const lo = Math.min(...bars.map((b) => b.low ?? b.close));
  const span = (hi - lo) / price;
  return Math.min(0.018, Math.max(0.0015, span * 0.14));
}
/** A level needs corroboration — a single touch is noise. */
const MIN_TOUCHES = 2;

export type LevelZone = {
  /** Bottom / top of the band the touches span. */
  lo: number;
  hi: number;
  /** Mean of the touches — the level's headline price. */
  mid: number;
  /** How many times price turned here. Strength. */
  touches: number;
  /** Above the current price, or below it. */
  kind: "resistance" | "support";
  /** Signed % from the current price to `mid`. */
  distPct: number;
  /** Index + price of each individual turn, for plotting the evidence. */
  hits: Array<{ index: number; price: number }>;
  /** Where the newest touch sits in the series, 0 (oldest) → 1 (latest). */
  recency: number;
};

export type LevelAnalysis = {
  price: number;
  high: number;
  low: number;
  /** Most recent swing high / low — the local extremes. */
  localTop: number | null;
  localBottom: number | null;
  zones: LevelZone[];
  /** The zone containing the current price, if any. */
  inside: LevelZone | null;
  /** Nearest zone below / above, excluding one the price sits inside. */
  nearestSupport: LevelZone | null;
  nearestResistance: LevelZone | null;
};

type Pivot = { index: number; price: number };

function findPivots(bars: ChartPoint[]): Pivot[] {
  const k = pivotWindow(bars.length);
  const out: Pivot[] = [];
  for (let i = k; i < bars.length - k; i++) {
    const win = bars.slice(i - k, i + k + 1);
    const b = bars[i];
    const high = b.high ?? b.close;
    const low = b.low ?? b.close;
    if (high >= Math.max(...win.map((w) => w.high ?? w.close)))
      out.push({ index: i, price: high });
    if (low <= Math.min(...win.map((w) => w.low ?? w.close)))
      out.push({ index: i, price: low });
  }
  return out;
}

/**
 * Group pivots that sit at effectively the same price.
 *
 * Compares each pivot against the group's running mean, not against its
 * neighbour. Chaining off the neighbour lets a group walk: every step is
 * within tolerance but the ends drift arbitrarily far apart, which merged
 * distinct shelves into one 8%-wide slab that is a region, not a level.
 * Anchoring on the mean bounds a group to roughly twice the tolerance.
 */
function clusterPivots(pivots: Pivot[], tolerance: number): Pivot[][] {
  if (!pivots.length) return [];
  const sorted = [...pivots].sort((a, b) => a.price - b.price);
  const groups: Pivot[][] = [];
  let cur: Pivot[] = [sorted[0]];
  let sum = sorted[0].price;

  for (const p of sorted.slice(1)) {
    const mean = sum / cur.length;
    if (Math.abs(p.price - mean) / mean <= tolerance) {
      cur.push(p);
      sum += p.price;
    } else {
      groups.push(cur);
      cur = [p];
      sum = p.price;
    }
  }
  groups.push(cur);
  return groups;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Derive levels from a bar series. Needs enough bars to form pivots; returns
 * null when the series is too short (an intraday range, say) so callers can
 * fall back rather than render a chart built on two turns.
 */
export function deriveLevels(bars: ChartPoint[]): LevelAnalysis | null {
  if (bars.length < 12) return null;

  const price = bars[bars.length - 1].close;
  const pivots = findPivots(bars);
  const tolerance = clusterTolerance(bars, price);

  const zones: LevelZone[] = clusterPivots(pivots, tolerance)
    .filter((g) => g.length >= MIN_TOUCHES)
    .map((g) => {
      const prices = g.map((p) => p.price);
      const mid = prices.reduce((a, b) => a + b, 0) / prices.length;
      return {
        lo: round2(Math.min(...prices)),
        hi: round2(Math.max(...prices)),
        mid: round2(mid),
        touches: g.length,
        kind: mid > price ? ("resistance" as const) : ("support" as const),
        distPct: round2(((mid - price) / price) * 100),
        hits: g
          .map((p) => ({ index: p.index, price: round2(p.price) }))
          .sort((a, b) => a.index - b.index),
        recency: Math.max(...g.map((p) => p.index)) / (bars.length - 1),
      };
    })
    // Highest price first, so callers can lay labels out top-to-bottom.
    .sort((a, b) => b.mid - a.mid);

  const inside = zones.find((z) => price >= z.lo && price <= z.hi) ?? null;
  const below = zones.filter((z) => z.mid < price && z !== inside);
  const above = zones.filter((z) => z.mid > price && z !== inside);

  // Most recent turns, not the highest/lowest of the year — "local" means
  // where it has been trading lately.
  const recent = pivots.slice(-12);
  const localTop = recent.length ? round2(Math.max(...recent.map((p) => p.price))) : null;
  const localBottom = recent.length ? round2(Math.min(...recent.map((p) => p.price))) : null;

  return {
    price: round2(price),
    high: round2(Math.max(...bars.map((b) => b.high ?? b.close))),
    low: round2(Math.min(...bars.map((b) => b.low ?? b.close))),
    localTop,
    localBottom,
    zones,
    inside,
    // `below` is sorted high→low, so its first entry is the closest underneath;
    // `above` is likewise sorted, so the closest overhead is its last.
    nearestSupport: below[0] ?? null,
    nearestResistance: above.length ? above[above.length - 1] : null,
  };
}

/**
 * The levels that matter for the next move, rather than every level the year
 * contains. Takes the `perSide` nearest above and below the current price —
 * a ceiling 60% away is real history but tells you nothing about tomorrow.
 *
 * Within each side, ties on distance break toward the better-tested and
 * more-recently-touched zone, since a shelf defended last week carries more
 * weight than one last touched eleven months ago.
 */
export function pickRelevantZones(
  zones: LevelZone[],
  price: number,
  perSide = 2,
): LevelZone[] {
  const score = (z: LevelZone) => {
    const distance = Math.abs(z.distPct);
    // Small nudges only — proximity still dominates the ordering.
    const tested = Math.min(z.touches, 8) * 0.15;
    const fresh = z.recency * 1.5;
    return distance - tested - fresh;
  };
  const nearest = (list: LevelZone[]) => [...list].sort((a, b) => score(a) - score(b)).slice(0, perSide);

  const below = nearest(zones.filter((z) => z.mid <= price));
  const above = nearest(zones.filter((z) => z.mid > price));
  return [...above, ...below].sort((a, b) => b.mid - a.mid);
}

/**
 * Vertical positions for zone labels anchored to price. Tightly-spaced levels
 * would otherwise overlap in the margin, so nudge them apart while preserving
 * order and staying inside the plot. Expects zones sorted high→low.
 */
export function layoutLabelYs(
  ys: number[],
  top: number,
  bottom: number,
  gap: number,
): number[] {
  const out = [...ys];
  for (let i = 1; i < out.length; i++)
    if (out[i] - out[i - 1] < gap) out[i] = out[i - 1] + gap;

  const overflow = out.length ? out[out.length - 1] - bottom : 0;
  if (overflow > 0) {
    for (let i = 0; i < out.length; i++) out[i] -= overflow;
    for (let i = out.length - 2; i >= 0; i--)
      if (out[i + 1] - out[i] < gap) out[i] = out[i + 1] - gap;
  }
  return out.map((y) => Math.max(top, y));
}
