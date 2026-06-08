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
  buy: "#0ecb81",
  hold: "#ffb224",
  step_aside: "#fb923c",
  bearish: "#f6465d",
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
    <div className="rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--panel-head)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--foreground)] shadow-[var(--shadow-2)]">
      <div className="font-medium text-[var(--amber)]">{day}</div>
      <div className="text-[var(--dim)]">{full}</div>
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
      <div className="flex h-full min-h-[200px] sm:h-[260px] items-center justify-center p-4 text-center font-mono text-[11px] text-[var(--dim)]">
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
    <div className="h-[200px] sm:h-[260px] w-full p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#242936" strokeDasharray="2 2" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#828a9a", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            tickLine={{ stroke: "#242936" }}
            axisLine={{ stroke: "#242936" }}
            minTickGap={48}
          />
          <YAxis
            domain={[minClose - pad, maxClose + pad]}
            tick={{ fill: "#828a9a", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            tickLine={{ stroke: "#242936" }}
            axisLine={{ stroke: "#242936" }}
            width={48}
            tickFormatter={(v) =>
              typeof v === "number" ? v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : ""
            }
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "#d4881a", strokeDasharray: "3 3" }}
          />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#ffb224"
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
