import { NextResponse } from "next/server";
import { getProfiles } from "@/lib/markets";

// Sector / industry / beta for the For You feed, so any held ticker gets a
// factor-based read. Profiles change rarely — cache hard.
export const revalidate = 3600;

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("symbols") ?? "";
  const symbols = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
  const profiles = await getProfiles(symbols);
  return NextResponse.json(
    { profiles },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
