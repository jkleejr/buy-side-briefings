"use client";

import { useState, useRef } from "react";
import type { ChartPoint } from "@/lib/chart-ranges";
import { formatChartDate } from "@/lib/utils";

type Props = {
  points: ChartPoint[];
  positive: boolean;
  intraday?: boolean;
  /** Optional override for the line color. Defaults to up=green/down=red. */
  color?: string;
};

const VIEW_W = 240;
const VIEW_H = 48;

export default function Sparkline({ points, positive, intraday, color }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (points.length < 2) {
    return <div className="h-full w-full bg-[var(--panel-head)]" />;
  }

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const stepX = VIEW_W / (points.length - 1);

  const lineColor = color ?? (positive ? "#22c55e" : "#ef4444");
  const fill = positive ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)";

  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = VIEW_H - ((p.close - min) / range) * VIEW_H;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const areaPath = `${path} L${VIEW_W},${VIEW_H} L0,${VIEW_H} Z`;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const idx = Math.round((cursorX / rect.width) * (points.length - 1));
    setHoverIdx(Math.max(0, Math.min(points.length - 1, idx)));
  }

  const hoverPoint = hoverIdx !== null ? points[hoverIdx] : null;
  const hoverX = hoverIdx !== null ? hoverIdx * stepX : null;
  const hoverY =
    hoverPoint !== null
      ? VIEW_H - ((hoverPoint.close - min) / range) * VIEW_H
      : null;

  const formatted = hoverPoint ? formatChartDate(hoverPoint.date) : null;

  // Position popup at the hover X as a percentage; flip anchor when in the
  // right half of the chart so the bubble doesn't overflow off-screen.
  const hoverFrac = hoverIdx !== null ? hoverIdx / (points.length - 1) : 0;
  const anchorRight = hoverFrac > 0.5;

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-full w-full"
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <path d={areaPath} fill={fill} />
        <path d={path} fill="none" stroke={lineColor} strokeWidth={1.25} />
        {hoverX !== null && hoverY !== null && (
          <>
            <line
              x1={hoverX}
              x2={hoverX}
              y1={0}
              y2={VIEW_H}
              stroke="#b45309"
              strokeWidth={0.75}
              strokeDasharray="2 2"
            />
            <circle
              cx={hoverX}
              cy={hoverY}
              r={2.5}
              fill={lineColor}
              stroke="#000"
              strokeWidth={1}
            />
          </>
        )}
      </svg>

      {/* Floating popup tooltip — day / date / (time if intraday) / price.
          Matches the SPY chart's hover style for consistency. */}
      {hoverPoint && formatted && (
        <div
          className="pointer-events-none absolute top-full z-50 mt-1 border bg-[var(--background)] px-2 py-1 font-mono text-[11px] text-[var(--foreground)] shadow-[0_4px_14px_rgba(30,29,26,0.15)]"
          style={{
            borderColor: lineColor,
            [anchorRight ? "right" : "left"]: anchorRight
              ? `${100 - hoverFrac * 100}%`
              : `${hoverFrac * 100}%`,
            minWidth: 110,
            maxWidth: "min(220px, calc(100vw - 24px))",
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
        </div>
      )}
    </div>
  );
}
