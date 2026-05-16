"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatChartDate } from "@/lib/utils";

type SeriesPoint = { date: string; close: number };

export type VerdictMarker = {
  date: string;
  close: number | null;
  emoji: string;
  label: string;
  code: string;
};

type Props = {
  series: SeriesPoint[];
  markers: VerdictMarker[];
};

const MARKER_FILL: Record<string, string> = {
  buy: "#22c55e",
  hold: "#facc15",
  step_aside: "#fb923c",
  bearish: "#ef4444",
};

type TooltipPayloadItem = {
  payload?: SeriesPoint;
  value?: number;
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  if (!p) return null;
  const { day, full, time } = formatChartDate(p.date);
  return (
    <div className="border border-[var(--amber)] bg-black px-2 py-1 font-mono text-[11px] text-[var(--foreground)] shadow-[0_4px_14px_rgba(0,0,0,0.8)]">
      <div className="text-[var(--amber)]">{day}</div>
      <div className="text-[var(--amber-dim)]">{full}</div>
      {time && <div className="text-[var(--cyan-term)]">{time}</div>}
      <div className="mt-0.5 text-[var(--dim)]">
        SPX{" "}
        <span className="text-[var(--foreground)]">
          {p.close.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}

export default function VerdictMarkerChart({ series, markers }: Props) {
  if (series.length === 0) {
    return (
      <div className="flex h-full min-h-[260px] items-center justify-center p-4 text-center font-mono text-[11px] text-[var(--dim)]">
        No SPX history available.
      </div>
    );
  }

  const closes = series.map((s) => s.close);
  const minClose = Math.min(...closes);
  const maxClose = Math.max(...closes);
  const pad = (maxClose - minClose) * 0.05;

  // Snap each marker to the nearest series point so dots sit on the line.
  const dateToClose = new Map(series.map((s) => [s.date, s.close]));
  const renderable = markers
    .map((m) => {
      const close = dateToClose.get(m.date) ?? m.close;
      if (close === null) return null;
      return { ...m, close };
    })
    .filter((m): m is VerdictMarker & { close: number } => m !== null);

  return (
    <div className="h-[260px] w-full p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="2 2" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            tickLine={{ stroke: "#262626" }}
            axisLine={{ stroke: "#262626" }}
            minTickGap={48}
          />
          <YAxis
            domain={[minClose - pad, maxClose + pad]}
            tick={{ fill: "#71717a", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            tickLine={{ stroke: "#262626" }}
            axisLine={{ stroke: "#262626" }}
            width={48}
            tickFormatter={(v) =>
              typeof v === "number" ? v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : ""
            }
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "#b45309", strokeDasharray: "3 3" }}
          />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#ffa500"
            strokeWidth={1.25}
            dot={false}
            isAnimationActive={false}
          />
          {renderable.map((m, i) => (
            <ReferenceDot
              key={`${m.date}-${i}`}
              x={m.date}
              y={m.close}
              r={5}
              fill={MARKER_FILL[m.code] ?? "#a1a1aa"}
              stroke="#000"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
