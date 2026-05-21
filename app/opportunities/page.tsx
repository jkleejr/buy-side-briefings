import { getAllOpportunities } from "@/lib/data";
import Panel from "@/components/panel";
import OpportunitiesList from "@/components/opportunities-list";

export const metadata = { title: "Opportunities — Buy-Side Briefings" };
export const revalidate = 300;

export default function OpportunitiesPage() {
  const items = getAllOpportunities();

  const activeCount = items.filter((o) => o.status === "active").length;
  const longCount = items.filter((o) =>
    ["long", "long_vol"].includes(o.direction),
  ).length;
  const shortCount = items.filter((o) =>
    ["short", "short_vol"].includes(o.direction),
  ).length;
  const highConv = items.filter((o) => o.conviction === "high").length;

  return (
    <div className="space-y-1">
      <header className="space-y-1 px-1 pb-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Opportunities
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          Active trade ideas · entries, stops, targets, theses · filter by direction · conviction · tag
        </p>
      </header>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
            Active
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--foreground)]">
            {activeCount}
          </div>
        </div>
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--up)]">
            Long
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--foreground)]">
            {longCount}
          </div>
        </div>
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--down)]">
            Short / Pair
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--foreground)]">
            {items.length - longCount}
          </div>
        </div>
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
            High Conviction
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--foreground)]">
            {highConv}
          </div>
        </div>
      </div>

      <Panel code="HOW" title="How to read these">
        <div className="space-y-1.5 p-2 font-mono text-[11px] leading-snug text-[var(--dim)]">
          <p>
            Each card is a discrete trade idea sourced from the briefings work — with a
            specific <span className="text-[var(--amber)]">entry</span>,{" "}
            <span className="text-[var(--amber)]">stop loss</span>,{" "}
            <span className="text-[var(--amber)]">targets</span>, and{" "}
            <span className="text-[var(--amber)]">position size</span>. Click a card for the
            full thesis: bull case, bear case, invalidation, sources.
          </p>
          <p>
            <span className="text-[var(--amber-dim)]">Conviction levels:</span>{" "}
            <span className="text-[var(--up)]">█ HIGH</span> — multi-leg thesis with strong
            evidence, ≥3:1 R/R;{" "}
            <span className="text-[var(--amber)]">█ MED</span> — single primary catalyst, 2:1
            R/R; <span className="text-[var(--dim)]">█ LOW</span> — speculative or tactical,
            often sized small as portfolio insurance / asymmetric tail bet.
          </p>
          <p>
            <span className="text-[var(--amber-dim)]">Not investment advice.</span>{" "}
            Educational only. Position sizes are illustrative; adjust to your own risk budget
            and account constraints. Sources are linked in each detail page.
          </p>
        </div>
      </Panel>

      {items.length === 0 ? (
        <Panel code="EMPTY" title="No opportunities yet">
          <div className="p-4 text-center font-mono text-[11px] text-[var(--dim)]">
            Add opportunities JSON files to{" "}
            <code className="text-[var(--amber)]">data/opportunities/</code> and commit.
          </div>
        </Panel>
      ) : (
        <OpportunitiesList items={items} />
      )}
    </div>
  );
}
