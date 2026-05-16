import { NextResponse } from "next/server";
import { getTickerStrip } from "@/lib/markets";

export const revalidate = 60;

export async function GET() {
  const quotes = await getTickerStrip();
  return NextResponse.json(
    { quotes, as_of: new Date().toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
