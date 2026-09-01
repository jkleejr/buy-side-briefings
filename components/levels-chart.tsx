"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  INTERVAL_LABELS,
  INTERVAL_SHORT,
  RANGE_INTERVALS,
  defaultInterval,
  isIntradayInterval,
  type ChartInterval,
  type ChartPoint,
  type ChartRange,
} from "@/lib/chart-ranges";
import {
  deriveLevels,
  layoutLabelYs,
  pickRelevantZones,
  sanitizeBars,
  type LevelZone,
} from "@/lib/levels";
import {
  fibFromAnchors,
  nearestFibLevel,
  type FibAnalysis,
  type FibLevel,
} from "@/lib/fibonacci";
import RangeSelector from "./range-selector";
import {
  appendPoint,
  colorValue,
  DRAW_COLORS,
  drawingsServerSnapshot,
  drawingsSnapshot,
  freehandPath,
  saveDrawings,
  subscribeDrawings,
  type DrawColorId,
  type DrawTool,
  type Shape,
} from "@/lib/chart-drawings";

// Candles with derived support/resistance behind them (Design Note 12B-04).
// The wicks are the argument: you see price poke into a zone and get pushed
// back out, which a close-only line hides entirely.
//
// Levels use the lapis/oxblood accent pair, never green/red — the palette
// reserves those strictly for direction, which is what the candle bodies carry.

const W = 900;
const PAD_L = 8;
const PAD_T = 14;
const PAD_B = 20;

/**
 * Right margin when no level labels need holding — just enough that the last
 * bar isn't jammed against the frame. The price is at the right edge, so a
 * little room there reads as "now, with room to run" rather than as a cut-off.
 */
const PAD_R_BARE = 40;

/**
 * Full study view vs. the homepage's small multiples.
 *
 * `gap` is the minimum vertical distance between two level labels, and it has
 * to clear the whole two-line block or adjacent labels touch: the full view's
 * plate is 27 units tall, so 26 was a unit short of its own label height.
 */
const SIZES = {
  full: { H: 460, padR: 132, gap: 31, labelSize: 10.5, subSize: 9 },
  compact: { H: 190, padR: 104, gap: 22, labelSize: 9, subSize: 7.5 },
} as const;

/** How many levels to show either side of the price. */
const ZONES_PER_SIDE = 2;

/**
 * Floor on how far a zoom can go in. Below about a dozen bars the derived
 * levels and the Fibonacci swing are being computed from noise, and the candles
 * are wide enough to read as blocks rather than a series.
 */
const MIN_VISIBLE_BARS = 12;

/** Wheel notch → zoom factor. Gentle enough that a trackpad flick isn't a leap. */
const ZOOM_STEP = 1.18;

/**
 * Share of the plot height the volume bars rise into, measured from the
 * baseline. Volume is an overlay, not a pane — the price scale is unaffected
 * by it, so toggling volume never moves a candle.
 */
const VOL_FRACTION = 0.2;

/** RSI pane geometry, in viewBox units — height and the gap above it. */
const RSI_H = 96;
const RSI_GAP = 16;

/**
 * Level prices with thousands separators — "7,421.82" scans, "7421.82" doesn't.
 *
 * Above 100,000 the cents are dropped. A zone label is two of these joined by a
 * dash, so on a won-quoted name like SK Hynix (~1,400,000) the decimals pushed
 * the plate to "1,995,000.00–2,006,000.00" — wide enough to bury a fifth of the
 * candles behind it, to report a precision the won doesn't trade in. Nothing at
 * US-equity or index scale reaches the threshold, so those labels are unchanged.
 */
