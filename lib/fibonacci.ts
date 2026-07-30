// Fibonacci retracements and extensions, derived from the visible price action.
//
// The ratios are not arbitrary. Divide any Fibonacci number by the next one and
// the quotient converges on 0.618 — the reciprocal of the golden ratio φ. Skip a
// place (F(n)/F(n+2)) and you get 0.382, which is also 1 − 0.618. Skip two
// (F(n)/F(n+3)) and you get 0.236, i.e. 0.618³. So:
//
//   23.6% = φ⁻³   a minor pullback — trend barely paused
//   38.2% = φ⁻²   a shallow retracement — strong trend, buyers step in early
//   50.0% = —     NOT a Fibonacci number. It's the psychological midpoint,
//                 inherited from Dow theory, carried along by convention.
//   61.8% = φ⁻¹   the golden ratio — the deep retracement, last line before the
//                 move is usually considered failed
//
// A fib is only as good as the swing it's anchored to, so the anchor is derived
// rather than guessed: the window's extreme high and extreme low, ordered by
// which came first. That gives the dominant leg on screen, and it re-derives
// whenever the range or symbol changes — the levels always describe the bars you
// are actually looking at, never a stale drawing.
//
// Pure functions over ChartPoint[] with no server-only imports, so this runs
// inside the client chart component.

import type { ChartPoint } from "@/lib/chart-ranges";

/** Same floor as deriveLevels — below this a "swing" is just noise. */
const MIN_BARS = 12;

/**
 * A leg has to actually be a move. Below half a percent the retracement lines
 * land on top of each other and describe nothing.
 */
const MIN_SPAN_PCT = 0.005;

/**
 * How far price must pull back off the swing end before extension targets mean
 * anything. Extensions project from the pullback low (point C); if C sits
 * within a whisker of B then every target is a hair above the swing high and
 * the grid is noise. 23.6% is the shallowest level we draw, so it's the natural
 * threshold — anything less isn't a retracement we'd label either.
 */
const MIN_PULLBACK = 0.236;

export type FibRatio = {
  ratio: number;
  label: string;
  /** Why this level is watched — surfaced in the chart's tooltips. */
  note: string;
  /** The three levels traders actually trade; anchors and minor levels are quieter. */
  major: boolean;
};

/**
 * Retracement grid, measured back from the swing end toward the swing start.
 * 0% is the end of the move, 100% is a full round trip back to where it began.
 */
export const RETRACEMENT_RATIOS: FibRatio[] = [
  { ratio: 0, label: "0%", note: "swing end — the extreme of the move", major: false },
  { ratio: 0.236, label: "23.6%", note: "minor pullback (φ⁻³) — trend barely paused", major: false },
  { ratio: 0.382, label: "38.2%", note: "shallow retracement (φ⁻²) — strong trend", major: true },
  { ratio: 0.5, label: "50%", note: "psychological midpoint — not a Fibonacci ratio", major: true },
  { ratio: 0.618, label: "61.8%", note: "the golden ratio (φ⁻¹) — deep retracement", major: true },
  { ratio: 1, label: "100%", note: "swing start — the move fully unwound", major: false },
];

/**
 * Extension targets, projected forward from the pullback. 161.8% is φ itself and
 * the level most often used as a primary target; 127.2% is √φ, the conservative
 * one; 100% is the measured move — the second leg matching the first.
 */
export const EXTENSION_RATIOS: FibRatio[] = [
  { ratio: 1, label: "100%", note: "measured move — second leg equals the first", major: false },
  { ratio: 1.272, label: "127.2%", note: "√φ — the conservative target", major: false },
  { ratio: 1.618, label: "161.8%", note: "φ, the golden extension — primary target", major: true },
];

/**
 * Extra ratios drawn only on a hand-placed grid, projecting the leg past both
 * of its own ends. Negative ratios continue past the point the drag finished
 * on; ratios above 1 run back past where it started.
 */
export const MANUAL_EXTENSION_RATIOS: FibRatio[] = [
  { ratio: -0.618, label: "161.8%", note: "φ projected past the end of the swing", major: true },
  { ratio: -0.272, label: "127.2%", note: "√φ projected past the end of the swing", major: false },
  { ratio: 1.272, label: "127.2%", note: "√φ projected back past the swing's start", major: false },
  { ratio: 1.618, label: "161.8%", note: "φ projected back past the swing's start", major: true },
];

