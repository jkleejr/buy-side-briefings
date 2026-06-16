import { NextResponse } from "next/server";
import { getTradeQuotes } from "@/lib/markets";

// Live quotes for the paper-trading desk. Accepts up to 40 comma-separated
// symbols (?symbols=AAPL,BTC-USD,GC=F) and returns price + day change + name.
// Short cache so the desk's polling stays cheap but near-live.
export const revalidate = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("symbols") ?? "";
  const symbols = Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  ).slice(0, 40);

  const quotes = await getTradeQuotes(symbols);
  return NextResponse.json(
    { quotes, as_of: new Date().toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
  );
}
