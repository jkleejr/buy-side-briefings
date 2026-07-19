"use client";

import { useRef, useState } from "react";
import type { ChartPoint } from "@/lib/chart-ranges";
import { formatChartDate } from "@/lib/utils";

// Compact candlestick chart for the watchlist cards — a drop-in replacement for
// <Sparkline> with the same hover popup, so the cards keep their behaviour.
//
// No support/resistance here: the cards are a scan of 19 names, and levels are
// the job of the dedicated chart at the top of the page.
//
// Note the viewBox stretches (preserveAspectRatio="none"), which scales stroke
// widths unevenly — a vertical hairline would come out fat. So wicks and bodies
// are both <rect>, whose widths are explicit in viewBox units and scale with
// everything else.

type Props = {
  points: ChartPoint[];
  /** Fallback tint when a bar has no open (direction unknown). */
  positive: boolean;
  intraday?: boolean;
};

const VIEW_W = 240;
const VIEW_H = 48;
/** Share of each slot the body occupies; the rest is breathing room. */
const BODY_RATIO = 0.62;

export default function Candles({ points, positive, intraday }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (points.length < 2) {
    return <div className="h-full w-full bg-[var(--panel-head)]" />;
  }

  // Candles need the true high/low envelope, not just the close range.
  const lows = points.map((p) => p.low ?? p.close);
  const highs = points.map((p) => p.high ?? p.close);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const range = max - min || 1;

  const slot = VIEW_W / points.length;
  const bodyW = Math.max(0.45, slot * BODY_RATIO);
  const wickW = Math.max(0.18, Math.min(0.9, bodyW * 0.22));
  const y = (v: number) => VIEW_H - ((v - min) / range) * VIEW_H;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const idx = Math.floor(((e.clientX - rect.left) / rect.width) * points.length);
    setHoverIdx(Math.max(0, Math.min(points.length - 1, idx)));
  }

  const hoverPoint = hoverIdx !== null ? points[hoverIdx] : null;
  const formatted = hoverPoint ? formatChartDate(hoverPoint.date) : null;
  const hoverFrac = hoverIdx !== null ? hoverIdx / (points.length - 1) : 0;
  const anchorRight = hoverFrac > 0.5;

  const hoverUp =
    hoverPoint && hoverPoint.open != null ? hoverPoint.close >= hoverPoint.open : positive;
  const hoverColor = hoverUp ? "var(--up)" : "var(--down)";

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-full w-full"
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
        role="img"
        aria-label={`${points.length} candlesticks`}
      >
        {points.map((p, i) => {
          const open = p.open ?? p.close;
          const high = p.high ?? p.close;
          const low = p.low ?? p.close;
          const up = p.close >= open;
          const cx = i * slot + slot / 2;
          const yo = y(open);
          const yc = y(p.close);
          const fill = up ? "var(--up)" : "var(--down)";
          return (
            <g key={p.date}>
              <rect
                x={cx - wickW / 2}
                y={y(high)}
                width={wickW}
                height={Math.max(0.4, y(low) - y(high))}
                fill={fill}
                opacity={0.55}
              />
              <rect
                x={cx - bodyW / 2}
                y={Math.min(yo, yc)}
                /* A doji would otherwise vanish — floor the body height. */
                height={Math.max(0.5, Math.abs(yc - yo))}
                width={bodyW}
                fill={fill}
                opacity={0.92}
              />
            </g>
          );
        })}

        {hoverIdx !== null && (
          <rect
            x={hoverIdx * slot}
            y={0}
            width={slot}
            height={VIEW_H}
            fill="var(--foreground)"
            opacity={0.08}
          />
        )}
      </svg>

      {hoverPoint && formatted && (
        <div
          className="pointer-events-none absolute top-full z-50 mt-1 border bg-[var(--background)] px-2 py-1 font-mono text-[11px] text-[var(--foreground)] shadow-[0_4px_14px_rgba(30,29,26,0.15)]"
          style={{
            borderColor: hoverColor,
            [anchorRight ? "right" : "left"]: anchorRight
              ? `${100 - hoverFrac * 100}%`
              : `${hoverFrac * 100}%`,
            minWidth: 110,
            maxWidth: "min(240px, calc(100vw - 24px))",
          }}
        >
          <div className="text-[var(--amber)]">{formatted.day}</div>
          <div className="text-[var(--amber-dim)]">{formatted.full}</div>
          {intraday && formatted.time && (
            <div className="text-[var(--cyan-term)]">{formatted.time}</div>
          )}
          <div className="mt-0.5 text-[var(--dim)]">
            {intraday ? "Price" : "Close"}{" "}
            <span className="text-[var(--foreground)]">
              ${hoverPoint.close.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </span>
          </div>
          {hoverPoint.open != null && hoverPoint.high != null && hoverPoint.low != null && (
            <div className="text-[var(--faint)]">
              O {hoverPoint.open.toFixed(2)} · H {hoverPoint.high.toFixed(2)} · L{" "}
              {hoverPoint.low.toFixed(2)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
