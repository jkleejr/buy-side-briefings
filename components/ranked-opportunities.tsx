import Link from "next/link";
import type { Opportunity } from "@/lib/data";
import { rankOpportunities } from "@/lib/trade-math";
import { cn } from "@/lib/utils";
import Panel from "./panel";

function dirColor(d: string): string {
  if (d === "long" || d === "long_vol") return "text-[var(--up)]";
  if (d === "short" || d === "short_vol") return "text-[var(--down)]";
  return "text-[var(--amber)]";
}

/**
 * #3 — Idea ranker. Sorts the open ideas by expected value per unit of risk
 * (win probability × reward:risk − loss probability), so capital flows to the
 * best setups instead of a flat, undifferentiated list.
 */
export default function RankedOpportunities({
  items,
  limit = 8,
}: {
  items: Opportunity[];
  limit?: number;
}) {
  const ranked = rankOpportunities(items).slice(0, limit);
  if (ranked.length === 0) return null;

  return (
    <Panel
      code="RANK"
      title="Best Reward / Risk Now"
      learn="Open ideas ranked by expected value per unit of risk: win-probability × reward:risk − loss-probability, expressed in R. Win-probability is the journal's realized hit rate for that conviction, shrunk toward a prior so a tiny sample doesn't dominate. A positive EV(R) means the setup makes money over many repetitions even when individual trades lose. This is where capital should concentrate — highest edge first."
      meta={<span>EV-RANKED · TOP {ranked.length}</span>}
    >
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-[11px]">
          <thead className="bg-[var(--panel-head)] text-[9px] uppercase tracking-wider text-[var(--dim)]">
            <tr>
              <th className="px-2 py-1 text-left font-normal">#</th>
              <th className="px-2 py-1 text-left font-normal">Idea</th>
              <th className="px-2 py-1 text-right font-normal">R:R</th>
              <th className="px-2 py-1 text-right font-normal">Win&nbsp;%</th>
              <th className="px-2 py-1 text-right font-normal">EV (R)</th>
              <th className="px-2 py-1 text-right font-normal">Size</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r, i) => (
              <tr key={r.o.id} className="border-t border-[var(--border)] align-top">
                <td className="px-2 py-1 text-[var(--amber-dim)]">{i + 1}</td>
                <td className="px-2 py-1">
                  <Link
                    href={`/opportunities/${r.o.id}`}
                    className="hover:underline"
                  >
                    <span className="font-bold text-[var(--foreground)]">{r.o.ticker}</span>{" "}
                    <span className={cn("uppercase", dirColor(r.o.direction))}>
                      {r.o.direction.replace("_", " ")}
                    </span>
                    <span className="block max-w-[22rem] truncate text-[10px] text-[var(--dim)]">
                      {r.o.title}
                    </span>
                  </Link>
                </td>
                <td className="px-2 py-1 text-right font-bold tabular-nums text-[var(--up)]">
                  {r.rr.toFixed(1)}:1
                </td>
                <td className="px-2 py-1 text-right tabular-nums text-[var(--foreground)]">
                  {(r.winProb * 100).toFixed(0)}%
                </td>
                <td
                  className={cn(
                    "px-2 py-1 text-right font-bold tabular-nums",
                    r.evR > 0 ? "text-[var(--up)]" : "text-[var(--down)]",
                  )}
                >
                  {r.evR >= 0 ? "+" : "−"}
                  {Math.abs(r.evR).toFixed(2)}
                </td>
                <td className="px-2 py-1 text-right tabular-nums text-[var(--dim)]">
                  {r.plan.suggestedSizePct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[var(--border)] px-2 py-1.5 font-mono text-[10px] leading-snug text-[var(--dim)]">
        Size column is the risk-based allocation (1% of book at the stop), not the journal&apos;s
        published size. Ranked across {ranked.length} open ideas with numeric levels.
      </p>
    </Panel>
  );
}
