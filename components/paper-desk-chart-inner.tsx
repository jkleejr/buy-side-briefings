"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EquityPoint } from "@/lib/paper-desk";
import { formatChartDate, formatChartTick } from "@/lib/utils";

function fmtUsd(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function ChartTooltip({
  active,
  payload,
  startingCash,
}: {
  active?: boolean;
  payload?: Array<{ payload?: EquityPoint }>;
  startingCash: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  if (!p) return null;
  const { day, full } = formatChartDate(p.date);
  const pnl = p.equity - startingCash;
  return (
    <div className="border border-[var(--amber)] bg-black px-2 py-1 font-mono text-[11px] text-[var(--foreground)] shadow-[0_4px_14px_rgba(0,0,0,0.8)]">
      <div className="text-[var(--amber)]">{day}</div>
      <div className="text-[var(--amber-dim)]">{full}</div>
      <div className="mt-0.5 text-[var(--dim)]">
        Equity <span className="text-[#ffa500]">{fmtUsd(p.equity)}</span>
      </div>
      <div className="text-[var(--dim)]">
        P&L{" "}
        <span className={pnl >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}>
          {pnl >= 0 ? "+" : ""}
          {fmtUsd(pnl)}
        </span>
      </div>
    </div>
  );
}

export default function PaperDeskChart({
  points,
  startingCash,
}: {
  points: EquityPoint[];
  startingCash: number;
}) {
  if (points.length < 2) {
    return (
      <div className="flex h-[200px] items-center justify-center px-3 text-center font-mono text-[11px] text-[var(--dim)] sm:h-[220px]">
        Equity curve appears once you&apos;ve held positions across at least two
        days. Place a trade to get started.
      </div>
    );
  }

  const values = points.map((p) => p.equity);
  const min = Math.min(...values, startingCash);
  const max = Math.max(...values, startingCash);
  const pad = (max - min) * 0.05 || 1;

  return (
    <div className="h-[200px] w-full p-2 sm:h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="2 2" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            tickLine={{ stroke: "#262626" }}
            axisLine={{ stroke: "#262626" }}
            minTickGap={48}
            tickFormatter={(v) => (typeof v === "string" ? formatChartTick(v) : "")}
          />
          <YAxis
            domain={[min - pad, max + pad]}
            tick={{ fill: "#71717a", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            tickLine={{ stroke: "#262626" }}
            axisLine={{ stroke: "#262626" }}
            width={56}
            tickFormatter={(v) =>
              typeof v === "number"
                ? `$${(v / 1000).toLocaleString("en-US", { maximumFractionDigits: 0 })}k`
                : ""
            }
          />
          <Tooltip
            content={<ChartTooltip startingCash={startingCash} />}
            cursor={{ stroke: "#b45309", strokeDasharray: "3 3" }}
          />
          <ReferenceLine y={startingCash} stroke="#3f3f46" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="equity"
            stroke="#ffa500"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
