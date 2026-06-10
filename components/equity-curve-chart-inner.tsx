"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EquityPoint } from "@/lib/paper-portfolio";
import { formatChartDate } from "@/lib/utils";

type TooltipPayloadItem = {
  payload?: EquityPoint;
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
  const { day, full } = formatChartDate(p.date);
  const fmt = (v: number) => `${v >= 100 ? "+" : ""}${(v - 100).toFixed(1)}%`;
  return (
    <div className="border border-[var(--amber)] bg-black px-2 py-1 font-mono text-[11px] text-[var(--foreground)] shadow-[0_4px_14px_rgba(0,0,0,0.8)]">
      <div className="text-[var(--amber)]">{day}</div>
      <div className="text-[var(--amber-dim)]">{full}</div>
      <div className="mt-0.5 text-[var(--dim)]">
        Strategy <span className="text-[#ffa500]">{fmt(p.strategy)}</span>
      </div>
      <div className="text-[var(--dim)]">
        SPX <span className="text-[#22d3ee]">{fmt(p.spx)}</span>
      </div>
    </div>
  );
}

export default function EquityCurveChart({ points }: { points: EquityPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center font-mono text-[11px] text-[var(--dim)]">
        No closed trades yet.
      </div>
    );
  }

  const values = points.flatMap((p) => [p.strategy, p.spx]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.05 || 1;

  return (
    <div className="h-[200px] w-full p-2 sm:h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="2 2" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            tickLine={{ stroke: "#262626" }}
            axisLine={{ stroke: "#262626" }}
            minTickGap={48}
          />
          <YAxis
            domain={[min - pad, max + pad]}
            tick={{ fill: "#71717a", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            tickLine={{ stroke: "#262626" }}
            axisLine={{ stroke: "#262626" }}
            width={48}
            tickFormatter={(v) =>
              typeof v === "number" ? `${(v - 100).toFixed(0)}%` : ""
            }
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "#b45309", strokeDasharray: "3 3" }}
          />
          <Line
            type="stepAfter"
            dataKey="strategy"
            stroke="#ffa500"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="spx"
            stroke="#22d3ee"
            strokeWidth={1}
            strokeDasharray="4 2"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
