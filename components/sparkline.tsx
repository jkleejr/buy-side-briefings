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

  return (
    <div className="relative h-full w-full">
      {/* Inline hover-readout (one line, fits a sparkline width) */}
      {hoverPoint && formatted && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-between bg-black/80 px-1 py-px font-mono text-[9px] leading-tight">
          <span className="truncate text-[var(--amber-dim)]">
            {formatted.full}
            {intraday && formatted.time ? ` · ${formatted.time}` : ""}
          </span>
          <span className="shrink-0 text-[var(--foreground)]">
            ${hoverPoint.close.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
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
    </div>
  );
}
