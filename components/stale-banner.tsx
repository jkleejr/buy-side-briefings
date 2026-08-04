import { getDataFreshness, type Freshness } from "@/lib/freshness";

/**
 * Presentational staleness strip. `noun` names the feed being flagged so a
 * page-level notice ("Sector reads") never reads as if the whole site is behind.
 */
export function FreshnessNotice({
  freshness: f,
  noun = "Briefings",
}: {
  freshness: Freshness;
  noun?: string;
}) {
  if (!f.is_stale || !f.latest_date) return null;
  return (
    <div className="border-b border-[var(--amber-dim)] bg-[rgba(255,165,0,0.07)] px-2 py-1 text-center font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
      ⚠ {noun} as of {f.latest_date} · {f.days_old} days old — calls below may be
      outdated · live quotes unaffected
    </div>
  );
}

/**
 * Site-wide warning shown when the newest briefing/dossier content is from
 * before yesterday. Live quotes keep streaming either way — this is about the
 * editorial layer (verdicts, dossiers) so an old call is never mistaken for
 * today's. Scoped to the markets verdict; feeds with their own cadence flag
 * themselves on their own page.
 */
export default function StaleBanner() {
  return <FreshnessNotice freshness={getDataFreshness()} />;
}
