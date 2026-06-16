import { aggregateIdeaRecord, type ScoredIdea } from "@/lib/idea-scoring";
import { formatPct } from "@/lib/utils";
import Panel from "./panel";
import Tooltip from "./tooltip";

const LEAN_TONE: Record<ScoredIdea["lean"], string> = {
  buy: "text-[var(--up)]",
  sell: "text-[var(--down)]",
  watch: "text-[var(--amber)]",
};

function RightCell({ s }: { s: ScoredIdea }) {
  if (s.lean === "watch") return <span className="text-[var(--dim)]">watch</span>;
  if (s.pending || s.right === null) return <span className="text-[var(--dim)]">pending</span>;
  return s.right ? (
    <span className="text-[var(--up)]">✓</span>
  ) : (
    <span className="text-[var(--down)]">✗</span>
  );
}

function retTone(n: number | null): string {
  return n === null
    ? "text-[var(--dim)]"
    : n > 0
      ? "text-[var(--up)]"
      : n < 0
        ? "text-[var(--down)]"
        : "text-[var(--dim)]";
}

export default function IdeasRecord({
  scored,
  title,
  code,
  intro,
}: {
  scored: ScoredIdea[];
  title: string;
  code: string;
  intro?: string;
}) {
  const stats = aggregateIdeaRecord(scored);

  return (
    <Panel
      code={code}
      title={title}
      learn="Every idea ever posted, scored against the price move since. Direction-adjusted: a BUY is right when price rose, a SELL/AVOID when it fell; WATCH ideas are informational and not graded. 'Adj' is the direction-adjusted return since posting. Prices are the same Yahoo daily feed as the charts. Wait for ~15-20 graded ideas before reading the hit rate as signal."
      meta={<span>{stats.total} POSTED</span>}
    >
      {scored.length === 0 ? (
        <div className="p-3 text-center font-mono text-[11px] text-[var(--dim)]">
          No ideas posted yet.
        </div>
      ) : (
        <>
          {/* aggregate tiles */}
          <div className="grid grid-cols-2 divide-x divide-[var(--border)] border-b border-[var(--border)] font-mono sm:grid-cols-4">
            <div className="px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                <Tooltip text="Share of graded (buy/sell) ideas where the direction-adjusted move since posting was positive. Watch ideas and not-yet-aged ideas are excluded.">
                  Hit rate
                </Tooltip>
              </div>
              <div className="mt-0.5 text-[15px] font-bold tabular-nums text-[var(--foreground)]">
                {stats.hit_pct === null ? "—" : `${stats.hit_pct.toFixed(0)}%`}
              </div>
              <div className="text-[9px] text-[var(--dim)]">
                {stats.graded === 0 ? "none graded yet" : `${stats.wins}/${stats.graded} graded`}
              </div>
            </div>
            <div className="px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                Avg adj return
              </div>
              <div className={`mt-0.5 text-[15px] font-bold tabular-nums ${retTone(stats.avg_adj_return_pct)}`}>
                {stats.avg_adj_return_pct === null ? "—" : formatPct(stats.avg_adj_return_pct)}
              </div>
              <div className="text-[9px] text-[var(--dim)]">per graded idea</div>
            </div>
            <div className="px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                Best / worst
              </div>
              <div className="mt-0.5 text-[12px] tabular-nums">
                <span className="text-[var(--up)]">
                  {stats.best ? `${stats.best.ticker} ${formatPct(stats.best.adj_return_pct ?? 0)}` : "—"}
                </span>
              </div>
              <div className="text-[12px] tabular-nums">
                <span className="text-[var(--down)]">
                  {stats.worst ? `${stats.worst.ticker} ${formatPct(stats.worst.adj_return_pct ?? 0)}` : "—"}
                </span>
              </div>
            </div>
            <div className="px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                Status
              </div>
              <div className="mt-0.5 text-[12px] tabular-nums text-[var(--foreground)]">
                {stats.pending} pending
              </div>
              <div className="text-[9px] text-[var(--dim)]">{stats.watching} on watch</div>
            </div>
          </div>

          {intro && (
            <p className="border-b border-[var(--border)] px-2 py-1.5 font-mono text-[10px] leading-snug text-[var(--dim)]">
              {intro}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[11px] term-table">
              <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
                <tr>
                  <th className="px-2 py-1 text-left font-normal">Posted</th>
                  <th className="px-2 py-1 text-left font-normal">Ticker</th>
                  <th className="px-2 py-1 text-left font-normal">Call</th>
                  <th className="px-2 py-1 text-left font-normal">Conv</th>
                  <th className="px-2 py-1 text-right font-normal">Held</th>
                  <th className="px-2 py-1 text-right font-normal">Return</th>
                  <th className="px-2 py-1 text-right font-normal">Adj</th>
                  <th className="px-2 py-1 text-center font-normal">Right?</th>
                </tr>
              </thead>
              <tbody>
                {scored.map((s, i) => (
                  <tr key={`${s.date}-${s.ticker}-${i}`} className="border-t border-[var(--border)]">
                    <td className="px-2 py-1 text-[var(--dim)]">{s.date}</td>
                    <td className="px-2 py-1 font-bold text-[var(--foreground)]">{s.ticker}</td>
                    <td className={`px-2 py-1 uppercase ${LEAN_TONE[s.lean]}`}>{s.lean}</td>
                    <td className="px-2 py-1 uppercase text-[var(--amber)]">{s.conviction}</td>
                    <td className="px-2 py-1 text-right tabular-nums text-[var(--dim)]">
                      {s.pending ? "—" : `${s.days_held}d`}
                    </td>
                    <td className={`px-2 py-1 text-right tabular-nums ${retTone(s.return_pct)}`}>
                      {s.return_pct === null ? "—" : formatPct(s.return_pct)}
                    </td>
                    <td className={`px-2 py-1 text-right tabular-nums ${retTone(s.adj_return_pct)}`}>
                      {s.adj_return_pct === null ? "—" : formatPct(s.adj_return_pct)}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <RightCell s={s} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}
