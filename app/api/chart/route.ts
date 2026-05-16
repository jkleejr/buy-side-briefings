import { NextResponse } from "next/server";
import { getChartSeries, CHART_RANGES, type ChartRange } from "@/lib/markets";

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

  const data = await getChartSeries(symbol, rangeParam as ChartRange);
  return NextResponse.json({ symbol, range: rangeParam, data });
}
