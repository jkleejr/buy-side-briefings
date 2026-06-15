import type { Opportunity } from "@/lib/data";
import { computeTradePlan } from "@/lib/trade-math";
import { cn, formatLevel, formatPct } from "@/lib/utils";
import Panel from "./panel";

const fmtR = (r: number) => `${r >= 0 ? "" : "−"}${Math.abs(r).toFixed(1)}R`;
const px = (n: number) => `$${formatLevel(n)}`;

/**
 * #1 — Position-sizing engine. Turns the idea's numeric levels into a sized,
 * risk-multiplied plan: reward:risk per target, what the published size really
 * risks, and how big a position 1% book-risk actually implies.
 */
export default function TradePlanCard({ opportunity }: { opportunity: Opportunity }) {
  const plan = computeTradePlan(opportunity);
  if (!plan) return null;

  const riskedPer10k = ((plan.bookRiskAtStatedPct / 100) * 10_000).toFixed(0);
  const sizeFlag = plan.bookRiskAtStatedPct > plan.riskBudgetPct * 1.5;

  const tiles: { label: string; value: string; tone?: string; sub?: string }[] = [
    {
      label: "Reward : Risk",
      value: plan.bestRR != null ? `${plan.bestRR.toFixed(1)} : 1` : "—",
      tone: plan.bestRR != null && plan.bestRR >= 2 ? "text-[var(--up)]" : "text-[var(--amber)]",
      sub: plan.firstRR != null ? `${plan.firstRR.toFixed(1)}:1 to T1` : "to best target",
    },
    {
      label: "Stop distance",
      value: `${plan.stopDistPct.toFixed(1)}%`,
      tone: "text-[var(--down)]",
      sub: `${plan.direction} · entry ${px(plan.entryMid)} → ${px(plan.stop)}`,
    },
    {
      label: `Size for ${plan.riskBudgetPct}% risk`,
      value: `${plan.suggestedSizePct.toFixed(1)}%`,
      tone: "text-[var(--cyan-term)]",
      sub: "of book, to risk 1% on a stop-out",
    },
    {
      label: "Risk at stated size",
      value: `${plan.bookRiskAtStatedPct.toFixed(2)}%`,
      tone: sizeFlag ? "text-[var(--down)]" : "text-[var(--foreground)]",
      sub: `${plan.statedSizePct}% size · $${riskedPer10k} per $10k`,
    },
  ];

  return (
    <Panel
      code="SIZE"
      title="Trade Plan & Sizing"
      learn="The published levels turned into a sized trade. Reward:Risk = distance to target ÷ distance to stop (in R, where 1R is the risk you take to the stop). 'Size for 1% risk' is the position — as a percent of your book — at which hitting the stop costs exactly 1% of the account: risk budget ÷ stop distance. 'Risk at stated size' is what the journal's published size actually puts at risk if stopped out. Sizing by risk, not by hunch, is the single biggest driver of long-run returns."
      meta={<span>RISK MODEL · 1% / TRADE</span>}
    >
      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] font-mono sm:grid-cols-4 sm:divide-y-0">
        {tiles.map((t) => (
          <div key={t.label} className="px-2.5 py-2">
            <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
              {t.label}
            </div>
            <div className={cn("mt-0.5 text-[16px] font-bold tabular-nums", t.tone)}>
              {t.value}
            </div>
            {t.sub && <div className="text-[9px] leading-tight text-[var(--dim)]">{t.sub}</div>}
          </div>
        ))}
      </div>

      {plan.targets.length > 0 && (
        <table className="w-full border-t border-[var(--border)] font-mono text-[11px]">
          <thead className="bg-[var(--panel-head)] text-[9px] uppercase tracking-wider text-[var(--dim)]">
            <tr>
              <th className="px-2.5 py-1 text-left font-normal">Target</th>
              <th className="px-2 py-1 text-right font-normal">Price</th>
              <th className="px-2 py-1 text-right font-normal">Move</th>
              <th className="px-2.5 py-1 text-right font-normal">In R</th>
            </tr>
          </thead>
          <tbody>
            {plan.targets.map((t, i) => (
              <tr key={i} className="border-t border-[var(--border)]">
                <td className="px-2.5 py-0.5 text-[var(--amber-dim)]">T{i + 1}</td>
                <td className="px-2 py-0.5 text-right text-[var(--foreground)]">{px(t.price)}</td>
                <td className="px-2 py-0.5 text-right text-[var(--up)]">{formatPct(t.pct)}</td>
                <td className="px-2.5 py-0.5 text-right font-bold text-[var(--up)]">
                  {fmtR(t.rMultiple)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="border-t border-[var(--border)] px-2.5 py-1.5 font-mono text-[10px] leading-snug text-[var(--dim)]">
        {sizeFlag ? (
          <>
            <span className="text-[var(--down)]">⚠ Sizing note · </span>
            the published {plan.statedSizePct}% size risks{" "}
            {plan.bookRiskAtStatedPct.toFixed(2)}% of the book on a stop-out — above a 1%
            per-trade budget. Trim to ~{plan.suggestedSizePct.toFixed(1)}% to normalize risk.
          </>
        ) : (
          <>
            <span className="text-[var(--amber-dim)]">Read · </span>
            risk-first sizing keeps every idea&apos;s loss comparable. This one needs ~
            {plan.suggestedSizePct.toFixed(1)}% of the book to put 1% at risk; the journal
            published {plan.statedSizePct}%.
          </>
        )}
      </p>
    </Panel>
  );
}
