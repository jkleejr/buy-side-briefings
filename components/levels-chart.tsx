"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChartPoint } from "@/lib/chart-ranges";
import { deriveLevels, layoutLabelYs, type LevelZone } from "@/lib/levels";

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
  full: { H: 340, padR: 132, gap: 26, labelSize: 10.5, subSize: 9 },
  compact: { H: 190, padR: 104, gap: 22, labelSize: 9, subSize: 7.5 },
} as const;

/** Band weight scales with touch count — a 12-touch shelf must outweigh a 2. */
const zoneAlpha = (touches: number) => Math.min(0.44, 0.09 + touches * 0.032);
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
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // The fetched payload carries the symbol it belongs to, so switching symbols
  // reads as "loading" without synchronously clearing state inside the effect
  // (which triggers a cascading re-render — see react-hooks/set-state-in-effect).
  const [loaded, setLoaded] = useState<{
    symbol: string;
    bars: ChartPoint[] | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=1Y`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => {
        if (cancelled) return;
        const data: ChartPoint[] = j?.data ?? [];
        setLoaded({
          symbol,
          bars: data.length ? data : null,
          error: data.length ? null : "No price history available for this symbol.",
        });
      })
      .catch(() => {
        if (!cancelled)
          setLoaded({
            symbol,
            bars: null,
            error: "Couldn't load price history. Try again shortly.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // Stale payloads from a previous symbol never render.
  const current = loaded?.symbol === symbol ? loaded : null;
  const bars = current?.bars ?? null;
  const error = current?.error ?? null;

  const analysis = useMemo(() => (bars ? deriveLevels(bars) : null), [bars]);

  // How many labels the margin can stack before layoutLabelYs runs out of room
  // and clamps them on top of each other. Derived from the actual geometry so
  // it stays correct if the chart is resized or the type changes.
  const maxZones = Math.max(3, Math.floor((H - PAD_T - PAD_B - 6) / LABEL_GAP));

  const zones = useMemo(() => {
    if (!analysis) return [];
    if (analysis.zones.length <= maxZones) return analysis.zones;
    // Too many to label legibly — keep the ones nearest the price, which are
    // the ones that can actually be hit. BTC derives 13 over a year.
    return [...analysis.zones]
      .sort((a, b) => Math.abs(a.distPct) - Math.abs(b.distPct))
      .slice(0, maxZones)
      .sort((a, b) => b.mid - a.mid);
  }, [analysis, maxZones]);

  const scale = useMemo(() => {
    if (!bars || !analysis) return null;
    const lo = Math.min(analysis.low, ...zones.map((z) => z.lo));
    const hi = Math.max(analysis.high, ...zones.map((z) => z.hi));
    const pad = (hi - lo) * 0.06 || 1;
    const y = (v: number) =>
      PAD_T + (1 - (v - (lo - pad)) / (hi + pad - (lo - pad))) * (H - PAD_T - PAD_B);
    const x = (i: number) => PAD_L + (i / (bars.length - 1)) * (W - PAD_L - PAD_R);
    return { x, y };
  }, [bars, analysis, zones, H, PAD_R]);

  const labelYs = useMemo(() => {
    if (!scale) return [];
    return layoutLabelYs(
      zones.map((z) => scale.y(z.mid)),
      PAD_T + 10,
      H - PAD_B - 6,
      LABEL_GAP,
    );
  }, [zones, scale, H, LABEL_GAP]);

  const onMove = useCallback(
    (ev: React.PointerEvent<SVGSVGElement>) => {
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
    [bars, scale],
  );

  const hoveredBar = hover && bars ? bars[hover.i] : null;
  const hoveredZone =
    hoveredBar && analysis
      ? zones.find((z) => hoveredBar.close >= z.lo && hoveredBar.close <= z.hi) ?? null
      : null;

  return (
    <div>
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
          <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--faint)]">
            {analysis.inside
              ? `inside a ${analysis.inside.touches}× zone`
              : analysis.nearestSupport
                ? `${Math.abs(analysis.nearestSupport.distPct).toFixed(1)}% to support`
                : "no support below"}
          </span>
        )}
      </div>

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
              aria-label={`${symbol} daily candles over the last year with ${zones.length} derived support and resistance zones`}
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            >
              {zones.map((z, i) => {
                const yt = scale.y(z.hi);
                const yb = scale.y(z.lo);
                return (
                  <g key={`${z.mid}-${i}`}>
                    <rect
                      x={PAD_L}
                      y={yt}
                      width={W - PAD_L - PAD_R}
                      height={Math.max(2.5, yb - yt)}
                      fill={zoneColor(z)}
                      opacity={zoneAlpha(z.touches)}
                    />
                    {/* Leader from the band to its nudged label. */}
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
                      {z.lo}–{z.hi}
                    </text>
                    <text
                      x={W - PAD_R + 9}
                      y={labelYs[i] + (compact ? 12 : 14)}
                      fill={zoneColor(z)}
                      fontFamily="var(--mono)"
                      fontSize={subSize}
                    >
                      {z.touches}× · {z.distPct > 0 ? "+" : ""}
                      {z.distPct}%
                    </text>
                  </g>
                );
              })}

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
            </svg>

            {hover && hoveredBar && (
              <div
                className="pointer-events-none absolute z-[3] whitespace-nowrap border border-[var(--border-strong)] bg-[var(--background)] px-2 py-1 font-mono text-[10.5px] leading-[1.45]"
                style={{
                  left: `min(calc(100% - 168px), ${(hover.x / W) * 100}% + 12px)`,
                  top: `max(4px, calc(${(hover.y / H) * 100}% - 38px))`,
                }}
              >
                <b className="text-[11.5px]">{hoveredBar.close.toFixed(2)}</b>{" "}
                {(((hoveredBar.close - analysis.price) / analysis.price) * 100).toFixed(1)}%
                <br />
                <span className="text-[var(--faint)]">
                  {new Date(hoveredBar.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
                {hoveredZone && (
                  <>
                    <br />
                    <span style={{ color: zoneColor(hoveredZone) }}>
                      in {hoveredZone.lo}–{hoveredZone.hi} · {hoveredZone.touches}×
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
        <span>Band opacity = times tested</span>
        <span className="text-[var(--faint)]">Levels derived from swing pivots · 1Y daily</span>
      </div>
      )}
    </div>
  );
}
