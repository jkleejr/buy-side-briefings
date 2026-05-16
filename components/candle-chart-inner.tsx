"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
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
    return Math.floor(new Date(iso).getTime() / 1000) as UTCTimestamp;
  }
  return iso.slice(0, 10) as Time;
}

/**
 * Recreate-on-data-change pattern. Heavier than the "create once + update"
 * approach, but bullet-proof against the "compressed-to-left" issue caused
 * by the chart initializing with 0 width before layout completes.
 *
 * Process per render:
 *   1. Wait for the container to have positive dimensions
 *   2. Create a fresh chart at the measured size
 *   3. Add the candle series, push data, fitContent()
 *   4. Set up ResizeObserver that applyOptions + fitContent on every change
 *   5. On unmount or data change, remove and rebuild
 */
export default function CandleChartInner({ series, intraday }: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Build the OHLC data first — if there's nothing to draw, skip the
    // expensive chart creation entirely.
    const data = series
      .filter((p) => p.open != null && p.high != null && p.low != null)
      .map((p) => ({
        time: isoToTime(p.date, !!intraday),
        open: p.open!,
        high: p.high!,
        low: p.low!,
        close: p.close,
      }));
    if (data.length === 0) return;

    let disposed = false;
    let chart: ReturnType<typeof createChart> | null = null;
    let ro: ResizeObserver | null = null;

    // Defer chart creation to the next frame so the container has a real
    // measured size (important when the user toggles between line/candle
    // and the previous Recharts container just unmounted).
    const init = () => {
      if (disposed) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) {
        // Keep waiting until layout completes
        requestAnimationFrame(init);
        return;
      }

      chart = createChart(container, {
        width: w,
        height: h,
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
        rightPriceScale: { borderColor: "#262626" },
        timeScale: {
          borderColor: "#262626",
          timeVisible: !!intraday,
          secondsVisible: false,
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        crosshair: {
          mode: CrosshairMode.Magnet,
          vertLine: { color: "#b45309", style: 2, labelBackgroundColor: "#b45309" },
          horzLine: { color: "#b45309", style: 2, labelBackgroundColor: "#b45309" },
        },
        handleScroll: false,
        handleScale: false,
      });

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
        borderVisible: false,
      });

      candleSeries.setData(data);
      // fitContent must be called AFTER setData. With fixLeftEdge/fixRightEdge
      // on, the chart pins both edges of the data to the chart edges — bars
      // fill the full horizontal space, never compressed to a corner.
      chart.timeScale().fitContent();

      ro = new ResizeObserver(([entry]) => {
        if (!chart) return;
        const { width, height } = entry.contentRect;
        if (width <= 0 || height <= 0) return;
        chart.applyOptions({ width, height });
        chart.timeScale().fitContent();
      });
      ro.observe(container);
    };

    requestAnimationFrame(init);

    return () => {
      disposed = true;
      ro?.disconnect();
      chart?.remove();
    };
  }, [series, intraday]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ position: "relative", minHeight: 32 }}
    />
  );
}
