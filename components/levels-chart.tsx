"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { INTRADAY_RANGES, type ChartPoint, type ChartRange } from "@/lib/chart-ranges";
import {
  deriveLevels,
  layoutLabelYs,
  pickRelevantZones,
  sanitizeBars,
  type LevelZone,
} from "@/lib/levels";
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

/** Full study view vs. the homepage's small multiples. */
const SIZES = {
  full: { H: 460, padR: 132, gap: 26, labelSize: 10.5, subSize: 9 },
  compact: { H: 190, padR: 104, gap: 22, labelSize: 9, subSize: 7.5 },
} as const;

/** Bar interval per range — mirrors RANGE_PARAMS in lib/markets.ts. */
const BAR_INTERVAL: Record<string, string> = {
  "1D": "5-minute bars",
  "5D": "30-minute bars",
  "1M": "daily bars",
  "3M": "daily bars",
  "1Y": "daily bars",
  "5Y": "weekly bars",
  ALL: "monthly bars",
};

/** How many levels to show either side of the price. */
const ZONES_PER_SIDE = 2;

/** Share of the plot given to the volume pane when it's on. */
const VOL_FRACTION = 0.2;
/** Gap between the price area and the volume pane. */
const VOL_GAP = 10;

/** Level prices with thousands separators — "7,421.82" scans, "7421.82" doesn't. */
function fmtLevel(v: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

// A filled band heavy enough to encode strength swamps the candles behind it,
// so weight moved to the rule: the fill is only a faint hint of the zone's
// width, and thickness carries how many times the level was tested.
const zoneAlpha = (touches: number) => Math.min(0.13, 0.05 + touches * 0.008);
const zoneWeight = (touches: number) => Math.min(2.6, 1 + touches * 0.16);
const zoneColor = (z: LevelZone) =>
  z.kind === "resistance" ? "var(--ceiling)" : "var(--floor)";

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
};

