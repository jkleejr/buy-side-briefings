import { NextResponse } from "next/server";
import { searchSymbols } from "@/lib/markets";

// Ticker / company-name search for the watchlist add box. Dynamic (no caching)
// so typing returns fresh matches.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const results = await searchSymbols(q);
  return NextResponse.json({ results });
}
