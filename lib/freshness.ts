import { getAllMarketsVerdicts } from "@/lib/data";

// ---------------------------------------------------------------------------
// Data freshness. The markets-verdict briefings are generated daily and
// committed to the repo; live quotes keep updating regardless. This module
// answers "how old is the newest editorial content?" so the UI can say so
// instead of presenting a two-day-old call as today's.
// ---------------------------------------------------------------------------

export type Freshness = {
  /** Newest markets-verdict date (YYYY-MM-DD). */
  latest_date: string | null;
  /** Calendar days between today (UTC) and latest_date. */
  days_old: number;
  /** True when the newest content is from before yesterday. */
  is_stale: boolean;
};

/** Age a YYYY-MM-DD date into a Freshness, relative to today (UTC). */
function freshnessOf(latest: string | null, staleAfterDays: number): Freshness {
  if (!latest) {
    return { latest_date: null, days_old: 0, is_stale: false };
  }

  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const latestMs = Date.parse(`${latest}T00:00:00Z`);
  const days_old = Math.max(0, Math.round((todayUtc.getTime() - latestMs) / 86_400_000));

  return { latest_date: latest, days_old, is_stale: days_old >= staleAfterDays };
}

/**
 * Site-wide freshness, driven by the markets verdict — the feed behind the home
 * page and the briefings archive. Verdicts publish twice a day, 7 days a week,
 * so anything older than yesterday is genuinely behind — no weekend allowance.
 */
export function getDataFreshness(): Freshness {
  return freshnessOf(getAllMarketsVerdicts()[0]?.date ?? null, 2);
}
