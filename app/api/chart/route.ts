import { NextResponse } from "next/server";
import {
  getChartSeries,
  getChartSeriesWithWarmup,
  CHART_RANGES,
  type ChartRange,
} from "@/lib/markets";

export const revalidate = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const rangeParam = searchParams.get("range");

  if (!symbol) {
    return NextResponse.json({ error: "missing symbol" }, { status: 400 });
  }
  if (!rangeParam || !CHART_RANGES.includes(rangeParam as ChartRange)) {
    return NextResponse.json(
      { error: `invalid range, must be one of ${CHART_RANGES.join(", ")}` },
      { status: 400 },
    );
  }

  // warmup=1 prepends indicator warm-up history and reports where the visible
  // window starts, so clients can draw full-width EMAs/RSI over `data` while
  // displaying only data.slice(visibleFrom).
  if (searchParams.get("warmup") === "1") {
    const { data, visibleFrom } = await getChartSeriesWithWarmup(
      symbol,
      rangeParam as ChartRange,
    );
    return NextResponse.json({ symbol, range: rangeParam, data, visibleFrom });
  }

  const data = await getChartSeries(symbol, rangeParam as ChartRange);
  return NextResponse.json({ symbol, range: rangeParam, data });
}
