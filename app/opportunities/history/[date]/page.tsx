import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAllOpportunitySnapshots,
  getOpportunity,
  getOpportunitySnapshot,
} from "@/lib/data";
import Panel from "@/components/panel";

export const revalidate = 300;

export async function generateStaticParams() {
  return getAllOpportunitySnapshots().map((s) => ({ date: s.date }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  return { title: `Opportunities Slate · ${date}` };
}

export default async function OpportunitySnapshotPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const snapshot = getOpportunitySnapshot(date);
  if (!snapshot) notFound();

  const activeOpps = snapshot.active_ids
    .map((id) => getOpportunity(id))
    .filter((o): o is NonNullable<ReturnType<typeof getOpportunity>> => o !== null);

  const closedOpps = snapshot.closed_today
    .map((c) => ({ closure: c, opp: getOpportunity(c.id) }))
    .filter((x) => x.opp !== null);

  return (
    <article className="mx-auto max-w-4xl space-y-3">
      <Link
        href="/opportunities/history"
        className="font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] hover:underline"
      >
        ◂ ALL SNAPSHOTS
      </Link>

      <header className="space-y-1 border-b border-[var(--border)] pb-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
          Daily snapshot · generated{" "}
          {new Date(snapshot.generated_at).toLocaleString("en-US", {
            timeZone: "America/New_York",
            timeZoneName: "short",
          })}
        </div>
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Opportunities · {snapshot.date}
        </h1>
        <p className="font-mono text-[12px] leading-relaxed text-[var(--dim)]">
          {snapshot.summary}
        </p>
      </header>

      {/* Closed today */}
      {closedOpps.length > 0 && (
        <Panel code="CLOSED" title={`Closed today · ${closedOpps.length}`}>
          <table className="w-full font-mono text-[11px]">
            <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
              <tr>
                <th className="px-2 py-1 text-left font-normal">Idea</th>
                <th className="px-2 py-1 text-left font-normal">Status</th>
                <th className="px-2 py-1 text-right font-normal">Return</th>
                <th className="px-2 py-1 text-left font-normal">Note</th>
              </tr>
            </thead>
            <tbody>
              {closedOpps.map(({ closure, opp }) =>
                opp ? (
                  <tr key={closure.id} className="border-t border-[var(--border)] align-top">
                    <td className="px-2 py-1">
                      <Link
                        href={`/opportunities/${opp.id}`}
                        className="text-[var(--cyan-term)] hover:underline"
                      >
                        {opp.ticker} · {opp.title}
                      </Link>
                    </td>
                    <td
                      className={`px-2 py-1 uppercase ${
                        closure.status === "target_hit"
                          ? "text-[var(--up)]"
                          : closure.status === "stopped_out" ||
                              closure.status === "thesis_broken"
                            ? "text-[var(--down)]"
                            : "text-[var(--dim)]"
                      }`}
                    >
                      {closure.status.replace("_", " ")}
                    </td>
                    <td
                      className={`px-2 py-1 text-right ${
                        (closure.return_pct ?? 0) > 0
                          ? "text-[var(--up)]"
                          : (closure.return_pct ?? 0) < 0
                            ? "text-[var(--down)]"
                            : "text-[var(--dim)]"
                      }`}
                    >
                      {closure.return_pct == null
                        ? "—"
                        : `${closure.return_pct > 0 ? "+" : ""}${closure.return_pct.toFixed(1)}%`}
                    </td>
                    <td className="max-w-md px-2 py-1 text-[var(--foreground)]">
                      {closure.note ?? "—"}
                    </td>
                  </tr>
                ) : null,
              )}
            </tbody>
          </table>
        </Panel>
      )}

      {/* New today */}
      {snapshot.new_today_ids.length > 0 && (
        <Panel code="NEW" title={`New today · ${snapshot.new_today_ids.length}`}>
          <ul className="divide-y divide-[var(--border)]">
            {snapshot.new_today_ids.map((id) => {
              const opp = getOpportunity(id);
              if (!opp) return null;
              return (
                <li key={id} className="px-2 py-1.5 font-mono text-[11px]">
                  <Link
                    href={`/opportunities/${id}`}
                    className="text-[var(--cyan-term)] hover:underline"
                  >
                    <span className="text-[var(--amber)]">{opp.ticker}</span> · {opp.title}
                  </Link>
                  <div className="mt-0.5 text-[10px] leading-snug text-[var(--dim)]">
                    {opp.catalyst}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {/* Active slate */}
      <Panel code="ACTIVE" title={`Active slate · ${activeOpps.length}`}>
        <table className="w-full font-mono text-[11px]">
          <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
            <tr>
              <th className="px-2 py-1 text-left font-normal">Idea</th>
              <th className="px-2 py-1 text-left font-normal">Dir</th>
              <th className="px-2 py-1 text-left font-normal">Conv</th>
              <th className="px-2 py-1 text-right font-normal">Price (snapshot)</th>
              <th className="px-2 py-1 text-left font-normal">Horizon</th>
            </tr>
          </thead>
          <tbody>
            {activeOpps.map((opp) => {
              const snapPrice = snapshot.current_prices?.[opp.id];
              return (
                <tr key={opp.id} className="border-t border-[var(--border)] align-top">
                  <td className="px-2 py-1">
                    <Link
                      href={`/opportunities/${opp.id}`}
                      className="text-[var(--cyan-term)] hover:underline"
                    >
                      <span className="text-[var(--amber)]">{opp.ticker}</span> · {opp.title}
                    </Link>
                  </td>
                  <td
                    className={`px-2 py-1 uppercase ${
                      opp.direction === "long" || opp.direction === "long_vol"
                        ? "text-[var(--up)]"
                        : opp.direction === "short" || opp.direction === "short_vol"
                          ? "text-[var(--down)]"
                          : "text-[var(--amber)]"
                    }`}
                  >
                    {opp.direction.replace("_", " ")}
                  </td>
                  <td
                    className={`px-2 py-1 ${
                      opp.conviction === "high"
                        ? "text-[var(--up)]"
                        : opp.conviction === "medium"
                          ? "text-[var(--amber)]"
                          : "text-[var(--dim)]"
                    }`}
                  >
                    {opp.conviction}
                  </td>
                  <td className="px-2 py-1 text-right text-[var(--foreground)]">
                    {snapPrice == null ? "—" : `$${snapPrice.toLocaleString()}`}
                  </td>
                  <td className="px-2 py-1 text-[var(--dim)]">{opp.time_horizon}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </article>
  );
}
