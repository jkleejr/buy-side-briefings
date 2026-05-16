"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { ChartPoint } from "@/lib/chart-ranges";

export type CandleChartProps = {
  series: ChartPoint[];
  intraday?: boolean;
};

/** Convert one of our ISO date strings to lightweight-charts' Time value. */
function isoToTime(iso: string, intraday: boolean): Time {
  if (intraday) {
    // Intraday bars need a UTC Unix timestamp in seconds.
    return Math.floor(new Date(iso).getTime() / 1000) as UTCTimestamp;
  }
  // Daily/weekly/monthly bars use the YYYY-MM-DD form (UTC).
  return iso.slice(0, 10) as Time;
}

export default function CandleChartInner({ series, intraday }: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Create the chart instance once on mount, dispose on unmount.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "#000000" },
        textColor: "#71717a",
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "#1f1f1f" },
        horzLines: { color: "#1f1f1f" },
      },
      rightPriceScale: {
        borderColor: "#262626",
      },
      timeScale: {
        borderColor: "#262626",
        timeVisible: !!intraday,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: "#b45309", style: 2, labelBackgroundColor: "#b45309" },
        horzLine: { color: "#b45309", style: 2, labelBackgroundColor: "#b45309" },
      },
      handleScroll: false,
      handleScale: false,
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      borderVisible: false,
    });
    seriesRef.current = candleSeries;

    // Auto-resize when the container size changes (e.g., window resize).
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      chart.applyOptions({ width, height });
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // intraday only matters at create time for timeVisible; if it changes,
    // the effect below repopulates data and applyOptions handles the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push data whenever the series prop changes.
  useEffect(() => {
    const candleSeries = seriesRef.current;
    const chart = chartRef.current;
    if (!candleSeries || !chart) return;

    // Build OHLC bars; skip rows without full OHLC (lightweight-charts
    // requires open/high/low/close).
    const data = series
      .filter((p) => p.open != null && p.high != null && p.low != null)
      .map((p) => ({
        time: isoToTime(p.date, !!intraday),
        open: p.open!,
        high: p.high!,
        low: p.low!,
        close: p.close,
      }));

    candleSeries.setData(data);
    chart.applyOptions({
      timeScale: { timeVisible: !!intraday, secondsVisible: false },
    });
    chart.timeScale().fitContent();
  }, [series, intraday]);

  return (
    <div
      ref={containerRef}
      className="h-[110px] w-full sm:h-[150px]"
      style={{ position: "relative" }}
    />
  );
}
