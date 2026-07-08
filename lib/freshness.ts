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

export function getDataFreshness(): Freshness {
  const verdicts = getAllMarketsVerdicts();
  const latest = verdicts[0]?.date ?? null;

  if (!latest) {
    return { latest_date: null, days_old: 0, is_stale: false };
  }

  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const latestMs = Date.parse(`${latest}T00:00:00Z`);
  const days_old = Math.max(0, Math.round((todayUtc.getTime() - latestMs) / 86_400_000));

  // Verdicts publish twice a day, 7 days a week, so anything older than
  // yesterday is genuinely behind — no weekend allowance needed.
  return { latest_date: latest, days_old, is_stale: days_old >= 2 };
}
