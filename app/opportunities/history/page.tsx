import Link from "next/link";
import {
  getAllOpportunitySnapshots,
  getOpportunityStats,
} from "@/lib/data";
import Panel from "@/components/panel";

export const metadata = { title: "Opportunities History — Buy-Side Briefings" };
export const revalidate = 300;

export default function OpportunitiesHistoryPage() {
  const snapshots = getAllOpportunitySnapshots();
  const stats = getOpportunityStats();

  return (
    <div className="space-y-1">
      <header className="flex items-center justify-between px-1 pb-2">
        <div className="space-y-1">
          <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Opportunities · History
          </h1>
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
            {snapshots.length} daily snapshots · click a date to view that day&apos;s slate
          </p>
        </div>
        <Link
          href="/opportunities"
          className="font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] hover:underline"
        >
          ◂ CURRENT SLATE
        </Link>
      </header>

      {/* Stats tiles */}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-5">
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
            Total ideas
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--foreground)]">
            {stats.total}
          </div>
        </div>
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--up)]">
            Wins (target hit)
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--foreground)]">
            {stats.wins}
          </div>
        </div>
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--down)]">
            Losses (stop / broken)
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--foreground)]">
            {stats.losses}
          </div>
        </div>
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
            Hit rate
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--foreground)]">
            {stats.hit_rate_pct === null ? "—" : `${stats.hit_rate_pct.toFixed(0)}%`}
          </div>
        </div>
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
            Avg return (closed)
          </div>
          <div
            className={`mt-0.5 font-mono text-[18px] ${
              stats.avg_return_pct === null
                ? "text-[var(--dim)]"
                : stats.avg_return_pct > 0
                  ? "text-[var(--up)]"
                  : "text-[var(--down)]"
            }`}
          >
            {stats.avg_return_pct === null
              ? "—"
              : `${stats.avg_return_pct > 0 ? "+" : ""}${stats.avg_return_pct.toFixed(1)}%`}
          </div>
        </div>
      </div>

      <Panel code="HOW" title="How tracking works">
        <div className="space-y-1.5 p-2 font-mono text-[11px] leading-snug text-[var(--dim)]">
          <p>
            Every weekday morning at <span className="text-[var(--amber)]">8am ET</span>, the
            opportunities routine refreshes the slate: it checks current prices against
            every active idea&apos;s targets, stops, and expiration, and writes a snapshot
            of the day&apos;s state to{" "}
            <code className="text-[var(--amber)]">data/opportunities-snapshots/</code>.
          </p>
          <p>
            <span className="text-[var(--amber-dim)]">Statuses:</span>{" "}
            <span className="text-[var(--up)]">target_hit</span> — first target reached
            (win); <span className="text-[var(--down)]">stopped_out</span> — stop loss
            triggered (loss); <span className="text-[var(--dim)]">expired</span> —
            time-horizon hit without resolution; <span className="text-[var(--down)]">thesis_broken</span> —
            invalidation condition met independently of price. Hit rate counts wins / (wins+losses);
            expired ideas are excluded.
          </p>
        </div>
      </Panel>

      <Panel code="LOG" title="Daily snapshots">
        {snapshots.length === 0 ? (
          <div className="p-4 text-center font-mono text-[11px] text-[var(--dim)]">
            No snapshots yet — the first one will be written on the next morning routine run.
          </div>
        ) : (
          <table className="w-full font-mono text-[11px]">
            <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
              <tr>
                <th className="px-2 py-1 text-left font-normal">Date</th>
                <th className="px-2 py-1 text-right font-normal">Active</th>
                <th className="px-2 py-1 text-right font-normal">New</th>
                <th className="px-2 py-1 text-right font-normal">Closed</th>
                <th className="px-2 py-1 text-left font-normal">Summary</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.date} className="border-t border-[var(--border)] align-top">
                  <td className="px-2 py-1">
                    <Link
                      href={`/opportunities/history/${s.date}`}
                      className="text-[var(--cyan-term)] hover:underline"
                    >
                      {s.date}
                    </Link>
                  </td>
                  <td className="px-2 py-1 text-right text-[var(--foreground)]">
                    {s.active_ids.length}
                  </td>
                  <td className="px-2 py-1 text-right text-[var(--amber)]">
                    {s.new_today_ids.length}
                  </td>
                  <td className="px-2 py-1 text-right text-[var(--dim)]">
                    {s.closed_today.length}
                  </td>
                  <td className="max-w-xl px-2 py-1 text-[var(--foreground)]">
                    {s.summary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