export type FibPoint = { index: number; price: number };

export type FibLevel = FibRatio & {
  price: number;
  kind: "retracement" | "extension";
  /**
   * Which way an extension projects off the pullback. "with" runs in the swing's
   * own direction (the classical target); "against" mirrors it on the far side,
   * so a grid carries targets above *and* below rather than only where the leg
   * happened to be pointing. Undefined on retracements, which sit inside the
   * leg by construction.
   */
  side?: "with" | "against";
};

export type FibAnalysis = {
  /** "up" = the leg ran low→high, so retracements sit below the swing high. */
  direction: "up" | "down";
  /** Point A — where the dominant leg began. */
  start: FibPoint;
  /** Point B — where it ended. Retracements are measured back from here. */
  end: FibPoint;
  /** Point C — the retracement extreme since B. Null until price pulls back. */
  pullback: FibPoint | null;
  /** Signed size of the A→B leg. Negative on a down leg. */
  span: number;
  /** Fraction of the leg retraced so far, or null when there's no pullback yet. */
  retraced: number | null;
  /** Where the latest close sits on the retracement scale (0 = B, 1 = A). */
  priceRatio: number;
  levels: FibLevel[];
  /** Empty until the pullback clears MIN_PULLBACK — see the constant. */
  extensions: FibLevel[];
  /** True when the reader set the anchors by hand instead of auto-detection. */
  manual?: boolean;
};

/**
 * Locate the dominant swing on the window: its highest high and lowest low,
 * ordered by which printed first. Whichever came last is point B, so the leg
 * always reads in the direction price was travelling most recently.
 */
function findSwing(bars: ChartPoint[]): { a: FibPoint; b: FibPoint } | null {
  let hiIdx = 0;
  let loIdx = 0;
  let hi = bars[0].high ?? bars[0].close;
  let lo = bars[0].low ?? bars[0].close;

  for (let i = 1; i < bars.length; i++) {
    const h = bars[i].high ?? bars[i].close;
    const l = bars[i].low ?? bars[i].close;
    if (h > hi) {
      hi = h;
      hiIdx = i;
    }
    if (l < lo) {
      lo = l;
      loIdx = i;
    }
  }

  // A single bar holding both extremes isn't a leg.
  if (hiIdx === loIdx) return null;

  const high: FibPoint = { index: hiIdx, price: hi };
  const low: FibPoint = { index: loIdx, price: lo };
  // Earlier extreme starts the leg; the later one ends it.
  return loIdx < hiIdx ? { a: low, b: high } : { a: high, b: low };
}

/**
 * The retracement extreme since the swing ended — point C of the ABC pattern.
 * On an up leg that's the lowest low after B; on a down leg the highest high.
 */
function findPullback(
  bars: ChartPoint[],
  b: FibPoint,
  direction: "up" | "down",
): FibPoint | null {
  if (b.index >= bars.length - 1) return null;
  let best: FibPoint | null = null;
  for (let i = b.index + 1; i < bars.length; i++) {
    const p =
      direction === "up"
        ? bars[i].low ?? bars[i].close
        : bars[i].high ?? bars[i].close;
    if (
      best === null ||
      (direction === "up" ? p < best.price : p > best.price)
    ) {
      best = { index: i, price: p };
    }
  }
  return best;
}

/**
 * Derive the Fibonacci grid for a bar series. Returns null when the window is
 * too short or too flat to carry a meaningful swing, so callers can simply not
 * draw rather than render a grid built on nothing.
 */
