import { NextResponse } from "next/server";
import { generateLiteRead } from "@/lib/lite-read";
import { todayET } from "@/lib/utils";

// On-demand AI holder read for an uncovered ticker. Returns {ok:false} (not an
// error) when no API key is set or generation fails, so the feed degrades to
// its templated read instead of breaking.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ ok: false, error: "symbol required" }, { status: 400 });
  }
  try {
    const read = await generateLiteRead(symbol, todayET());
    if (!read) return NextResponse.json({ ok: false, reason: "unavailable" });
    return NextResponse.json(
      { ok: true, read },
      { headers: { "Cache-Control": "private, max-age=600" } },
    );
  } catch {
    return NextResponse.json({ ok: false, reason: "error" });
  }
}
