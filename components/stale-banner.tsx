import { getDataFreshness } from "@/lib/freshness";

/**
 * Site-wide warning shown when the newest briefing/dossier content is from
 * before yesterday. Live quotes keep streaming either way — this is about the
 * editorial layer (verdicts, dossiers) so an old call is never mistaken for
 * today's.
 */
export default function StaleBanner() {
  const f = getDataFreshness();
  if (!f.is_stale || !f.latest_date) return null;
  return (
    <div className="border-b border-[var(--amber-dim)] bg-[rgba(255,165,0,0.07)] px-2 py-1 text-center font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
      ⚠ Briefings as of {f.latest_date} · {f.days_old} days old — calls below may be
      outdated · live quotes unaffected
    </div>
  );
}