export default function LevelsChart({
  symbols,
  initialSymbol,
  variant = "full",
  title,
  labels,
}: Props) {
  const { H, padR: PAD_R, gap: LABEL_GAP, labelSize, subSize } = SIZES[variant];
  const compact = variant === "compact";
  const [symbol, setSymbol] = useState(initialSymbol ?? symbols[0]);
  const [range, setRange] = useState<ChartRange>(compact ? "1Y" : "3M");
  const [showVolume, setShowVolume] = useState(true);
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // The fetched payload carries the symbol it belongs to, so switching symbols
  // reads as "loading" without synchronously clearing state inside the effect
  // (which triggers a cascading re-render — see react-hooks/set-state-in-effect).
  const [loaded, setLoaded] = useState<{
    key: string;
    bars: ChartPoint[] | null;
    error: string | null;
  } | null>(null);

  // Levels are derived from whatever window is on screen, so switching the
  // range re-reads support/resistance for that horizon rather than pinning
  // year-scale levels onto an intraday chart.
  const key = `${symbol}|${range}`;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => {
        if (cancelled) return;
        const data: ChartPoint[] = j?.data ?? [];
        setLoaded({
          key,
          bars: data.length ? data : null,
          error: data.length ? null : "No price history for this symbol and range.",
        });
      })
      .catch(() => {
        if (!cancelled)
          setLoaded({
            key,
            bars: null,
            error: "Couldn't load price history. Try again shortly.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, range, key]);

  // Stale payloads from a previous symbol/range never render.
  const current = loaded?.key === key ? loaded : null;
  const error = current?.error ?? null;

  // Repair bad prints once, up front, so the candles and the derived levels
  // both read the same corrected series.
  const bars = useMemo(
    () => (current?.bars ? sanitizeBars(current.bars) : null),
    [current],
  );

  const analysis = useMemo(() => (bars ? deriveLevels(bars) : null), [bars]);

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

  const scale = useMemo(() => {
    if (!bars || !analysis) return null;

    // sanitizeBars already clamped the bad prints, so the true extremes of the
    // corrected series are trustworthy — no percentile trimming needed, and the
    // axis now matches exactly what gets drawn.
    const lo = Math.min(analysis.low, analysis.price, ...zones.map((z) => z.lo));
    const hi = Math.max(analysis.high, analysis.price, ...zones.map((z) => z.hi));

    // Long windows span orders of magnitude — NVDA's full history runs 0.03 to
    // 236, a 7,000x range that flattens 25 years into a line on the bottom
    // axis. Above a few multiples, switch to log so equal % moves get equal
    // vertical space, which is how a price chart should read anyway.
    const useLog = lo > 0 && hi / lo > 4;
    // The volume pane eats the bottom of the plot, so the price scale has to be
    // told about it — otherwise candles draw straight through the bars.
    const volH = volumeOn ? (H - PAD_T - PAD_B) * VOL_FRACTION : 0;
    const plotH = H - PAD_T - PAD_B - volH - (volumeOn ? VOL_GAP : 0);

    let y: (v: number) => number;
    if (useLog) {
      const l0 = Math.log(lo);
      const l1 = Math.log(hi);
      const padL = (l1 - l0) * 0.06 || 1;
      const a = l0 - padL;
      const b = l1 + padL;
      y = (v: number) =>
        PAD_T + (1 - (Math.log(Math.max(v, Number.EPSILON)) - a) / (b - a)) * plotH;
    } else {
      const pad = (hi - lo) * 0.06 || 1;
      const a = lo - pad;
      const b = hi + pad;
      y = (v: number) => PAD_T + (1 - (v - a) / (b - a)) * plotH;
    }

    const x = (i: number) => PAD_L + (i / (bars.length - 1)) * (W - PAD_L - PAD_R);

    // Volume pane: baseline at the bottom, bars grown upward from it.
    const volTop = PAD_T + plotH + (volumeOn ? VOL_GAP : 0);
    const volBase = H - PAD_B;
    const volY = (v: number) =>
      maxVolume > 0
        ? volBase - Math.max(v > 0 ? 1 : 0, (v / maxVolume) * (volBase - volTop))
        : volBase;

    return { x, y, useLog, volTop, volBase, volY };
  }, [bars, analysis, zones, H, PAD_R, volumeOn, maxVolume]);

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
      const vy = ((clientY - r.top) / r.height) * H;
      return [
        Math.max(0, Math.min(1, (vx - PAD_L) / plotW)),
        Math.max(0, Math.min(1, (vy - PAD_T) / plotH)),
      ];
    },
    [plotW, plotH, H],
  );

  // The live stroke lives in a ref as well as state: the window listeners below
  // are attached once per gesture, so they must not close over a stale draft.
  const live = useRef<Shape | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = useCallback(
    (ev: React.PointerEvent<SVGSVGElement>) => {
      if (tool === "none") return;
      const [x, y] = norm(ev.clientX, ev.clientY);
      const shape: Shape =
        tool === "line"
          ? { kind: "line", x1: x, y1: y, x2: x, y2: y, color }
          : { kind: "free", pts: [[x, y]], color };
      live.current = shape;
      setDraft({ key, shape });
      setDragging(true);
    },
    [tool, norm, key, color],
  );

  // Move and release are tracked on the window rather than the SVG, so a stroke
  // that leaves the plot — or a mouse released outside it — still finishes
  // cleanly instead of leaving a dangling draft.
  useEffect(() => {
    if (!dragging) return;

    const onWinMove = (e: PointerEvent) => {
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
  }, [dragging, norm, key, shapes, commit]);

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
  const clearAll = useCallback(() => commit([]), [commit]);

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
  const headline = !analysis
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
        ...(INTRADAY_RANGES.has(range)
          ? ({ hour: "numeric", minute: "2-digit", timeZoneName: "short" } as const)
          : {}),
        timeZone: INTRADAY_RANGES.has(range) ? "America/New_York" : "UTC",
      })
    : "—";

  // Unique per instance — two charts on one page must not share a clip path.
  const clipId = `lvl-clip-${symbol.replace(/[^A-Za-z0-9]/g, "")}-${variant}`;

  const hoveredBar = hover && bars ? bars[hover.i] : null;
  const hoveredZone =
    hoveredBar && analysis
      ? zones.find((z) => hoveredBar.close >= z.lo && hoveredBar.close <= z.hi) ?? null
      : null;

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
            <div className="flex flex-wrap border border-[var(--border-strong)]">
              {symbols.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSymbol(s)}
                  aria-pressed={s === symbol}
                  className={`border-r border-[var(--border-strong)] px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.1em] last:border-r-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)] ${
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

          {/* Drawing tools. Crosshair is the resting state so the chart still
              reads normally; arming a tool takes the pointer over. */}
          <div className="flex border border-[var(--border-strong)]">
            {(
              [
                ["none", "Crosshair", "✛"],
                ["line", "Straight line", "╱"],
                ["free", "Freehand", "✎"],
              ] as const
            ).map(([t, label, glyph]) => (
              <button
                key={t}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={tool === t}
                onClick={() => setTool(t)}
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
            disabled={!shapes.length}
            className="border border-[var(--border-strong)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.11em] text-[var(--dim)] hover:bg-[var(--panel)] disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)]"
          >
            Clear
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
            onClick={() => setExpanded((v) => !v)}
            className="border border-[var(--border-strong)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.11em] text-[var(--dim)] hover:bg-[var(--panel)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)]"
          >
            {expanded ? "Exit ✕" : "Expand ⤢"}
          </button>

          <span className="font-mono text-[9px] uppercase tracking-[0.11em] text-[var(--faint)]">
            {INTRADAY_RANGES.has(range) ? "intraday bars" : BAR_INTERVAL[range]} ·{" "}
            {scale?.useLog ? "log scale" : "levels re-derived for this window"}
            {!hasVolume && bars && " · no traded volume"}
            {shapes.length > 0 && ` · ${shapes.length} drawing${shapes.length > 1 ? "s" : ""}`}
          </span>
        </div>
      )}

      <div className="relative border border-[var(--border)] bg-[var(--panel)]">
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
              viewBox={`0 0 ${W} ${H}`}
              className="block w-full"
              role="img"
              aria-label={`${symbol} ${range} candlestick chart with ${zones.length} derived support and resistance levels`}
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
              onPointerDown={onPointerDown}
              style={{
                minHeight: compact ? undefined : expanded ? undefined : 420,
                cursor: tool === "none" ? "crosshair" : "cell",
                touchAction: tool === "none" ? undefined : "none",
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
              {zones.map((z, i) => {
                const yt = scale.y(z.hi);
                const yb = scale.y(z.lo);
                const ym = scale.y(z.mid);
                return (
                  <g key={`${z.mid}-${i}`}>
                    {/* Faint hint of how wide the zone is... */}
                    <rect
                      x={PAD_L}
                      y={yt}
                      width={W - PAD_L - PAD_R}
                      height={Math.max(2, yb - yt)}
                      fill={zoneColor(z)}
                      opacity={zoneAlpha(z.touches)}
                    />
                    {/* ...and a rule you can actually read the level off,
                        thickening with the number of tests. */}
                    <line
                      x1={PAD_L}
                      x2={W - PAD_R}
                      y1={ym}
                      y2={ym}
                      stroke={zoneColor(z)}
                      strokeWidth={zoneWeight(z.touches)}
                      opacity={0.9}
                    />
                    {/* Leader from the rule to its nudged label. */}
                    <line
                      x1={W - PAD_R}
                      x2={W - PAD_R + 5}
                      y1={scale.y(z.mid)}
                      y2={labelYs[i]}
                      stroke={zoneColor(z)}
                      strokeWidth={0.8}
                      opacity={0.55}
                    />
                    <text
                      x={W - PAD_R + 9}
                      y={labelYs[i] + 3}
                      fill="var(--foreground)"
                      fontFamily="var(--mono)"
                      fontSize={labelSize}
                      fontWeight={600}
                    >
                      {fmtLevel(z.lo)}–{fmtLevel(z.hi)}
                    </text>
                    <text
                      x={W - PAD_R + 9}
                      y={labelYs[i] + (compact ? 12 : 14)}
                      fill={zoneColor(z)}
                      fontFamily="var(--mono)"
                      fontSize={subSize}
                    >
                      tested {z.touches}× · {z.distPct > 0 ? "+" : ""}
                      {z.distPct}%
                    </text>
                  </g>
                );
              })}

              {volumeOn && (
                <g>
                  {/* Baseline, then a bar per session. Direction matches the
                      candle above it so the two read as one column. */}
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
                    const o = b.open ?? b.close;
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
                        opacity={0.4}
                      />
                    );
                  })}
                  <text
                    x={W - PAD_R + 9}
                    y={scale.volTop + 9}
                    fill="var(--faint)"
                    fontFamily="var(--mono)"
                    fontSize={8.5}
                  >
                    vol · peak {fmtVolume(maxVolume)}
                  </text>
                </g>
              )}

              <g clipPath={`url(#${clipId})`}>
              {bars.map((b, i) => {
                const o = b.open ?? b.close;
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
              })}
              </g>

              {hover && (
                <>
                  <line
                    x1={hover.x}
                    x2={hover.x}
                    y1={PAD_T}
                    y2={H - PAD_B}
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
                className="pointer-events-none absolute z-[3] whitespace-nowrap border border-[var(--border-strong)] bg-[var(--background)] px-2 py-1 font-mono text-[10.5px] leading-[1.45]"
                style={{
                  left: `min(calc(100% - 288px), ${(hover.x / W) * 100}% + 12px)`,
                  top: `max(4px, calc(${(hover.y / H) * 100}% - 38px))`,
                }}
              >
                <b className="text-[11.5px]">{hoveredBar.close.toFixed(2)}</b>{" "}
                {(((hoveredBar.close - analysis.price) / analysis.price) * 100).toFixed(1)}%
                <br />
                <span className="text-[var(--faint)]">
                  {new Date(hoveredBar.date).toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    ...(INTRADAY_RANGES.has(range)
                      ? ({ hour: "numeric", minute: "2-digit" } as const)
                      : {}),
                    timeZone: INTRADAY_RANGES.has(range) ? "America/New_York" : "UTC",
                  })}
                </span>
                {hoveredBar.open != null &&
                  hoveredBar.high != null &&
                  hoveredBar.low != null && (
                    <>
                      <br />
                      <span className="text-[var(--dim)]">
                        O {hoveredBar.open.toFixed(2)} · H {hoveredBar.high.toFixed(2)} · L{" "}
                        {hoveredBar.low.toFixed(2)}
                      </span>
                    </>
                  )}
                {(hoveredBar.volume ?? 0) > 0 && (
                  <>
                    <br />
                    <span className="text-[var(--dim)]">
                      Vol {fmtVolume(hoveredBar.volume as number)}
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
        <span>
          <i className="mr-1.5 inline-block h-2.5 w-2.5 align-[-1px] bg-[var(--ceiling)] opacity-50" />
          Resistance
        </span>
        <span>
          <i className="mr-1.5 inline-block h-2.5 w-2.5 align-[-1px] bg-[var(--floor)] opacity-50" />
          Support
        </span>
        <span>A level is a price the market kept turning at</span>
        <span className="text-[var(--faint)]">
          Nearest {ZONES_PER_SIDE} levels each side · derived from swing pivots
        </span>
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
