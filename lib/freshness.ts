import { getAllMarketsVerdicts } from "@/lib/data";
import { getLatestAssetDaily, type AssetId } from "@/lib/asset-daily";

// ---------------------------------------------------------------------------
// Data freshness. The briefing/dossier content is generated daily and
// committed to the repo; live quotes keep updating regardless. This module
// answers "how old is the newest editorial content?" so the UI can say so
// instead of presenting a two-day-old call as today's.
// ---------------------------------------------------------------------------

const ASSETS: AssetId[] = ["nvda", "btc", "skhynix", "spcx"];

export type Freshness = {
  /** Newest date across markets verdicts and all asset dossiers (YYYY-MM-DD). */
  latest_date: string | null;
  /** Newest markets-verdict date. */
  latest_verdict_date: string | null;
  /** Newest dossier date per asset. */
  asset_dates: Record<AssetId, string | null>;
  /** Calendar days between today (UTC) and latest_date. */
  days_old: number;
  /** True when the newest content is from before yesterday. */
  is_stale: boolean;
};

export function getDataFreshness(): Freshness {
  const verdicts = getAllMarketsVerdicts();
  const latestVerdict = verdicts[0]?.date ?? null;

  const asset_dates = {} as Record<AssetId, string | null>;
  let latest = latestVerdict;
  for (const a of ASSETS) {
    const d = getLatestAssetDaily(a)?.date ?? null;
    asset_dates[a] = d;
    if (d && (!latest || d > latest)) latest = d;
  }

  if (!latest) {
    return {
      latest_date: null,
      latest_verdict_date: latestVerdict,
      asset_dates,
      days_old: 0,
      is_stale: false,
    };
  }

  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const latestMs = Date.parse(`${latest}T00:00:00Z`);
  const days_old = Math.max(0, Math.round((todayUtc.getTime() - latestMs) / 86_400_000));

  // BTC dossiers publish 7 days a week, so anything older than yesterday is
  // genuinely behind — no weekend allowance needed.
  return {
    latest_date: latest,
    latest_verdict_date: latestVerdict,
    asset_dates,
    days_old,
    is_stale: days_old >= 2,
  };
}
