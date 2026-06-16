import Link from "next/link";
import { scoreIdeas, aggregateIdeaRecord } from "@/lib/idea-scoring";
import { formatPct } from "@/lib/utils";
import IdeasRecord from "@/components/ideas-record";

export const metadata = {
  title: "Ideas Track Record — Buy-Side Briefings",
  description:
    "How the short- and long-term ideas have actually performed — every idea scored against the price move since it was posted.",
};

export const revalidate = 600;

export default async function IdeasRecordPage() {
  const { short, long } = await scoreIdeas();
  const all = [...short, ...long];
  const combined = aggregateIdeaRecord(all);

  return (
    <div className="space-y-1">
      <header className="space-y-1 px-1 pb-2">
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] hover:underline"
        >
          ◂ DASHBOARD
        </Link>
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Ideas Track Record
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          Every short & long-term idea, scored against the move since
        </p>
      </header>

      {/* Combined headline tiles */}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
            Ideas posted
          </div>
          <div className="mt-0.5 font-mono text-[18px] tabular-nums text-[var(--foreground)]">
            {combined.total}
          </div>
        </div>
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
            Hit rate
          </div>
          <div className="mt-0.5 font-mono text-[18px] tabular-nums text-[var(--foreground)]">
            {combined.hit_pct === null ? "—" : `${combined.hit_pct.toFixed(0)}%`}
          </div>
          <div className="font-mono text-[9px] text-[var(--dim)]">
            {combined.graded === 0 ? "none graded yet" : `${combined.wins}/${combined.graded} graded`}
          </div>
        </div>
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
            Avg adj return
          </div>
          <div
            className={`mt-0.5 font-mono text-[18px] tabular-nums ${
              combined.avg_adj_return_pct === null
                ? "text-[var(--dim)]"
                : combined.avg_adj_return_pct >= 0
                  ? "text-[var(--up)]"
                  : "text-[var(--down)]"
            }`}
          >
            {combined.avg_adj_return_pct === null ? "—" : formatPct(combined.avg_adj_return_pct)}
          </div>
        </div>
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
            Status
          </div>
          <div className="mt-0.5 font-mono text-[12px] tabular-nums text-[var(--foreground)]">
            {combined.pending} pending
          </div>
          <div className="font-mono text-[9px] text-[var(--dim)]">{combined.watching} on watch</div>
        </div>
      </div>

      <IdeasRecord scored={short} code="SHORT" title="Short Term · Track Record" />
      <IdeasRecord scored={long} code="LONG" title="Long Term · Track Record" />

      <p className="px-1 pt-2 font-mono text-[10px] leading-snug text-[var(--dim)]">
        Scoring is direction-adjusted: a BUY is graded right when price rose, a SELL/AVOID when
        it fell; WATCH ideas aren&apos;t graded. Returns use the same Yahoo daily feed as the
        charts. Read by{" "}
        <Link href="/short-term-ideas" className="text-[var(--cyan-term)] hover:underline">
          Short Term
        </Link>{" "}
        and{" "}
        <Link href="/long-term-ideas" className="text-[var(--cyan-term)] hover:underline">
          Long Term
        </Link>{" "}
        horizon. Wait for ~15-20 graded ideas before treating the hit rate as signal. Not
        investment advice.
      </p>
    </div>
  );
}
