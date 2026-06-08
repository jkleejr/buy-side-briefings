"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatChartDate } from "@/lib/utils";

type SeriesPoint = { date: string; close: number };

export type AssetChartProps = {
  series: SeriesPoint[];
  color: string;
  label: string;
  intraday?: boolean;
};

type TooltipPayloadItem = {
  payload?: SeriesPoint;
};

function ChartTooltip({
  active,
  payload,
  color,
  intraday,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  color: string;
  intraday?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  if (!p) return null;
  const { day, full, time } = formatChartDate(p.date);
  return (
    <div
      className="rounded-[var(--radius-sm)] border bg-[var(--panel-head)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--foreground)] shadow-[var(--shadow-2)]"
      style={{ borderColor: color }}
    >
      <div className="font-medium text-[var(--foreground)]">{day}</div>
      <div className="text-[var(--dim)]">{full}</div>
      {intraday && time && <div className="text-[var(--cyan-term)]">{time}</div>}
      <div className="mt-0.5 text-[var(--dim)]">
        {intraday ? "Price" : "Close"}{" "}
        <span className="text-[var(--foreground)]">
          ${p.close.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}

export default function AssetChartInner({ series, color, label, intraday }: AssetChartProps) {
  if (series.length === 0) {
    return (
      <div className="flex h-full min-h-[120px] items-center justify-center font-mono text-[10px] text-[var(--dim)]">
        no data
      </div>
    );
  }

  const closes = series.map((s) => s.close);
  const minClose = Math.min(...closes);
  const maxClose = Math.max(...closes);
  const pad = (maxClose - minClose) * 0.08 || 1;
  const gradientId = `grad-${label.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div className="h-[110px] w-full sm:h-[150px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#242936" strokeDasharray="2 2" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#828a9a", fontSize: 9, fontFamily: "var(--font-geist-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "#242936" }}
            minTickGap={56}
          />
          <YAxis
            domain={[minClose - pad, maxClose + pad]}
            hide
          />
          <Tooltip
            content={<ChartTooltip color={color} intraday={intraday} />}
            cursor={{ stroke: "#d4881a", strokeDasharray: "3 3" }}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={color}
            strokeWidth={1.25}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            activeDot={{ r: 3, fill: color, stroke: "#000", strokeWidth: 1 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
