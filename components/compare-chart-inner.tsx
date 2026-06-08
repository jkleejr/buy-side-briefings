"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatChartDate } from "@/lib/utils";

type ChartPoint = { date: string; close: number };

export type CompareSeries = {
  /** Display label (e.g., "RSP", "SPY"). */
  label: string;
  /** Hex color for the line. */
  color: string;
  /** Raw daily-close series. Will be normalized to start at 100. */
  data: ChartPoint[];
};

export type CompareChartProps = {
  series: CompareSeries[];
  intraday?: boolean;
  /**
   * If true, render the *ratio* (series[0] / series[1] × 100) as a single
   * line instead of two separate normalized lines. Useful for things like
   * RSP/SPY ratio over time, where the ratio direction is the signal.
   */
  asRatio?: boolean;
};

type MergedRow = { date: string; [key: string]: number | string };

/**
 * Merge two series by date and normalize each to 100 at its first point.
 * Missing dates leave the cell undefined; Recharts handles gracefully.
 */
function buildMerged(series: CompareSeries[]): MergedRow[] {
  if (series.length === 0) return [];
  const allDates = new Set<string>();
  const byLabel: Record<string, Map<string, number>> = {};
  for (const s of series) {
    if (s.data.length === 0) continue;
    const first = s.data[0].close;
    const m = new Map<string, number>();
    for (const p of s.data) {
      const norm = (p.close / first) * 100;
      m.set(p.date, norm);
      allDates.add(p.date);
    }
    byLabel[s.label] = m;
  }
  const sorted = [...allDates].sort();
  return sorted.map((date) => {
    const row: MergedRow = { date };
    for (const s of series) {
      const v = byLabel[s.label]?.get(date);
      if (v !== undefined) row[s.label] = v;
    }
    return row;
  });
}

/** Build a ratio series: row[0] / row[1] × 100 of the underlying *raw* closes. */
function buildRatio(series: CompareSeries[]): MergedRow[] {
  if (series.length < 2) return [];
  const [a, b] = series;
  const bByDate = new Map(b.data.map((p) => [p.date, p.close]));
  const rows: MergedRow[] = [];
  let first: number | null = null;
  for (const p of a.data) {
    const bv = bByDate.get(p.date);
    if (bv === undefined || bv === 0) continue;
    const ratio = (p.close / bv) * 100;
    if (first === null) first = ratio;
    rows.push({ date: p.date, Ratio: (ratio / first) * 100 });
  }
  return rows;
}

type TooltipPayloadItem = { name?: string; value?: number; color?: string };

function ChartTooltip({
  active,
  payload,
  label,
  intraday,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  intraday?: boolean;
}) {
  if (!active || !payload || payload.length === 0 || !label) return null;
  const { day, full, time } = formatChartDate(label);
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--panel-head)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--foreground)] shadow-[var(--shadow-2)]">
      <div className="font-medium text-[var(--amber)]">{day}</div>
      <div className="text-[var(--dim)]">{full}</div>
      {intraday && time && <div className="text-[var(--cyan-term)]">{time}</div>}
      <div className="mt-0.5 space-y-0.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-baseline gap-1.5">
            <span style={{ color: p.color }}>●</span>
            <span className="text-[var(--dim)]">{p.name}</span>
            <span className="ml-auto text-[var(--foreground)]">
              {typeof p.value === "number" ? p.value.toFixed(2) : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CompareChartInner({
  series,
  intraday,
  asRatio,
}: CompareChartProps) {
  const data = asRatio ? buildRatio(series) : buildMerged(series);
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] w-full items-center justify-center font-mono text-[11px] text-[var(--dim)] sm:h-[260px]">
        no overlap in data between symbols
      </div>
    );
  }

  // Y-axis domain — give a bit of headroom on both sides.
  const values: number[] = [];
  for (const row of data) {
    for (const k of Object.keys(row)) {
      if (k === "date") continue;
      const v = row[k];
      if (typeof v === "number") values.push(v);
    }
  }
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const pad = (maxV - minV) * 0.05 || 1;

  // Lines to render — either each series normalized, or one ratio line.
  const lines = asRatio
    ? [{ key: "Ratio", color: series[0]?.color ?? "#ffa500" }]
    : series.map((s) => ({ key: s.label, color: s.color }));

  return (
    <div className="h-[220px] w-full sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#242936" strokeDasharray="2 2" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#828a9a", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            tickLine={{ stroke: "#242936" }}
            axisLine={{ stroke: "#242936" }}
            minTickGap={56}
          />
          <YAxis
            domain={[minV - pad, maxV + pad]}
            tick={{ fill: "#828a9a", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            tickLine={{ stroke: "#242936" }}
            axisLine={{ stroke: "#242936" }}
            width={48}
            tickFormatter={(v) => (typeof v === "number" ? v.toFixed(0) : "")}
          />
          <Tooltip
            content={<ChartTooltip intraday={intraday} />}
            cursor={{ stroke: "#d4881a", strokeDasharray: "3 3" }}
          />
          {!asRatio && (
            <Legend
              wrapperStyle={{
                fontFamily: "var(--font-geist-mono)",
                fontSize: 10,
                color: "#828a9a",
              }}
              iconType="plainline"
            />
          )}
          {lines.map((ln) => (
            <Line
              key={ln.key}
              type="monotone"
              dataKey={ln.key}
              stroke={ln.color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
