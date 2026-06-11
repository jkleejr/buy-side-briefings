import type { RegimeIndicator } from "@/lib/data";
import { evaluateRegime, type RegimeStatus } from "@/lib/regime";
import { getRegimeTip } from "@/lib/glossary";
import { cn, nowUtcHM } from "@/lib/utils";
import Panel from "./panel";
import Tooltip from "./tooltip";

const STATUS_LABEL: Record<RegimeStatus, string> = {
  breached: "BREACHED",
  near: "NEAR",
  holding: "HOLDING",
};

const STATUS_CLS: Record<RegimeStatus, string> = {
  breached: "border-[var(--down)] text-[var(--down)]",
  near: "border-[var(--amber-dim)] text-[var(--amber)]",
  holding: "border-[var(--up)] text-[var(--up)]",
};

const BAR_CLS: Record<RegimeStatus, string> = {
  breached: "bg-[var(--down)]",
  near: "bg-[var(--amber)]",
  holding: "bg-[var(--up)]",
};

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/**
 * Live regime panel: the named triggers from the latest briefing, each checked
 * against the live tape. The briefing freezes its values at publish time —
 * this is the "how many are in breach RIGHT NOW" view that gates every other
 * call on the page.
 */
export default async function RegimeRiskBars({
  indicators,
}: {
  indicators: RegimeIndicator[];
}) {
  const { rows, breached } = await evaluateRegime(indicators);
  const anyLive = rows.some((r) => r.isLive);

  return (
    <Panel
      code="RISK"
      title="Regime Triggers · Live"
      learn="The named regime triggers from the latest briefing (DXY above 100, SPX below the regime floor, …), each re-checked against the live tape instead of the values frozen at publish time. BREACHED = the trigger condition is met right now; NEAR = within 2% of the level; HOLDING = comfortably on the safe side. The breach count is the single number that gates how much risk the briefings say to carry. Hover an indicator name for what it measures."
      meta={
        <span
          className={cn(
            "font-bold",
            breached > 0 ? "text-[var(--down)]" : "text-[var(--up)]",
          )}
        >
          {breached} OF {rows.length} IN BREACH
        </span>
      }
      asOf={anyLive ? nowUtcHM() : undefined}
    >
      <ul className="divide-y divide-[var(--border)]">
        {rows.map(({ indicator: r, live, status, isLive }) => {
          const trigger = r.trigger_above ?? r.trigger_below;
          const shown = live ?? r.value;
          // Bar fills toward the trigger from the safe side; full bar = at/past it.
          const pct =
            trigger === undefined
              ? 0
              : r.trigger_above !== undefined
                ? Math.min(100, Math.max(0, (shown / trigger) * 100))
                : Math.min(100, Math.max(0, (trigger / shown) * 100));
          const tip = getRegimeTip(r.name);
          return (
            <li key={r.name} className="px-2 py-1.5 font-mono">
              <div className="flex items-baseline gap-2 text-[11px]">
                <span className="truncate text-[var(--foreground)]">
                  {tip ? <Tooltip text={tip}>{r.name}</Tooltip> : r.name}
                </span>
                <span
                  className={cn(
                    "shrink-0 border bg-black px-1 text-[9px] uppercase tracking-wider",
                    STATUS_CLS[status],
                  )}
                >
                  {STATUS_LABEL[status]}
                </span>
                <span className="ml-auto shrink-0 text-[var(--foreground)]">
                  {fmt(shown)}
                  {r.unit ?? ""}
                  <span className="ml-1.5 text-[10px] text-[var(--dim)]">
                    {r.trigger_above !== undefined
                      ? `▸${fmt(r.trigger_above)}${r.unit ?? ""}`
                      : r.trigger_below !== undefined
                        ? `◂${fmt(r.trigger_below)}${r.unit ?? ""}`
                        : null}
                  </span>
                </span>
              </div>
              {isLive && (
                <div className="mt-0.5 text-[9px] uppercase tracking-wider text-[var(--dim)]">
                  briefing {fmt(r.value)}
                  {r.unit ?? ""} →{" "}
                  <span className="text-[var(--cyan-term)]">live {fmt(shown)}{r.unit ?? ""}</span>
                </div>
              )}
              <div className="mt-1 h-1.5 w-full overflow-hidden bg-[var(--panel-head)]">
                <div className={`h-full ${BAR_CLS[status]}`} style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
