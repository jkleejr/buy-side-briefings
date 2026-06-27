import { NextResponse } from "next/server";
import { appendCoverageRequest } from "@/lib/coverage-queue";

// Records a user's "start a desk on this ticker" request into the coverage
// queue. Best-effort persistence (writable fs only); the client mirrors to
// localStorage regardless, so a read-only prod runtime never loses the ask.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { symbol?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const symbol = (body.symbol ?? "").trim();
  if (!symbol) {
    return NextResponse.json({ ok: false, error: "symbol required" }, { status: 400 });
  }
  const result = appendCoverageRequest(symbol, (body.name ?? symbol).trim());
  return NextResponse.json({ ok: true, ...result });
}