function fmtLevel(v: number): string {
  const digits = Math.abs(v) >= 100_000 ? 0 : 2;
  return v.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Compact volume for a tooltip: 1.2B, 44.6M, 12.4K. */
function fmtVolume(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString();
}

// Futures report volume as a count of contracts, not dollars — gold trades a
// few thousand a day, so it reads as "679" next to Bitcoin's dollar volume in
// the billions. For these symbols the tooltip shows dollar notional instead:
// contracts × contract size × price, prefixed with $ so it can't be mistaken
// for the raw count. A COMEX gold contract is 100 troy ounces.
const CONTRACT_SIZE: Record<string, number> = {
  "GC=F": 100,
};

/** Volume for the tooltip: dollar notional for futures, native count otherwise. */
function volumeLabel(volume: number, price: number, symbol: string): string {
  const size = CONTRACT_SIZE[symbol];
  return size ? `$${fmtVolume(volume * size * price)}` : fmtVolume(volume);
}

const RSI_PERIOD = 14;

/**
 * Wilder's RSI over the close series. Returns one value (0–100) per bar, null
 * for the first RSI_PERIOD bars where there isn't enough history to seed the
 * average. Momentum above 70 is conventionally "overbought", below 30
 * "oversold".
 */
function computeRSI(closes: number[], period = RSI_PERIOD): (number | null)[] {
  const out: (number | null)[] = closes.map(() => null);
  if (closes.length <= period) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  // Wilder smoothing: each new bar rolls the average forward by one.
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/**
 * Standard EMA over the closes, SMA-seeded (the StockCharts / TradingView
 * convention): the first value is the simple average of the first `period`
 * closes, then each bar is close·k + prevEMA·(1−k) with k = 2/(period+1).
 * Null until there are `period` bars — a 50-EMA simply doesn't draw on a
 * window shorter than 50 bars rather than starting from thin data.
 */
function computeEMA(closes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = closes.map(() => null);
  if (closes.length < period) return out;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  let ema = sum / period;
  out[period - 1] = ema;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    out[i] = ema;
  }
  return out;
}

// The four EMAs and their colours. Distinct mid-tone hues — legible on both the
// paper and dark grounds — deliberately outside the green/red (direction) and
// lapis/oxblood (levels) families so the ribbon never reads as either.
const EMA_CONFIGS: Array<{ period: number; color: string }> = [
  { period: 9, color: "#d99a2a" }, // amber
  { period: 20, color: "#3f8fd4" }, // blue
  { period: 50, color: "#8f5ae0" }, // violet
];

/** "M…L…" path over a series, skipping the null (insufficient-history) head. */
function seriesPath(
  vals: (number | null)[],
  xf: (i: number) => number,
  yf: (v: number) => number,
): string {
  return vals
    .map((v, i) =>
      v == null
        ? ""
        : `${i === 0 || vals[i - 1] == null ? "M" : "L"}${xf(i).toFixed(1)},${yf(v).toFixed(1)}`,
    )
    .join("");
}

// The rule carries everything now that the zone band is gone: its thickness
// encodes how many times the level was tested.
const zoneWeight = (touches: number) => Math.min(2.6, 1 + touches * 0.16);
const zoneColor = (z: LevelZone) =>
  z.kind === "resistance" ? "var(--ceiling)" : "var(--floor)";

// The fib grid is deliberately quieter than S/R: those are levels the market
// actually turned at, these are geometry drawn off one swing. The three the user
// trades — 38.2 / 50 / 61.8 — carry full weight, the 0/100 anchors and the 23.6
// are hairlines, and 61.8 alone gets the gold because it is the golden ratio.
const fibColor = (l: FibLevel) =>
  l.ratio === 0.618 ? "var(--fib-strong)" : "var(--fib)";
const fibWeight = (l: FibLevel) => (l.ratio === 0.618 ? 1.5 : l.major ? 1.1 : 0.7);
const fibOpacity = (l: FibLevel) => (l.major ? 0.95 : 0.55);
/** Anchors and extensions are dashed; the retracements traders watch are solid. */
const fibDash = (l: FibLevel) =>
  l.kind === "extension" ? "5 4" : l.major ? undefined : "2 4";

/** One line naming the swing the grid hangs off and how far price has come back. */
function describeFib(fib: FibAnalysis): string {
  const dir = fib.direction === "up" ? "up" : "down";
  const where =
    fib.priceRatio >= 0 && fib.priceRatio <= 1
      ? `price at ${(fib.priceRatio * 100).toFixed(1)}% of the leg`
      : fib.priceRatio < 0
        ? "price beyond the end of the leg"
        : "price back past the start of the leg";
  return `fib drawn ${dir} · ${fmtLevel(fib.start.price)} → ${fmtLevel(
    fib.end.price,
  )} · ${where}`;
}

type Props = {
  symbols: string[];
  initialSymbol?: string;
  /** Small-multiple mode: shorter, no symbol switcher, headed by a title. */
  variant?: "full" | "compact";
  /** Display name shown in compact mode (e.g. "S&P 500" for SPY). */
  title?: string;
  /**
   * Friendly names for the switcher, keyed by symbol. Without it the buttons
   * read as raw tickers — fine for a watchlist, less so for a homepage where
   * "Bitcoin" beats "BTC-USD".
   */
  labels?: Record<string, string>;
  /**
   * Whether the volume pane and the derived levels start switched on. Both
   * default off: the chart opens as plain price, and the overlays are there
   * when you go looking for them. A page built around the levels (the
   * watchlist panel is titled for them) turns them back on.
   */
  defaultVolume?: boolean;
  defaultLevels?: boolean;
};

export default function LevelsChart({
  symbols,
  initialSymbol,
  variant = "full",
  title,
  labels,
  defaultVolume = false,
  defaultLevels = false,
}: Props) {
  const { H, padR: PAD_R_LABELS, gap: LABEL_GAP, labelSize, subSize } = SIZES[variant];
  const compact = variant === "compact";
  const [symbol, setSymbol] = useState(initialSymbol ?? symbols[0]);
  const [range, setRange] = useState<ChartRange>(compact ? "1Y" : "3M");

  // Bar size. Held as a pin like the candle/line mode: null follows the range's
  // default, so moving 1M → 1Y doesn't strand you on an interval that window
  // can't serve. An explicit pick survives only while the new range still
  // offers it, which resolveInterval on the server enforces too.
  const [intervalPin, setIntervalPin] = useState<ChartInterval | null>(null);
  const intervalOptions = RANGE_INTERVALS[range];
  const interval: ChartInterval =
    intervalPin && intervalOptions.includes(intervalPin)
      ? intervalPin
      : defaultInterval(range);
  const [showVolume, setShowVolume] = useState(defaultVolume);
  const [showLevels, setShowLevels] = useState(defaultLevels);
  const [showRSI, setShowRSI] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [showFib, setShowFib] = useState(false);
  /**
   * Hand-placed Fibonacci anchors, held in DATA space — an index into `allBars`
   * and a price — not in screen or viewport coordinates. That is what lets the
   * grid stay welded to the bars it was drawn on while you zoom and pan around
   * it. Tagged with the series key so it drops when the picture changes.
   */
  const [fibAnchors, setFibAnchors] = useState<{
    key: string;
    a: { index: number; price: number };
    b: { index: number; price: number };
  } | null>(null);
  const [fibDraft, setFibDraft] = useState<{
    a: { index: number; price: number };
    b: { index: number; price: number };
  } | null>(null);
  // Candles carry direction bar by bar; the line carries shape. On a long
  // window the bodies get thin enough that the shape is what you're reading
  // anyway, so let it be read directly.
  //
  // null means "follow the data" — see `bodiesCollapse` below. Clicking the
  // toggle pins a choice, and a pinned choice outranks the automatic one.
  const [modePin, setModePin] = useState<"candle" | "line" | null>(null);
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // The fetched payload carries the symbol it belongs to, so switching symbols
  // reads as "loading" without synchronously clearing state inside the effect
  // (which triggers a cascading re-render — see react-hooks/set-state-in-effect).
  const [loaded, setLoaded] = useState<{
    key: string;
    bars: ChartPoint[] | null;
    /** Index where the visible window starts — everything before is EMA/RSI warm-up. */
    visibleFrom: number;
    error: string | null;
  } | null>(null);

  // Levels are derived from whatever window is on screen, so switching the
  // range re-reads support/resistance for that horizon rather than pinning
  // year-scale levels onto an intraday chart.
  const key = `${symbol}|${range}|${interval}`;

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}` +
        `&interval=${interval}&warmup=1`,
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => {
        if (cancelled) return;
        const data: ChartPoint[] = j?.data ?? [];
        setLoaded({
          key,
          bars: data.length ? data : null,
          visibleFrom: typeof j?.visibleFrom === "number" ? j.visibleFrom : 0,
          error: data.length ? null : "No price history for this symbol and range.",
        });
      })
      .catch(() => {
        if (!cancelled)
          setLoaded({
            key,
            bars: null,
            visibleFrom: 0,
            error: "Couldn't load price history. Try again shortly.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, range, interval, key]);

  // Stale payloads from a previous symbol/range never render.
  const current = loaded?.key === key ? loaded : null;
  const error = current?.error ?? null;

  // Repair bad prints once, up front, so the candles and the derived levels
  // both read the same corrected series. The full fetch (warm-up + window) is
  // kept for the indicators; everything drawn as price uses only the visible
  // window, so the warm-up bars never appear on screen.
  const allBars = useMemo(
    () => (current?.bars ? sanitizeBars(current.bars) : null),
    [current],
  );
  const visibleFrom = current?.visibleFrom ?? 0;

  /**
   * The slice of `allBars` actually on screen, as [from, to) indices.
   *
   * null means "the window as fetched" — from `visibleFrom` to the end, which
   * is what the range button asked for. Zooming out walks `from` back into the
   * warm-up bars, which are already downloaded for the EMA/RSI runway, so
   * pulling back past the window costs nothing and shows real history rather
   * than empty gutter.
   */
  // Tagged with the series it was measured against. A symbol/range/interval
  // change makes the indices meaningless, and comparing the tag drops them
  // without a reset effect — the same trick `loaded` uses above, and for the
  // same reason (setState inside an effect cascades a second render).
  const [view, setView] = useState<{ key: string; from: number; to: number } | null>(
    null,
  );
  const liveView = view?.key === key ? view : null;

  const total = allBars?.length ?? 0;
  const clampedView = useMemo(() => {
    if (!total) return { from: 0, to: 0 };
    if (!liveView) return { from: Math.min(visibleFrom, total - 1), to: total };
    const from = Math.max(0, Math.min(liveView.from, total - MIN_VISIBLE_BARS));
    const to = Math.max(from + MIN_VISIBLE_BARS, Math.min(liveView.to, total));
    return { from, to };
  }, [liveView, total, visibleFrom]);

  const bars = useMemo(
    () => (allBars ? allBars.slice(clampedView.from, clampedView.to) : null),
    [allBars, clampedView],
  );


  const analysis = useMemo(() => (bars ? deriveLevels(bars) : null), [bars]);

  // Anchored to the dominant swing in the VISIBLE window, so the grid re-derives
  // on every range and symbol change rather than being a drawing that goes stale
  // the moment price makes a new high.
  const manualAnchors = useMemo(
    () =>
      fibDraft ??
      (fibAnchors && fibAnchors.key === key
        ? { a: fibAnchors.a, b: fibAnchors.b }
        : null),
    [fibDraft, fibAnchors, key],
  );

  /**
   * The Fibonacci grid is a drawing, not a derivation. There is no automatic
   * swing: the chart used to pick the window's dominant leg for you, which
   * meant the grid silently re-anchored every time you zoomed — a different
   * answer to a question you never asked. Now nothing appears until you drag
   * one, and what you drew stays exactly where you put it.
   *
   * Built against the whole series (not the slice on screen) and anchored by
   * bar index + price, so zooming and panning move the chart underneath it
   * rather than moving it.
   */
  const fib = useMemo(
    () =>
      manualAnchors && allBars
        ? fibFromAnchors(allBars, manualAnchors.a, manualAnchors.b)
        : null,
    [allBars, manualAnchors],
  );
  const fibOn = showFib && !compact && !!fib;

  // VIX is a calculated index: every bar reports volume 0. Intraday equity bars
  // are also zero outside regular hours, which is real rather than broken — so
  // require a majority of bars to have traded before showing the pane.
  const maxVolume = useMemo(
    () => (bars ? Math.max(0, ...bars.map((b) => b.volume ?? 0)) : 0),
    [bars],
  );
  const hasVolume = useMemo(() => {
    if (!bars || maxVolume <= 0) return false;
    return bars.filter((b) => (b.volume ?? 0) > 0).length >= bars.length * 0.25;
  }, [bars, maxVolume]);
  const volumeOn = showVolume && hasVolume && !compact;

  /**
   * True when the bars have no meaningful open/close spread — the candle body
   * carries no information and the chart renders as a picket fence of wicks.
   *
   * Spot FX is the case that forces this. The market never closes, so Yahoo's
   * daily "open" is last night's close: USD/JPY prints bodies of 1–15% of the
   * day's range where the S&P and the dollar index run 37–84%. Drawn as
   * candles that is a row of hairlines, which reads as missing data rather
   * than as a quiet day.
   *
   * Measured on the median so one flat holiday session can't trip it, and on
   * the visible window so the answer matches what's on screen.
   */
  const bodiesCollapse = useMemo(() => {
    if (!bars || bars.length < 10) return false;
    const ratios = bars
      .map((b) => {
        const range = (b.high ?? b.close) - (b.low ?? b.close);
        if (!(range > 0)) return null;
        return Math.abs(b.close - (b.open ?? b.close)) / range;
      })
      .filter((r): r is number => r !== null)
      .sort((a, b) => a - b);
    if (ratios.length < 10) return false;
    return ratios[Math.floor(ratios.length / 2)] < 0.2;
  }, [bars]);

  // Candles by default again. This used to fall back to a line whenever
  // `bodiesCollapse` was true, because the bodies were hairlines — but that was
  // treating the symptom. Now the body is measured from the prior close on
  // those series, so the candles carry the day's move and there is nothing to
  // route around.
  const mode: "candle" | "line" = modePin ?? "candle";

  // Only the levels in play: a couple either side of the price. A ceiling 60%
  // overhead is real history but says nothing about the next move, and every
  // extra band is one more thing obscuring the candles.
  const perSide = compact ? 1 : ZONES_PER_SIDE;
  const zones = useMemo(() => {
    if (!analysis) return [];
    // "Nearby" is relative to how far this window travels: 10% is a long way
    // on a quiet quarter and nothing across 25 years.
    const spanPct = ((analysis.high - analysis.low) / analysis.price) * 100;
    const maxDist = Math.min(60, Math.max(10, spanPct * 0.4));
    return pickRelevantZones(analysis.zones, analysis.price, perSide, maxDist);
  }, [analysis, perSide]);

  // Levels are derived, not observed — worth being able to take them off and
  // read the price action on its own. The compact variant has no toolbar, so
  // it keeps them. Note the y-scale below still accounts for hidden zones:
  // toggling should reveal and hide lines, not rescale the chart under you.
  const levelsOn = compact || showLevels;

  // Toggling S/R must never resize the plot — the series stays where it is and
  // the level labels draw INSIDE the right edge (with a halo) instead of in a
  // reserved gutter. Only the compact variant, whose levels are always on and
  // which has no toggle, keeps the dedicated label gutter.
  const PAD_R = compact ? PAD_R_LABELS : PAD_R_BARE;

  const scale = useMemo(() => {
    if (!bars || !analysis) return null;

    // sanitizeBars already clamped the bad prints, so the true extremes of the
    // corrected series are trustworthy — no percentile trimming needed, and the
    // axis now matches exactly what gets drawn.
    const lo = Math.min(analysis.low, analysis.price, ...zones.map((z) => z.lo));
    const hi = Math.max(analysis.high, analysis.price, ...zones.map((z) => z.hi));

    // Extension targets deliberately do NOT open the domain. They project beyond
    // the swing by definition, so fitting them stretched the axis until the
    // candles were a strip along the bottom — turning the FIB toggle into a
    // "squash the price action" button. The scale now answers only to price, and
    // targets outside the frame clip at the edge; zoom out to bring them in.

    // Long windows span orders of magnitude — NVDA's full history runs 0.03 to
    // 236, a 7,000x range that flattens 25 years into a line on the bottom
    // axis. Above a few multiples, switch to log so equal % moves get equal
    // vertical space, which is how a price chart should read anyway.
    const useLog = lo > 0 && hi / lo > 4;
    // Price always owns the whole plot. Volume is drawn over the bottom of it
    // rather than carving out a pane, so switching volume on and off leaves
    // every candle exactly where it was.
    const plotH = H - PAD_T - PAD_B;

    let y: (v: number) => number;
    // Inverse of y — turns a pointer position back into a price, which is what
    // the Fibonacci draw tool anchors on.
    let yInv: (py: number) => number;
    if (useLog) {
      const l0 = Math.log(lo);
      const l1 = Math.log(hi);
      const padL = (l1 - l0) * 0.06 || 1;
      const a = l0 - padL;
      const b = l1 + padL;
      y = (v: number) =>
        PAD_T + (1 - (Math.log(Math.max(v, Number.EPSILON)) - a) / (b - a)) * plotH;
      yInv = (py: number) => Math.exp(a + (1 - (py - PAD_T) / plotH) * (b - a));
    } else {
      const pad = (hi - lo) * 0.06 || 1;
      const a = lo - pad;
      const b = hi + pad;
      y = (v: number) => PAD_T + (1 - (v - a) / (b - a)) * plotH;
      yInv = (py: number) => a + (1 - (py - PAD_T) / plotH) * (b - a);
    }

    const x = (i: number) => PAD_L + (i / (bars.length - 1)) * (W - PAD_L - PAD_R);

    // Volume overlay: baseline at the foot of the plot, bars grown upward into
    // the bottom VOL_FRACTION of it.
    const volBase = PAD_T + plotH;
    const volTop = volBase - plotH * VOL_FRACTION;
    const volY = (v: number) =>
      maxVolume > 0
        ? volBase - Math.max(v > 0 ? 1 : 0, (v / maxVolume) * (volBase - volTop))
        : volBase;

    return { x, y, yInv, useLog, volTop, volBase, volY };
  }, [bars, analysis, zones, H, PAD_R, maxVolume]);

  // One "M…L…" through the closes. Built here rather than inline so it isn't
  // re-joined on every hover — the crosshair sets state on pointer move.
  const closePath = useMemo(() => {
    if (!bars || !scale) return "";
    return bars
      .map(
        (b, i) =>
          `${i ? "L" : "M"}${scale.x(i).toFixed(1)},${scale.y(b.close).toFixed(1)}`,
      )
      .join("");
  }, [bars, scale]);

  const labelYs = useMemo(() => {
    if (!scale) return [];
    return layoutLabelYs(
      zones.map((z) => scale.y(z.mid)),
      PAD_T + 10,
      H - PAD_B - 6,
      LABEL_GAP,
    );
  }, [zones, scale, H, LABEL_GAP]);

  // --- drawing ---------------------------------------------------------------
  // Shapes are normalised to the plot rect, so they hold their place when the
  // chart is expanded or the window resized. Scoped per symbol+range: a line
  // drawn on NVDA's 3M is meaningless on Bitcoin's 1Y.
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const toX = useCallback((n: number) => PAD_L + n * plotW, [plotW]);
  const toY = useCallback((n: number) => PAD_T + n * plotH, [plotH]);

  // RSI momentum in its own pane below the price. Unlike volume it can't share
  // the price scale (it's 0–100), so it gets a real pane — but the pane is
  // ADDED below rather than carved out of the price plot, so toggling it grows
  // the chart downward and never moves a candle. No toolbar on the compact
  // variant, so it stays off there.
  // Indicators are computed over the FULL fetch — warm-up bars included — then
  // sliced to the visible window. That's what makes an EMA-50 span an entire
  // one-month view: the average is already converged before the first bar on
  // screen, instead of seeding from the window and fading in partway across.
  const rsi = useMemo(
    () =>
      allBars
        ? computeRSI(allBars.map((b) => b.close)).slice(clampedView.from, clampedView.to)
        : [],
    [allBars, clampedView.from, clampedView.to],
  );
  const rsiOn = showRSI && !compact;

  // EMAs overlay the price directly (same scale as the candles). An EMA only
  // goes missing when the asset itself is younger than the period (fewer total
  // bars than the EMA needs, warm-up included).
  const emas = useMemo(() => {
    if (!allBars) return [];
    const closes = allBars.map((b) => b.close);
    return EMA_CONFIGS.map((cfg) => ({
      ...cfg,
      values: computeEMA(closes, cfg.period).slice(clampedView.from, clampedView.to),
      hasData: closes.length >= cfg.period,
    }));
  }, [allBars, clampedView.from, clampedView.to]);
  const emaOn = showEMA && !compact;
  const activeEmas = emaOn ? emas.filter((e) => e.hasData) : [];
  const rsiTop = H - PAD_B + RSI_GAP;
  const rsiBottom = rsiTop + RSI_H;
  const viewH = H + (rsiOn ? RSI_GAP + RSI_H : 0);
  const rsiY = (v: number) =>
    rsiBottom - (Math.max(0, Math.min(100, v)) / 100) * RSI_H;

  const [tool, setTool] = useState<DrawTool>("none");
  const [color, setColor] = useState<DrawColorId>("blue");

  // Saved drawings come from an external store so the server can render "none"
  // and the client adopt the stored set after mount — reading localStorage
  // during render mismatched hydration on the toolbar, which paints before any
  // price data arrives.
  const getSnapshot = useCallback(() => drawingsSnapshot(symbol, range), [symbol, range]);
  const shapes = useSyncExternalStore(
    subscribeDrawings,
    getSnapshot,
    drawingsServerSnapshot,
  );

  const [draftState, setDraft] = useState<{ key: string; shape: Shape } | null>(null);
  const draft = draftState?.key === key ? draftState.shape : null;

  const commit = useCallback(
    (next: Shape[]) => saveDrawings(symbol, range, next),
    [symbol, range],
  );

  /** Pointer position as a fraction of the plot rect, clamped to it. */
  const norm = useCallback(
    (clientX: number, clientY: number): [number, number] => {
      const svg = svgRef.current;
      if (!svg) return [0, 0];
      const r = svg.getBoundingClientRect();
      const vx = ((clientX - r.left) / r.width) * W;
      // Convert against the full viewBox height (which grows with the RSI
      // pane), then normalise to the price plot — otherwise drawings drift once
      // the pane is on.
      const vy = ((clientY - r.top) / r.height) * viewH;
      return [
        Math.max(0, Math.min(1, (vx - PAD_L) / plotW)),
        Math.max(0, Math.min(1, (vy - PAD_T) / plotH)),
      ];
    },
    [plotW, plotH, viewH],
  );

  // ---- zoom & pan ---------------------------------------------------------
  // Scroll zooms the time axis around the cursor; dragging with the crosshair
  // pans. The price scale is not controlled directly — it re-fits whatever bars
  // end up on screen, which is what makes zooming feel like it reveals detail
  // rather than just stretching the picture.

  /** Fraction (0–1) across the plot for a client x, clamped to the plot. */
  const plotFrac = useCallback(
    (clientX: number) => {
      const el = svgRef.current;
      if (!el) return 0.5;
      const r = el.getBoundingClientRect();
      const scaleX = r.width / W;
      const left = r.left + PAD_L * scaleX;
      const width = (W - PAD_L - PAD_R) * scaleX;
      if (width <= 0) return 0.5;
      return Math.max(0, Math.min(1, (clientX - left) / width));
    },
    [PAD_R],
  );

  const zoomAt = useCallback(
    (deltaY: number, clientX: number) => {
      if (compact || !total) return;
      const cur = clampedView;
      const span = cur.to - cur.from;
      const factor = deltaY > 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const nextSpan = Math.round(
        Math.max(MIN_VISIBLE_BARS, Math.min(total, span * factor)),
      );
      if (nextSpan === span) return;
      // Hold the bar under the cursor still, so zooming reads as moving toward
      // the thing you're pointing at rather than toward the middle.
      const frac = plotFrac(clientX);
      const anchor = cur.from + frac * span;
      let from = Math.round(anchor - frac * nextSpan);
      from = Math.max(0, Math.min(from, total - nextSpan));
      setView({ key, from, to: from + nextSpan });
    },
    [compact, total, clampedView, plotFrac, key],
  );

  // Registered by hand, non-passive. React routes onWheel through a passive
  // root listener, so preventDefault() there is ignored and the page scrolls
  // away underneath the cursor instead of the chart zooming.
  useEffect(() => {
    const el = svgRef.current;
    if (!el || compact) return;
    const handler = (e: WheelEvent) => {
      // Zoom is held behind ⌘ (the Windows key on non-Mac keyboards, which is
      // the same `metaKey`). A bare scroll used to zoom, which meant the chart
      // trapped the page: scrolling down the homepage over it silently
      // rescaled the time axis instead of moving past it. Now a bare scroll
      // just scrolls, and zooming is something you ask for.
      if (!e.metaKey) return;
      // Still let a horizontal trackpad gesture and browser page-zoom
      // (pinch reports as ctrlKey) through untouched.
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      zoomAt(e.deltaY, e.clientX);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [zoomAt, compact]);


  /**
   * Pointer position → an anchor in data space: an absolute index into
   * `allBars` plus the price under the cursor. Storing anchors this way (rather
   * than as screen or 0–1 viewport coordinates, which is how freehand shapes
   * work) is what keeps a drawn Fibonacci grid pinned to its bars through zoom
   * and pan.
   */
  const dataPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = svgRef.current;
      if (!el || !scale || !bars || !bars.length) return null;
      const r = el.getBoundingClientRect();
      const span = clampedView.to - clampedView.from;
      const i = Math.round(plotFrac(clientX) * (span - 1));
      const py = ((clientY - r.top) / r.height) * viewH;
      return {
        index: clampedView.from + Math.max(0, Math.min(span - 1, i)),
        price: scale.yInv(py),
      };
    },
    [scale, bars, clampedView, plotFrac, viewH],
  );

  const fibDrag = useRef<{ a: { index: number; price: number } } | null>(null);

  const pan = useRef<{ x: number; from: number; span: number } | null>(null);


  // --- pinch to zoom, on touch ----------------------------------------------
  // On a phone the chart had no touch gesture of its own, and `touch-action`
  // was left at its default whenever no drawing tool was armed. So a pinch on
  // the chart was a pinch on the *page*: iOS Safari zoomed the whole document,
  // which reads as the site lurching out from under you rather than the chart
  // responding. Two fingers on the plot now scale the time axis and nothing
  // else; one finger still scrolls the page (see touchAction: "pan-y" below).
  const viewRef = useRef(clampedView);
  useEffect(() => {
    viewRef.current = clampedView;
  }, [clampedView]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || compact || !total) return;

    // Measured against the gesture's own starting spread and span rather than
    // the previous frame's, so a slow pinch doesn't accumulate rounding drift
    // and the bar under your fingers stays under your fingers.
    let start: { dist: number; from: number; span: number; frac: number } | null = null;

    const spread = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const midX = (t: TouchList) => (t[0].clientX + t[1].clientX) / 2;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const v = viewRef.current;
      start = {
        dist: spread(e.touches) || 1,
        from: v.from,
        span: v.to - v.from,
        frac: plotFrac(midX(e.touches)),
      };
      // A second finger ends any one-finger pan already in flight, otherwise
      // the pan keeps tracking finger one while the pinch scales underneath it.
      pan.current = null;
      setDragging(false);
      e.preventDefault();
    };

    const onMove = (e: TouchEvent) => {
      if (!start || e.touches.length !== 2) return;
      e.preventDefault();
      const ratio = spread(e.touches) / start.dist;
      if (!Number.isFinite(ratio) || ratio <= 0) return;
      // Fingers apart → fewer bars on screen.
      const nextSpan = Math.round(
        Math.max(MIN_VISIBLE_BARS, Math.min(total, start.span / ratio)),
      );
      const anchor = start.from + start.frac * start.span;
      let from = Math.round(anchor - start.frac * nextSpan);
      from = Math.max(0, Math.min(from, total - nextSpan));
      setView({ key, from, to: from + nextSpan });
    };

    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) start = null;
    };

    // Safari raises its own gesture events for a pinch and will still zoom the
    // document with them, so they have to be refused explicitly — touch-action
    // alone does not stop them on older iOS.
    const stopGesture = (e: Event) => e.preventDefault();

    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    el.addEventListener("gesturestart", stopGesture);
    el.addEventListener("gesturechange", stopGesture);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      el.removeEventListener("gesturestart", stopGesture);
      el.removeEventListener("gesturechange", stopGesture);
    };
  }, [compact, total, plotFrac, key, pan]);
  const onPanMove = useCallback(
    (clientX: number) => {
      const p = pan.current;
      const el = svgRef.current;
      if (!p || !el) return;
      const r = el.getBoundingClientRect();
      const pxPerBar = (r.width * ((W - PAD_L - PAD_R) / W)) / p.span;
      if (!(pxPerBar > 0)) return;
      const shift = Math.round((p.x - clientX) / pxPerBar);
      const from = Math.max(0, Math.min(p.from + shift, total - p.span));
      setView({ key, from, to: from + p.span });
    },
    [total, PAD_R, key],
  );

  // The live stroke lives in a ref as well as state: the window listeners below
  // are attached once per gesture, so they must not close over a stale draft.
  const live = useRef<Shape | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = useCallback(
    (ev: React.PointerEvent<SVGSVGElement>) => {
      // Crosshair is the resting state, so that's the one that pans — arming a
      // drawing tool takes the gesture over, exactly as it already did.
      if (tool === "none") {
        if (compact || !total) return;
        // Second finger of a pinch: the pinch handler owns the gesture, and
        // starting a pan here would fight it.
        if (ev.pointerType === "touch" && !ev.isPrimary) return;
        pan.current = {
          x: ev.clientX,
          from: clampedView.from,
          span: clampedView.to - clampedView.from,
        };
        setDragging(true);
        return;
      }
      if (tool === "fib") {
        const p = dataPoint(ev.clientX, ev.clientY);
        if (!p) return;
        fibDrag.current = { a: p };
        setFibDraft({ a: p, b: p });
        setDragging(true);
        return;
      }
      const [x, y] = norm(ev.clientX, ev.clientY);
      const shape: Shape =
        tool === "line"
          ? { kind: "line", x1: x, y1: y, x2: x, y2: y, color }
          : { kind: "free", pts: [[x, y]], color };
      live.current = shape;
      setDraft({ key, shape });
      setDragging(true);
    },
    [tool, norm, key, color, compact, total, clampedView, dataPoint],
  );

  // Move and release are tracked on the window rather than the SVG, so a stroke
  // that leaves the plot — or a mouse released outside it — still finishes
  // cleanly instead of leaving a dangling draft.
  useEffect(() => {
    if (!dragging) return;

    const onWinMove = (e: PointerEvent) => {
      if (pan.current) {
        onPanMove(e.clientX);
        return;
      }
      if (fibDrag.current) {
        const p = dataPoint(e.clientX, e.clientY);
        if (p) setFibDraft({ a: fibDrag.current.a, b: p });
        return;
      }
      const cur = live.current;
      if (!cur) return;
      const [x, y] = norm(e.clientX, e.clientY);
      // Spread in both branches — rebuilding the freehand shape from scratch
      // dropped its colour on the first move, so every stroke came out blue.
      const next: Shape =
        cur.kind === "line"
          ? { ...cur, x2: x, y2: y }
          : { ...cur, pts: appendPoint(cur.pts, [x, y]) };
      live.current = next;
      setDraft({ key, shape: next });
    };

    const onWinUp = () => {
      if (pan.current) {
        pan.current = null;
        setDragging(false);
        return;
      }
      if (fibDrag.current) {
        const a = fibDrag.current.a;
        fibDrag.current = null;
        setDragging(false);
        setFibDraft((d) => {
          // A click with no drag isn't a swing — keep whatever was there.
          if (d && Math.abs(d.b.index - a.index) >= 2 && d.b.price !== a.price) {
            setFibAnchors({ key, a, b: d.b });
          }
          return null;
        });
        return;
      }
      const cur = live.current;
      live.current = null;
      setDragging(false);
      setDraft(null);
      // A click without a drag isn't a shape — drop zero-length marks.
      const meaningful =
        cur &&
        (cur.kind === "free"
          ? cur.pts.length > 1
          : Math.hypot(cur.x2 - cur.x1, cur.y2 - cur.y1) > 0.01);
      if (cur && meaningful) commit([...shapes, cur]);
    };

    window.addEventListener("pointermove", onWinMove);
    window.addEventListener("pointerup", onWinUp);
    window.addEventListener("pointercancel", onWinUp);
    return () => {
      window.removeEventListener("pointermove", onWinMove);
      window.removeEventListener("pointerup", onWinUp);
      window.removeEventListener("pointercancel", onWinUp);
    };
  }, [dragging, norm, key, shapes, commit, onPanMove, dataPoint]);

  const onMove = useCallback(
    (ev: React.PointerEvent<SVGSVGElement>) => {
      // Crosshair is suppressed while a drawing tool is armed — one pointer
      // can't sensibly do both.
      if (tool !== "none" || dragging) return;

      const svg = svgRef.current;
      if (!svg || !bars || !scale) return;
      const r = svg.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * W;
      const span = scale.x(bars.length - 1) - scale.x(0);
      const i = Math.max(
        0,
        Math.min(bars.length - 1, Math.round(((px - scale.x(0)) / span) * (bars.length - 1))),
      );
      setHover({ i, x: scale.x(i), y: scale.y(bars[i].close) });
    },
    [bars, scale, tool, dragging],
  );

  const undo = useCallback(() => commit(shapes.slice(0, -1)), [shapes, commit]);
  // Clear wipes the hand-placed Fibonacci swing too. Both are "things I drew on
  // this chart"; having one button leave the other behind reads as a bug.
  const clearAll = useCallback(() => {
    commit([]);
    setFibAnchors(null);
    setFibDraft(null);
  }, [commit]);

  // --- expand ----------------------------------------------------------------
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    // Stop the page scrolling behind the overlay.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  // "99.7% to support" is technically true on a 25-year window and useless as
  // a readout — a level that far away tells you nothing about the next move.
  const nearestDrawn = zones.filter((z) => z.mid < (analysis?.price ?? 0))[0];
  const headline = !analysis || !levelsOn
    ? ""
    : analysis.inside && zones.includes(analysis.inside)
      ? `inside a level tested ${analysis.inside.touches}×`
      : nearestDrawn
        ? `${Math.abs(nearestDrawn.distPct).toFixed(1)}% above support`
        : "no tested level nearby";

  // Intraday windows need the time of the last bar; daily and longer only the
  // date — "last bar Jul 17, 2026 09:30" is noise on a monthly chart.
  const lastBar = bars?.[bars.length - 1];
  const lastBarLabel = lastBar
    ? new Date(lastBar.date).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        ...(isIntradayInterval(interval)
          ? ({ hour: "numeric", minute: "2-digit", timeZoneName: "short" } as const)
          : {}),
        timeZone: isIntradayInterval(interval) ? "America/New_York" : "UTC",
      })
    : "—";

  // Unique per instance — two charts on one page must not share a clip path.
  const clipId = `lvl-clip-${symbol.replace(/[^A-Za-z0-9]/g, "")}-${variant}`;

  const hoveredBar = hover && bars ? bars[hover.i] : null;
  const hoveredZone =
    hoveredBar && analysis && levelsOn
      ? zones.find((z) => hoveredBar.close >= z.lo && hoveredBar.close <= z.hi) ?? null
      : null;
  const hoveredFib =
    hoveredBar && fib && fibOn ? nearestFibLevel(fib, hoveredBar.close) : null;

  // What the grid is anchored to and how far the pullback has come — the two
  // things you need to trust a fib. The 161.8% target is named here as well as
  // drawn, since it's the one level that can project off the top of the scale.
  const fibSummary = fibOn && fib ? describeFib(fib) : null;

  /**
   * Anchor index → the index the x-scale speaks. An auto-derived swing is
   * already measured against the visible slice; a hand-drawn one is measured
   * against the whole series (so it can't drift while you zoom), so it has to
   * be shifted into the window before it can be drawn.
   */
  const fibX = (i: number) => (fib?.manual ? i - clampedView.from : i);

  return (
    <div
      className={
        expanded
          ? "fixed inset-0 z-[100] overflow-auto bg-[var(--background)] p-4 sm:p-6"
          : undefined
      }
    >
      <div className="flex flex-wrap items-baseline gap-2 pb-2">
        {compact ? (
          <span className="font-mono text-[11px] font-bold tracking-[0.1em] text-[var(--foreground)]">
            {symbol}
            {title && (
              <span className="ml-2 font-sans text-[12px] font-normal not-italic text-[var(--dim)]">
                {title}
              </span>
            )}
            {analysis && (
              <span className="ml-2 font-mono text-[12px] font-semibold tabular-nums text-[var(--foreground)]">
                {analysis.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </span>
            )}
          </span>
        ) : (
          <>
            {/* Always one row, scrolled rather than wrapped. Thirteen symbols
                wrapped into three ragged rows on a 390px screen, and because
                the buttons are joined by shared borders the broken-off ends
                read as a rendering fault rather than as a second row.
                Not gated on a breakpoint: the same mess appears on a tablet,
                just one row later. Where the row does fit there is nothing to
                scroll, so wide screens look exactly as they did. */}
            <div className="panel-scroll flex min-w-0 max-w-full flex-nowrap overflow-x-auto overscroll-x-contain border border-[var(--border-strong)]">
              {symbols.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSymbol(s)}
                  aria-pressed={s === symbol}
                  className={`shrink-0 whitespace-nowrap border-r border-[var(--border-strong)] px-2.5 py-2 font-mono text-[10px] font-bold tracking-[0.1em] last:border-r-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)] sm:py-1 ${
                    s === symbol
                      ? "bg-[var(--amber)] text-[var(--background)]"
                      : "text-[var(--dim)] hover:bg-[var(--panel)]"
                  }`}
                >
                  {labels?.[s] ?? s}
                </button>
              ))}
            </div>
            {analysis && (
              <span className="font-mono text-[15px] font-semibold tabular-nums text-[var(--foreground)]">
                {analysis.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </span>
            )}
          </>
        )}
        {analysis && (
          <span className="ml-auto shrink-0 whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--faint)]">
            {headline}
          </span>
        )}
      </div>

      {!compact && (
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <RangeSelector value={range} onChange={setRange} loading={!bars && !error} />

          {/* Bar size. Only the sizes this window can actually be drawn at —
              Yahoo won't serve 30-minute bars past 60 days, and an hourly year
              is 2,000 candles of mush — so the options change with the range
              rather than offering a pick that would fail or be unreadable. */}
          {intervalOptions.length > 1 && (
            <div className="flex items-center gap-1">
              <span className="font-mono text-[9px] uppercase tracking-[0.11em] text-[var(--faint)]">
                Bars
              </span>
              <div
                className="flex border border-[var(--border-strong)]"
                role="group"
                aria-label="Bar size"
              >
              {intervalOptions.map((iv) => (
                <button
                  key={iv}
                  type="button"
                  onClick={() => setIntervalPin(iv)}
                  aria-pressed={iv === interval}
                  title={`${INTERVAL_LABELS[iv]} bars`}
                  className={`border-r border-[var(--border-strong)] px-2 py-0.5 font-mono text-[9px] normal-case tracking-[0.11em] last:border-r-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)] ${
                    iv === interval
                      ? "bg-[var(--amber)] text-[var(--background)]"
                      : "text-[var(--dim)] hover:bg-[var(--panel)]"
                  }`}
                >
                  {INTERVAL_SHORT[iv]}
                </button>
              ))}
              </div>
            </div>
          )}

          {/* Drawing tools. Crosshair is the resting state so the chart still
              reads normally; arming a tool takes the pointer over. */}
          <div className="flex border border-[var(--border-strong)]">
            {(
              [
                ["none", "Crosshair", "✛"],
                ["line", "Straight line", "╱"],
                ["free", "Freehand", "✎"],
                ["fib", "Drag a Fibonacci swing", "𝑓"],
              ] as const
            ).map(([t, label, glyph]) => (
              <button
                key={t}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={tool === t}
                onClick={() => {
                  setTool(t);
                  if (t === "fib") setShowFib(true);
                }}
                className={`border-r border-[var(--border-strong)] px-2 py-0.5 font-mono text-[11px] leading-5 last:border-r-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)] ${
                  tool === t
                    ? "bg-[var(--amber)] text-[var(--background)]"
                    : "text-[var(--dim)] hover:bg-[var(--panel)]"
                }`}
              >
                {glyph}
              </button>
            ))}
          </div>

          {/* Ink colour. Shown only when a drawing tool is armed — it means
              nothing while the crosshair is active. */}
          {tool !== "none" && (
            <div className="flex items-center gap-1 border border-[var(--border-strong)] px-1 py-0.5">
              {DRAW_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  aria-label={`${c.label} ink`}
                  aria-pressed={color === c.id}
                  onClick={() => setColor(c.id)}
                  className={`h-4 w-4 rounded-full border ${
                    color === c.id
                      ? "border-[var(--foreground)] ring-1 ring-[var(--foreground)]"
                      : "border-[var(--border-strong)]"
                  }`}
                  style={{ background: c.value }}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={undo}
            disabled={!shapes.length}
            className="border border-[var(--border-strong)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.11em] text-[var(--dim)] hover:bg-[var(--panel)] disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)]"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={!shapes.length && !manualAnchors}
            className="border border-[var(--border-strong)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.11em] text-[var(--dim)] hover:bg-[var(--panel)] disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)]"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setModePin(mode === "line" ? "candle" : "line")}
            aria-pressed={mode === "line"}
            title={
              mode === "line"
                ? bodiesCollapse
                  ? "Switch to candles — body measured from the prior close, since this market has no daily open"
                  : "Switch to candles — open, high, low and close per bar"
                : "Switch to a line through the closes"
            }
            className={`border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.11em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)] ${
              mode === "line"
                ? "border-[var(--amber)] bg-[rgba(255,165,0,0.1)] text-[var(--amber)]"
                : "border-[var(--border-strong)] text-[var(--dim)] hover:bg-[var(--panel)]"
            }`}
          >
            Line
          </button>
          <button
            type="button"
            onClick={() => setShowVolume((v) => !v)}
            disabled={!hasVolume}
            aria-pressed={volumeOn}
            title={
              hasVolume
                ? "Show or hide the volume pane"
                : `${symbol} reports no traded volume`
            }
            className={`border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.11em] disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)] ${
              volumeOn
                ? "border-[var(--amber)] bg-[rgba(255,165,0,0.1)] text-[var(--amber)]"
                : "border-[var(--border-strong)] text-[var(--dim)] hover:bg-[var(--panel)]"
            }`}
          >
            Vol
          </button>
          <button
            type="button"
            onClick={() => setShowLevels((v) => !v)}
            disabled={!analysis}
            aria-pressed={levelsOn}
            title={
              analysis
                ? "Show or hide the derived support and resistance levels"
                : `No levels derived for ${symbol} on this range`
            }
            className={`border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.11em] disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)] ${
              levelsOn
                ? "border-[var(--amber)] bg-[rgba(255,165,0,0.1)] text-[var(--amber)]"
                : "border-[var(--border-strong)] text-[var(--dim)] hover:bg-[var(--panel)]"
            }`}
          >
            S/R
          </button>
          <button
            type="button"
            onClick={() => setShowRSI((v) => !v)}
            disabled={!allBars || allBars.length <= RSI_PERIOD}
            aria-pressed={rsiOn}
            title={
              !allBars || allBars.length <= RSI_PERIOD
                ? "Not enough bars to compute RSI on this range"
                : "Show or hide the RSI momentum pane"
            }
            className={`border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.11em] disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)] ${
              rsiOn
                ? "border-[var(--amber)] bg-[rgba(255,165,0,0.1)] text-[var(--amber)]"
                : "border-[var(--border-strong)] text-[var(--dim)] hover:bg-[var(--panel)]"
            }`}
          >
            RSI
          </button>
          <button
            type="button"
            onClick={() => setShowEMA((v) => !v)}
            disabled={!allBars || allBars.length < EMA_CONFIGS[0].period}
            aria-pressed={emaOn}
            title={
              !allBars || allBars.length < EMA_CONFIGS[0].period
                ? "Not enough bars to compute an EMA on this range"
                : "Show or hide the 9 / 20 / 50 EMAs"
            }
            className={`border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.11em] disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)] ${
              emaOn
                ? "border-[var(--amber)] bg-[rgba(255,165,0,0.1)] text-[var(--amber)]"
                : "border-[var(--border-strong)] text-[var(--dim)] hover:bg-[var(--panel)]"
            }`}
          >
            EMA
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !showFib;
              setShowFib(next);
              // Turning the grid on with nothing drawn would show an empty
              // chart, so it arms the tool; turning it off releases it.
              if (next && !manualAnchors) setTool("fib");
              else if (!next && tool === "fib") setTool("none");
            }}
            aria-pressed={fibOn}
            title={
              fib
                ? "Hide the Fibonacci grid you drew"
                : "Drag a swing on the chart to place a Fibonacci grid — levels fill in between the two points and project past both ends"
            }
            className={`border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.11em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)] ${
              fibOn
                ? "border-[var(--amber)] bg-[rgba(255,165,0,0.1)] text-[var(--amber)]"
                : "border-[var(--border-strong)] text-[var(--dim)] hover:bg-[var(--panel)]"
            }`}
          >
            Fib
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="border border-[var(--border-strong)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.11em] text-[var(--dim)] hover:bg-[var(--panel)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)]"
          >
            {expanded ? "Exit ✕" : "Expand ⤢"}
          </button>

          <span className="font-mono text-[9px] uppercase tracking-[0.11em] text-[var(--faint)]">
            {INTERVAL_LABELS[interval]} bars ·{" "}
            {scale?.useLog
              ? "log scale"
              : levelsOn
                ? "levels re-derived for this window"
                : "levels hidden"}
            {!hasVolume && bars && " · no traded volume"}
            {bodiesCollapse && bars && " · 24h market — bodies run from the prior close"}
            {fibSummary && ` · ${fibSummary}`}
            {showFib && !fib && tool === "fib" && " · drag a swing to place the grid"}
            {liveView && bars && ` · zoomed to ${bars.length} bars — double-click to reset`}
            {shapes.length > 0 && ` · ${shapes.length} drawing${shapes.length > 1 ? "s" : ""}`}
            {/* Zoom is behind a modifier now, so it has to be said somewhere —
                a gesture nobody can discover is the same as not having it. */}
            {bars && " · ⌘ + scroll to zoom"}
          </span>
        </div>
      )}

      <div className="relative border border-[var(--border)] bg-[var(--panel)]">
        {/* S/R legend overlays the top-right of the plot instead of sitting
            in the caption row below the chart. */}
        {!compact && levelsOn && bars && analysis && scale && (
          <div className="pointer-events-none absolute right-2 top-2 z-[2] flex gap-4 font-mono text-[9px] uppercase tracking-[0.11em] text-[var(--dim)]">
            <span>
              <i className="mr-1.5 inline-block h-[2px] w-3.5 align-[3px] bg-[var(--ceiling)]" />
              Resistance
            </span>
            <span>
              <i className="mr-1.5 inline-block h-[2px] w-3.5 align-[3px] bg-[var(--floor)]" />
              Support
            </span>
          </div>
        )}
        {/* EMA legend at the top-left, opposite the S/R legend, so the two
            never overlap. Only the EMAs actually drawn on this window appear. */}
        {activeEmas.length > 0 && (
          <div className="pointer-events-none absolute left-2 top-2 z-[2] flex gap-3 font-mono text-[9px] uppercase tracking-[0.11em] text-[var(--dim)]">
            {activeEmas.map((e) => (
              <span key={`ema-key-${e.period}`}>
                <i
                  className="mr-1.5 inline-block h-[2px] w-3.5 align-[3px]"
                  style={{ background: e.color }}
                />
                EMA {e.period}
              </span>
            ))}
          </div>
        )}
        {!bars && !error && (
          <div className="flex items-center justify-center font-mono text-[11px] text-[var(--faint)]"
            style={{ height: compact ? 150 : 240 }}>
            Loading {symbol}…
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center px-4 text-center font-mono text-[11px] text-[var(--warn)]"
            style={{ height: compact ? 150 : 240 }}>
            {error}
          </div>
        )}

        {bars && analysis && scale && (
          <>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${viewH}`}
              className="block w-full"
              role="img"
              aria-label={
                (levelsOn
                  ? `${symbol} ${range} ${mode === "line" ? "line" : "candlestick"} chart with ${zones.length} derived support and resistance levels`
                  : `${symbol} ${range} ${mode === "line" ? "line" : "candlestick"} chart, support and resistance hidden`) +
                (fibOn && fib
                  ? `, Fibonacci retracements anchored to the ${fib.direction === "up" ? "low to high" : "high to low"} swing`
                  : "")
              }
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
              onPointerDown={onPointerDown}
              onDoubleClick={() => setView(null)}
              style={{
                minHeight: compact ? undefined : expanded ? undefined : 420,
                cursor: tool === "none" ? "crosshair" : "cell",
                // "pan-y" keeps one-finger vertical scrolling with the page —
                // the chart is tall, and a phone reader has to be able to get
                // past it — while handing pinch and horizontal drag to the
                // handlers above. Left undefined, the browser claimed the
                // pinch and zoomed the document instead of the chart.
                touchAction: tool === "none" ? "pan-y" : "none",
                // Without this a drag highlights the zone labels instead of drawing.
                userSelect: tool === "none" ? undefined : "none",
                WebkitUserSelect: tool === "none" ? undefined : "none",
              }}
            >
              <defs>
                <clipPath id={clipId}>
                  <rect
                    x={PAD_L}
                    y={PAD_T}
                    width={W - PAD_L - PAD_R}
                    height={H - PAD_T - PAD_B}
                  />
                </clipPath>
              </defs>
              {/* Just the rule you read the level off, thickening with the
                  number of tests. The band that used to fill the zone's width is
                  gone — the line alone marks where price turned. The rules
                  belong UNDER the price; their labels are drawn after it. */}
              {levelsOn &&
                zones.map((z, i) => {
                  const ym = scale.y(z.mid);
                  return (
                    <line
                      key={`zr-${z.mid}-${i}`}
                      x1={PAD_L}
                      x2={W - PAD_R}
                      y1={ym}
                      y2={ym}
                      stroke={zoneColor(z)}
                      strokeWidth={zoneWeight(z.touches)}
                      opacity={0.9}
                    />
                  );
                })}

              {/* Fibonacci grid, drawn under the price so the candles stay the
                  subject. Geometry off one swing — quieter than S/R, which are
                  levels the market actually turned at. */}
              {fibOn && fib && scale && (
                <g>
                  {/* The golden pocket: 38.2–61.8%, the band most reversals in a
                      healthy trend land inside. A wash, not a fill. */}
                  {(() => {
                    const a = fib.levels.find((l) => l.ratio === 0.382);
                    const b = fib.levels.find((l) => l.ratio === 0.618);
                    if (!a || !b) return null;
                    const y1 = scale.y(a.price);
                    const y2 = scale.y(b.price);
                    return (
                      <rect
                        x={PAD_L}
                        y={Math.min(y1, y2)}
                        width={W - PAD_L - PAD_R}
                        height={Math.abs(y2 - y1)}
                        fill="var(--fib-strong)"
                        opacity={0.07}
                      />
                    );
                  })()}

                  {/* The leg the whole grid hangs off, so you can check the
                      anchor rather than take the levels on faith. */}
                  <line
                    x1={scale.x(fibX(fib.start.index))}
                    y1={scale.y(fib.start.price)}
                    x2={scale.x(fibX(fib.end.index))}
                    y2={scale.y(fib.end.price)}
                    stroke="var(--fib)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    opacity={0.7}
                  />
                  {fib.pullback && fib.extensions.length > 0 && (
                    <line
                      x1={scale.x(fibX(fib.end.index))}
                      y1={scale.y(fib.end.price)}
                      x2={scale.x(fibX(fib.pullback.index))}
                      y2={scale.y(fib.pullback.price)}
                      stroke="var(--fib)"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      opacity={0.45}
                    />
                  )}
                  {[fib.start, fib.end, ...(fib.extensions.length && fib.pullback ? [fib.pullback] : [])].map(
                    (p, i) => (
                      <circle
                        key={`fib-anchor-${i}`}
                        cx={scale.x(fibX(p.index))}
                        cy={scale.y(p.price)}
                        r={2.6}
                        fill="var(--fib-strong)"
                        stroke="var(--panel)"
                        strokeWidth={1}
                      />
                    ),
                  )}

                  {fib.levels.map((l) => (
                    <line
                      key={`fib-${l.ratio}`}
                      x1={PAD_L}
                      x2={W - PAD_R}
                      y1={scale.y(l.price)}
                      y2={scale.y(l.price)}
                      stroke={fibColor(l)}
                      strokeWidth={fibWeight(l)}
                      strokeDasharray={fibDash(l)}
                      opacity={fibOpacity(l)}
                    />
                  ))}

                  {/* Targets sit beyond the swing and can fall off the top of
                      the scale — clipped, because letting them set the domain
                      would squash the price action for the sake of a projection. */}
                  <g clipPath={`url(#${clipId})`}>
                    {fib.extensions.map((l) => (
                      <line
                        key={`fibx-${l.side}-${l.ratio}`}
                        x1={PAD_L}
                        x2={W - PAD_R}
                        y1={scale.y(l.price)}
                        y2={scale.y(l.price)}
                        stroke={fibColor(l)}
                        strokeWidth={fibWeight(l)}
                        strokeDasharray={fibDash(l)}
                        opacity={0.5}
                      />
                    ))}
                  </g>
                </g>
              )}

              {volumeOn && (
                <g>
                  {/* Baseline, then a bar per session, drawn before the price
                      so candles and the line sit over the top. Direction
                      matches the bar above it so the two read as one column. */}
                  <line
                    x1={PAD_L}
                    x2={W - PAD_R}
                    y1={scale.volBase}
                    y2={scale.volBase}
                    stroke="var(--border-strong)"
                    strokeWidth={1}
                    opacity={0.7}
                  />
                  {bars.map((b, i) => {
                    const v = b.volume ?? 0;
                    if (v <= 0) return null;
                    // Same direction rule as the candle body above, so a bar
                    // and its volume never disagree about the day.
                    const o =
                      bodiesCollapse && i > 0
                        ? bars[i - 1].close
                        : (b.open ?? b.close);
                    const up = b.close >= o;
                    const bw = Math.max(
                      1,
                      ((W - PAD_L - PAD_R) / bars.length) * 0.62,
                    );
                    const top = scale.volY(v);
                    return (
                      <rect
                        key={`v-${b.date}`}
                        x={scale.x(i) - bw / 2}
                        y={top}
                        width={bw}
                        height={Math.max(0.5, scale.volBase - top)}
                        fill={up ? "var(--up)" : "var(--down)"}
                        // Lighter than the old dedicated pane: these now sit
                        // under the price action rather than beside it, and
                        // shouldn't compete with it.
                        opacity={0.26}
                      />
                    );
                  })}
                </g>
              )}

              <g clipPath={`url(#${clipId})`}>
              {mode === "line" ? (
                <>
                  {/* Drawn twice: a wider stroke in the panel colour first, so
                      the line reads as sitting on top of the bands rather than
                      dissolving into them, then the line itself over it. */}
                  <path
                    d={closePath}
                    fill="none"
                    stroke="var(--panel)"
                    strokeWidth={4}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <path
                    d={closePath}
                    fill="none"
                    stroke="var(--foreground)"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </>
              ) : (
              bars.map((b, i) => {
                // Where the body starts. Normally the session open — but on a
                // series whose open is unusable (see bodiesCollapse) that field
                // would draw a hairline that hides the day's actual move, so
                // the body runs from the previous close instead. That is the
                // standard reading for a market that never closes: the bar
                // shows where price went since the last one.
                const o =
                  bodiesCollapse && i > 0
                    ? bars[i - 1].close
                    : (b.open ?? b.close);
                const hi = b.high ?? b.close;
                const lo = b.low ?? b.close;
                const up = b.close >= o;
                const bw = Math.max(1.4, ((W - PAD_L - PAD_R) / bars.length) * 0.62);
                const yo = scale.y(o);
                const yc = scale.y(b.close);
                return (
                  <g key={b.date}>
                    <line
                      x1={scale.x(i)}
                      x2={scale.x(i)}
                      y1={scale.y(hi)}
                      y2={scale.y(lo)}
                      stroke="var(--dim)"
                      strokeWidth={0.8}
                      opacity={0.75}
                    />
                    <rect
                      x={scale.x(i) - bw / 2}
                      y={Math.min(yo, yc)}
                      width={bw}
                      height={Math.max(1, Math.abs(yc - yo))}
                      fill={up ? "var(--up)" : "var(--down)"}
                      opacity={0.9}
                    />
                  </g>
                );
              })
              )}
              </g>

              {/* EMA ribbon, clipped to the plot and drawn over the price. */}
              {activeEmas.length > 0 && (
                <g clipPath={`url(#${clipId})`}>
                  {activeEmas.map((e) => (
                    <path
                      key={`ema-${e.period}`}
                      d={seriesPath(e.values, scale.x, scale.y)}
                      fill="none"
                      stroke={e.color}
                      strokeWidth={1.3}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity={0.95}
                    />
                  ))}
                </g>
              )}

              {/* Outside the clip: x(last) lands exactly on the right edge, so
                  a clipped dot would lose its outer half. */}
              {mode === "line" && bars.length > 0 && (
                <circle
                  cx={scale.x(bars.length - 1)}
                  cy={scale.y(bars[bars.length - 1].close)}
                  r={4.5}
                  fill="var(--foreground)"
                  stroke="var(--panel)"
                  strokeWidth={2}
                />
              )}

              {/* Level labels, drawn after the price rather than beside their
                  rules underneath it — sharing that group meant the last few
                  bars painted straight through the text, which on a chart whose
                  price sits at the right edge is exactly where the labels are.
                  The full view has no gutter (the plot runs to the frame so
                  toggling S/R never reflows it), so each label gets an opaque
                  plate to sit on; the compact view has a real gutter and needs
                  none. */}
              {levelsOn && zones.length > 0 && (
                <g pointerEvents="none">
                  {zones.map((z, i) => {
                    const y = labelYs[i];
                    const price = `${fmtLevel(z.lo)}–${fmtLevel(z.hi)}`;
                    const sub = `tested ${z.touches}× · ${z.distPct > 0 ? "+" : ""}${z.distPct}%`;
                    // Mono advance width is a reliable ~0.62em, so the plate can
                    // be sized from the character count without measuring.
                    const textW = Math.max(price.length * labelSize, sub.length * subSize) * 0.62;
                    return (
                      <g key={`zl-${z.mid}-${i}`}>
                        {/* Leader from the rule to its nudged label — outward
                            into the gutter (compact) or inward over the plot. */}
                        <line
                          x1={W - PAD_R}
                          x2={W - PAD_R + (compact ? 5 : -5)}
                          y1={scale.y(z.mid)}
                          y2={y}
                          stroke={zoneColor(z)}
                          strokeWidth={0.8}
                          opacity={0.55}
                        />
                        {!compact && (
                          <rect
                            x={W - PAD_R - 15 - textW}
                            y={y - 8}
                            width={textW + 12}
                            height={27}
                            fill="var(--panel)"
                            opacity={0.94}
                            stroke={zoneColor(z)}
                            strokeWidth={0.6}
                            strokeOpacity={0.4}
                          />
                        )}
                        <text
                          x={W - PAD_R + (compact ? 9 : -9)}
                          y={y + 3}
                          textAnchor={compact ? "start" : "end"}
                          fill="var(--foreground)"
                          fontFamily="var(--mono)"
                          fontSize={labelSize}
                          fontWeight={600}
                        >
                          {price}
                        </text>
                        <text
                          x={W - PAD_R + (compact ? 9 : -9)}
                          y={y + (compact ? 12 : 14)}
                          textAnchor={compact ? "start" : "end"}
                          fill={zoneColor(z)}
                          fontFamily="var(--mono)"
                          fontSize={subSize}
                        >
                          {sub}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Fib labels last, so they read over the candles rather than
                  under them. Left edge — the right is the S/R gutter. */}
              {fibOn && fib && scale && (
                <g pointerEvents="none">
                  {[...fib.levels, ...fib.extensions].map((l) => {
                    const y = scale.y(l.price);
                    // An extension projected off the top of the scale has no
                    // line to label; the caption carries its price instead.
                    if (y < PAD_T + 4 || y > H - PAD_B - 2) return null;
                    return (
                      <text
                        key={`fib-lbl-${l.kind}-${l.side ?? "r"}-${l.ratio}`}
                        x={PAD_L + 5}
                        y={y - 3.5}
                        fontFamily="var(--mono)"
                        fontSize={l.major ? labelSize : subSize + 1}
                        stroke="var(--panel)"
                        strokeWidth={2.5}
                        paintOrder="stroke"
                      >
                        <tspan
                          fill={fibColor(l)}
                          fontWeight={l.major ? 700 : 500}
                          opacity={l.major ? 1 : 0.85}
                        >
                          {/* Arrow from geometry, not from the ratio's sign: a
                              level below the 0% line reads ↘ whichever way the
                              swing was drawn. */}
                          {l.kind === "extension"
                            ? `${l.price < fib.end.price ? "↘" : "↗"} ${l.label}`
                            : l.label}
                        </tspan>
                        <tspan fill="var(--dim)" dx={6}>
                          {fmtLevel(l.price)}
                        </tspan>
                      </text>
                    );
                  })}
                </g>
              )}

              {rsiOn && (
                <g>
                  {/* Overbought / oversold guides at 70 and 30, a faint midline
                      at 50, and the RSI line itself. Drawn as one polyline over
                      the segment where RSI is defined (nulls at the head). */}
                  {[70, 50, 30].map((lvl) => (
                    <line
                      key={`rsi-guide-${lvl}`}
                      x1={PAD_L}
                      x2={W - PAD_R}
                      y1={rsiY(lvl)}
                      y2={rsiY(lvl)}
                      stroke="var(--border-strong)"
                      strokeWidth={lvl === 50 ? 0.6 : 0.9}
                      strokeDasharray={lvl === 50 ? "1 4" : "4 3"}
                      opacity={lvl === 50 ? 0.6 : 0.85}
                    />
                  ))}
                  <path
                    d={rsi
                      .map((v, i) =>
                        v == null
                          ? ""
                          : `${i === 0 || rsi[i - 1] == null ? "M" : "L"}${scale.x(i).toFixed(1)},${rsiY(v).toFixed(1)}`,
                      )
                      .join("")}
                    fill="none"
                    stroke="var(--amber)"
                    strokeWidth={1.4}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <text
                    x={W - PAD_R + 4}
                    y={rsiY(70) + 3}
                    fill="var(--faint)"
                    fontFamily="var(--mono)"
                    fontSize={8}
                  >
                    70
                  </text>
                  <text
                    x={W - PAD_R + 4}
                    y={rsiY(30) + 3}
                    fill="var(--faint)"
                    fontFamily="var(--mono)"
                    fontSize={8}
                  >
                    30
                  </text>
                  <text
                    x={PAD_L}
                    y={rsiTop - 4}
                    fill="var(--faint)"
                    fontFamily="var(--mono)"
                    fontSize={8.5}
                  >
                    RSI {RSI_PERIOD}
                  </text>
                </g>
              )}

              {hover && (
                <>
                  <line
                    x1={hover.x}
                    x2={hover.x}
                    y1={PAD_T}
                    y2={rsiOn ? rsiBottom : H - PAD_B}
                    stroke="var(--faint)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    opacity={0.85}
                  />
                  <circle
                    cx={hover.x}
                    cy={hover.y}
                    r={4.5}
                    fill="var(--amber)"
                    stroke="var(--panel)"
                    strokeWidth={2}
                  />
                  {rsiOn && rsi[hover.i] != null && (
                    <circle
                      cx={hover.x}
                      cy={rsiY(rsi[hover.i] as number)}
                      r={3.5}
                      fill="var(--amber)"
                      stroke="var(--panel)"
                      strokeWidth={1.5}
                    />
                  )}
                </>
              )}
              {/* Annotations, drawn last so they sit above candles and levels. */}
              <g clipPath={`url(#${clipId})`} pointerEvents="none">
                {[...shapes, ...(draft ? [draft] : [])].map((sh, i) =>
                  sh.kind === "line" ? (
                    <line
                      key={i}
                      x1={toX(sh.x1)}
                      y1={toY(sh.y1)}
                      x2={toX(sh.x2)}
                      y2={toY(sh.y2)}
                      stroke={colorValue(sh.color)}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />
                  ) : (
                    <path
                      key={i}
                      d={freehandPath(sh.pts, toX, toY)}
                      fill="none"
                      stroke={colorValue(sh.color)}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ),
                )}
              </g>
            </svg>

            {hover && hoveredBar && (
              <div
                // Follows the hover point vertically but never sits on it: the
                // box floats a gap ABOVE the dot (translateY(-100% - gap) puts
                // its bottom edge above the point regardless of how many rows it
                // has), so it clears the line/candle it describes. When the
                // point is high enough that floating above would clip the top,
                // it flips below instead.
                className="pointer-events-none absolute z-[3] whitespace-nowrap border border-[var(--border-strong)] bg-[var(--background)] px-2 py-1 font-mono text-[10.5px] leading-[1.45]"
                style={{
                  left: `min(calc(100% - 288px), ${(hover.x / W) * 100}% + 12px)`,
                  top: `${(hover.y / viewH) * 100}%`,
                  transform:
                    hover.y / H < 0.34
                      ? "translateY(14px)"
                      : "translateY(calc(-100% - 14px))",
                }}
              >
                <b className="text-[11.5px]">{hoveredBar.close.toFixed(2)}</b>{" "}
                {/* change vs the first bar of the current range, not today's price */}
                {(((hoveredBar.close - bars[0].close) / bars[0].close) * 100).toFixed(1)}%
                <br />
                <span className="text-[var(--faint)]">
                  {new Date(hoveredBar.date).toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    ...(isIntradayInterval(interval)
                      ? ({ hour: "numeric", minute: "2-digit" } as const)
                      : {}),
                    timeZone: isIntradayInterval(interval) ? "America/New_York" : "UTC",
                  })}
                </span>
                {hoveredBar.high != null && hoveredBar.low != null && (
                  <>
                    <br />
                    <span className="text-[var(--dim)]">
                      {/* Don't quote an open the chart doesn't believe. On a
                          collapsed series the feed's open is noise, so the
                          tooltip drops it rather than printing a number that
                          contradicts the body drawn above it. */}
                      {!bodiesCollapse && hoveredBar.open != null && (
                        <>O {hoveredBar.open.toFixed(2)} · </>
                      )}
                      H {hoveredBar.high.toFixed(2)} · L {hoveredBar.low.toFixed(2)}
                    </span>
                  </>
                )}
                {(hoveredBar.volume ?? 0) > 0 && (
                  <>
                    <br />
                    <span className="text-[var(--dim)]">
                      Vol{" "}
                      {volumeLabel(
                        hoveredBar.volume as number,
                        hoveredBar.close,
                        symbol,
                      )}
                    </span>
                  </>
                )}
                {rsiOn && rsi[hover.i] != null && (
                  <>
                    <br />
                    <span className="text-[var(--dim)]">
                      RSI {(rsi[hover.i] as number).toFixed(1)}
                    </span>
                  </>
                )}
                {hoveredZone && (
                  <>
                    <br />
                    <span style={{ color: zoneColor(hoveredZone) }}>
                      in a level tested {hoveredZone.touches}×
                    </span>
                  </>
                )}
                {hoveredFib && (
                  <>
                    <br />
                    <span style={{ color: fibColor(hoveredFib) }}>
                      at the {hoveredFib.label} fib — {hoveredFib.note}
                    </span>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {bars && !analysis && (
          <div className="flex items-center justify-center px-4 text-center font-mono text-[11px] text-[var(--faint)]"
            style={{ height: compact ? 150 : 240 }}>
            Not enough history to derive levels for {symbol}.
          </div>
        )}
      </div>

      {!compact && (
      <div className="flex flex-wrap gap-4 px-1 pt-2 font-mono text-[9px] uppercase tracking-[0.11em] text-[var(--dim)]">
        {/* Where the numbers come from and how fresh they are — the symbol is
            named because "Gold" could reasonably mean spot, GLD or futures. */}
        <span className="basis-full text-[var(--faint)] normal-case tracking-normal">
          Source: Yahoo Finance · {symbol} · last bar {lastBarLabel}
          {" · "}quotes may be delayed
        </span>
      </div>
      )}
    </div>
  );
}