export function deriveFibonacci(bars: ChartPoint[]): FibAnalysis | null {
  if (bars.length < MIN_BARS) return null;

  const swing = findSwing(bars);
  if (!swing) return null;

  const { a, b } = swing;
  const span = b.price - a.price;
  const price = bars[bars.length - 1].close;
  if (!(price > 0) || Math.abs(span) / price < MIN_SPAN_PCT) return null;

  const direction = span > 0 ? "up" : "down";

  // One formula covers both directions. On an up leg span is positive so the
  // levels step down from B toward A; on a down leg span is negative so the
  // same expression steps up from B toward A. No branching, no sign bugs.
  const retrace = (r: number) => b.price - span * r;

  const levels: FibLevel[] = RETRACEMENT_RATIOS.map((r) => ({
    ...r,
    price: retrace(r.ratio),
    kind: "retracement" as const,
  }));

  const pullback = findPullback(bars, b, direction);
  const retraced = pullback ? (b.price - pullback.price) / span : null;

  // Standard three-point extension: project the A→B distance from C — and then
  // the same distance the other way. A swing tells you how far this market
  // travels in a leg; that measure is just as valid pointing down as up, and a
  // grid that only ever projects one way silently assumes the trend continues.
  // Mirrored levels are marked "against" so the chart can draw them quieter.
  const extensions: FibLevel[] =
    pullback && retraced !== null && retraced >= MIN_PULLBACK
      ? EXTENSION_RATIOS.flatMap((r) => [
          {
            ...r,
            price: pullback.price + span * r.ratio,
            kind: "extension" as const,
            side: "with" as const,
          },
          {
            ...r,
            price: pullback.price - span * r.ratio,
            kind: "extension" as const,
            side: "against" as const,
            note: `${r.note} — mirrored below the pullback`,
          },
        ]).filter((e) => e.price > 0)
      : [];

  return {
    direction,
    start: a,
    end: b,
    pullback,
    span,
    retraced,
    priceRatio: (b.price - price) / span,
    levels,
    extensions,
  };
}

/**
 * The same grid, but anchored to two points the reader chose rather than to the
 * swing the window happens to contain.
 *
 * Auto-detection answers "what is the dominant leg here", which is the right
 * default and wrong the moment you care about a leg it didn't pick. The maths is
 * identical from A and B onward — only the anchors differ — so this shares
 * everything below the swing and simply skips `findSwing`.
 *
 * The pullback (point C) is still measured from the bars, because extensions
 * project from where price actually turned, not from where the reader clicked.
 * With no qualifying pullback the grid is retracements only, exactly as the
 * automatic path behaves.
 */
export function fibFromAnchors(
  bars: ChartPoint[],
  a: FibPoint,
  b: FibPoint,
): FibAnalysis | null {
  if (!bars.length) return null;
  const span = b.price - a.price;
  const price = bars[bars.length - 1].close;
  if (!(price > 0) || !(Math.abs(span) > 0)) return null;

  // Level(r) = B − span·r. r=0 sits on B (where the drag ended), r=1 on A
  // (where it began). Ratios outside [0,1] therefore land beyond the leg on
  // either side, which is how a drawn grid earns levels above *and* below
  // whichever way you dragged — no pullback required, and no dependence on what
  // price did afterwards. That matters for a tool: what you draw is what you
  // get, and it stays put.
  const level = (r: number) => b.price - span * r;

  const levels: FibLevel[] = RETRACEMENT_RATIOS.map((r) => ({
    ...r,
    price: level(r.ratio),
    kind: "retracement" as const,
  }));

  const extensions: FibLevel[] = MANUAL_EXTENSION_RATIOS.map((r) => ({
    ...r,
    price: level(r.ratio),
    kind: "extension" as const,
    // "with" continues past the end of the drag; "against" runs back past its
    // start. Purely a label for the chart's arrows.
    side: (r.ratio < 0 ? "with" : "against") as "with" | "against",
  })).filter((e) => e.price > 0);

  return {
    direction: span > 0 ? "up" : "down",
    start: a,
    end: b,
    pullback: null,
    span,
    retraced: null,
    priceRatio: (b.price - price) / span,
    levels,
    extensions,
    manual: true,
  };
}

/**
 * The retracement level the given price is nearest, within `tolerance` of the
 * leg (as a fraction of the leg's size). Used for the hover readout — "sitting
 * on the 61.8%" is the thing you actually want to know.
 *
 * 3% of the leg is the band. Tighter (2%) and a close ten points off a level on
 * a 500-point swing reads as "near nothing", which isn't how anyone looks at a
 * chart; wider and the bands of adjacent levels would start to meet, since the
 * closest pair in the grid (38.2→50, 50→61.8) sit 11.8% of the leg apart.
 */
export function nearestFibLevel(
  fib: FibAnalysis,
  price: number,
  tolerance = 0.03,
): FibLevel | null {
  const reach = Math.abs(fib.span) * tolerance;
  let best: FibLevel | null = null;
  let bestGap = Infinity;
  for (const lvl of [...fib.levels, ...fib.extensions]) {
    const gap = Math.abs(lvl.price - price);
    if (gap < bestGap) {
      bestGap = gap;
      best = lvl;
    }
  }
  return bestGap <= reach ? best : null;
}
