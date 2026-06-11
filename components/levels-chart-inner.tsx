"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OpportunityLevels } from "@/lib/data";
import { formatChartDate, formatChartTick } from "@/lib/utils";

type SeriesPoint = { date: string; close: number };

type TooltipPayloadItem = { payload?: SeriesPoint };

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
  return (
    <div className="border border-[var(--amber-dim)] bg-black px-2 py-1 font-mono text-[11px] text-[var(--foreground)] shadow-[0_4px_14px_rgba(0,0,0,0.8)]">
      <div className="text-[var(--amber)]">{day}</div>
      <div className="text-[var(--amber-dim)]">{full}</div>
      <div className="mt-0.5 text-[var(--dim)]">
        Close{" "}
        <span className="text-[var(--foreground)]">
          ${p.close.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}

const LABEL_STYLE = {
  fontSize: 9,
  fontFamily: "var(--font-geist-mono)",
} as const;

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/**
 * Price history with the published plan drawn on it: shaded entry zone,
 * red stop line, green target lines. The chart version of "where are we
 * relative to the plan" — no number comparison needed.
 */
export default function LevelsChartInner({
  series,
  levels,
}: {
  series: SeriesPoint[];
  levels: OpportunityLevels;
}) {
  if (series.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center font-mono text-[10px] text-[var(--dim)]">
        no price history for this symbol
      </div>
    );
  }

  // Y domain must include every published level, not just the price range.
  const values = series.map((s) => s.close);
  for (const v of [
    levels.entry_low,
    levels.entry_high,
    levels.stop,
    ...(levels.targets ?? []),
  ]) {
    if (v !== undefined) values.push(v);
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.06 || 1;

  return (
    <div className="h-[220px] w-full sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 10, right: 52, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="levels-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffa500" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#ffa500" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="2 2" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 9, fontFamily: "var(--font-geist-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "#262626" }}
            minTickGap={56}
            tickFormatter={(v) => (typeof v === "string" ? formatChartTick(v) : "")}
          />
          <YAxis
            domain={[min - pad, max + pad]}
            tick={{ fill: "#71717a", fontSize: 9, fontFamily: "var(--font-geist-mono)" }}
            tickLine={{ stroke: "#262626" }}
            axisLine={{ stroke: "#262626" }}
            width={46}
            tickFormatter={(v) => (typeof v === "number" ? fmt(v) : "")}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "#b45309", strokeDasharray: "3 3" }}
          />

          {/* Entry zone — shaded band */}
          {levels.entry_low !== undefined && levels.entry_high !== undefined && (
            <ReferenceArea
              y1={levels.entry_low}
              y2={levels.entry_high}
              fill="#ffa500"
              fillOpacity={0.08}
              stroke="#b45309"
              strokeOpacity={0.4}
              strokeDasharray="3 3"
              label={{
                value: `ENTRY ${fmt(levels.entry_low)}–${fmt(levels.entry_high)}`,
                position: "insideTopRight",
                fill: "#ffa500",
                ...LABEL_STYLE,
              }}
            />
          )}

          {/* Stop — red line */}
          {levels.stop !== undefined && (
            <ReferenceLine
              y={levels.stop}
              stroke="#ef4444"
              strokeDasharray="4 3"
              label={{
                value: `STOP ${fmt(levels.stop)}`,
                position: "right",
                fill: "#ef4444",
                ...LABEL_STYLE,
              }}
            />
          )}

          {/* Targets — green lines */}
          {(levels.targets ?? []).map((t, i) => (
            <ReferenceLine
              key={t}
              y={t}
              stroke="#22c55e"
              strokeDasharray="4 3"
              label={{
                value: `T${i + 1} ${fmt(t)}`,
                position: "right",
                fill: "#22c55e",
                ...LABEL_STYLE,
              }}
            />
          ))}

          <Area
            type="monotone"
            dataKey="close"
            stroke="#ffa500"
            strokeWidth={1.25}
            fill="url(#levels-grad)"
            isAnimationActive={false}
            activeDot={{ r: 3, fill: "#ffa500", stroke: "#000", strokeWidth: 1 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
