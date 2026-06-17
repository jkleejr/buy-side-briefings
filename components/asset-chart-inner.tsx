"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Customized,
  ResponsiveContainer,
  Tooltip,
  usePlotArea,
  XAxis,
  YAxis,
} from "recharts";
import { formatChartDate, formatChartTick } from "@/lib/utils";

type SeriesPoint = { date: string; close: number; volume?: number };

export type AssetChartProps = {
  series: SeriesPoint[];
  color: string;
  label: string;
  intraday?: boolean;
  /** Overlay a horizontal volume-at-price profile (volume bucketed by price). */
  showVolumeProfile?: boolean;
  /** Render a volume histogram along the bottom of the chart. Bars are always
   *  drawn when volume data exists; the global header toggle (data-volume on
   *  <html>) hides them via CSS, so the show/hide is instant and site-wide. */
  showVolume?: boolean;
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
      className="border bg-black px-2 py-1 font-mono text-[11px] text-[var(--foreground)] shadow-[0_4px_14px_rgba(0,0,0,0.8)]"
      style={{ borderColor: color }}
    >
      <div className="text-[var(--amber)]">{day}</div>
      <div className="text-[var(--amber-dim)]">{full}</div>
      {intraday && time && <div className="text-[var(--cyan-term)]">{time}</div>}
      <div className="mt-0.5 text-[var(--dim)]">
        {intraday ? "Price" : "Close"}{" "}
        <span className="text-[var(--foreground)]">
          ${p.close.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
      </div>
      {p.volume != null && p.volume > 0 && (
        <div className="text-[var(--dim)]">
          Vol{" "}
          <span className="text-[var(--foreground)]">{formatVolume(p.volume)}</span>
        </div>
      )}
    </div>
  );
}

/** Compact volume formatting: 1.2B / 34.5M / 882K. */
function formatVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toLocaleString("en-US", { maximumFractionDigits: 1 })}B`;
  if (v >= 1e6) return `${(v / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 })}M`;
  if (v >= 1e3) return `${(v / 1e3).toLocaleString("en-US", { maximumFractionDigits: 0 })}K`;
  return v.toLocaleString("en-US");
}

const PROFILE_BINS = 28;

export default function AssetChartInner({
  series,
  color,
  label,
  intraday,
  showVolumeProfile,
  showVolume,
}: AssetChartProps) {
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

  // Volume-at-price profile: bucket the (padded) price domain into bins and sum
  // each bar's volume into the bin holding its close. The domain matches the
  // YAxis below so the bars line up exactly with the price scale.
  const domainLo = minClose - pad;
  const domainHi = maxClose + pad;
  const bins = new Array<number>(PROFILE_BINS).fill(0);
  let hasVolume = false;
  if (showVolumeProfile && domainHi > domainLo) {
    for (const s of series) {
      if (!s.volume || s.volume <= 0) continue;
      hasVolume = true;
      let idx = Math.floor(((s.close - domainLo) / (domainHi - domainLo)) * PROFILE_BINS);
      idx = Math.max(0, Math.min(PROFILE_BINS - 1, idx));
      bins[idx] += s.volume;
    }
  }
  const maxBin = Math.max(...bins);
  const renderProfile = showVolumeProfile && hasVolume && maxBin > 0;

  // The overlay layer. recharts 3 exposes the plotting rect via usePlotArea();
  // since our YAxis domain is a known linear range, we map price→pixel directly
  // (top = domainHi, bottom = domainLo). Right-anchored, low opacity so the
  // price line stays readable; the heaviest band (point of control) is amber.
  const VolumeProfile = () => {
    const plot = usePlotArea();
    if (!plot || plot.height <= 0 || domainHi <= domainLo) return null;
    const plotRight = plot.x + plot.width;
    const maxBarW = plot.width * 0.32;
    const yOf = (price: number) =>
      plot.y + (1 - (price - domainLo) / (domainHi - domainLo)) * plot.height;
    return (
      <g>
        {bins.map((v, i) => {
          if (v <= 0) return null;
          const pBot = domainLo + (i / PROFILE_BINS) * (domainHi - domainLo);
          const pTop = domainLo + ((i + 1) / PROFILE_BINS) * (domainHi - domainLo);
          const yTop = yOf(pTop);
          const yBot = yOf(pBot);
          const y = Math.min(yTop, yBot);
          const h = Math.max(1, Math.abs(yBot - yTop) - 1);
          const w = (v / maxBin) * maxBarW;
          const isPoc = v === maxBin;
          return (
            <rect
              key={i}
              x={plotRight - w}
              y={y}
              width={w}
              height={h}
              fill={isPoc ? "#ffa500" : color}
              opacity={isPoc ? 0.32 : 0.16}
            />
          );
        })}
      </g>
    );
  };

  // Volume histogram along the bottom ~22% of the plot. Bars are colored by the
  // day's direction (close vs. prior close) and drawn at low opacity so the
  // price line stays readable. Aligned to each point's x so they sit under it.
  const vols = series.map((s) => s.volume ?? 0);
  const maxVol = Math.max(...vols, 0);
  const renderVolume = !!showVolume && maxVol > 0;

  const VolumeBars = () => {
    const plot = usePlotArea();
    if (!plot || plot.width <= 0 || plot.height <= 0) return null;
    const n = series.length;
    if (n === 0) return null;
    const bandH = plot.height * 0.22;
    const bottom = plot.y + plot.height;
    const bandTop = bottom - bandH;
    const step = n > 1 ? plot.width / (n - 1) : 0;
    const barW = Math.max(1, (n > 1 ? plot.width / n : plot.width * 0.5) * 0.6);
    return (
      <g className="chart-volume-bars">
        <line
          x1={plot.x}
          y1={bandTop}
          x2={plot.x + plot.width}
          y2={bandTop}
          stroke="#1f1f1f"
          strokeWidth={1}
        />
        {series.map((s, i) => {
          const v = s.volume ?? 0;
          if (v <= 0) return null;
          const h = (v / maxVol) * bandH;
          const cx = n > 1 ? plot.x + i * step : plot.x + plot.width / 2;
          const prev = i > 0 ? series[i - 1].close : s.close;
          const up = s.close >= prev;
          return (
            <rect
              key={i}
              x={cx - barW / 2}
              y={bottom - h}
              width={barW}
              height={h}
              fill={up ? "#22c55e" : "#ef4444"}
              opacity={0.32}
            />
          );
        })}
      </g>
    );
  };

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
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="2 2" vertical={false} />
          {renderProfile && <Customized component={VolumeProfile} />}
          {renderVolume && <Customized component={VolumeBars} />}
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 9, fontFamily: "var(--font-geist-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "#262626" }}
            minTickGap={56}
            tickFormatter={(v) => (typeof v === "string" ? formatChartTick(v, intraday) : "")}
          />
          <YAxis domain={[domainLo, domainHi]} hide />
          <Tooltip
            content={<ChartTooltip color={color} intraday={intraday} />}
            cursor={{ stroke: "#b45309", strokeDasharray: "3 3" }}
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
