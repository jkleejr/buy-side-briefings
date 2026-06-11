import Link from "next/link";
import type { CalendarEvent } from "@/lib/data";
import type { PlanCheck, PlanState } from "@/lib/opportunity-check";
import { cn, nowUtcHM } from "@/lib/utils";
import Panel from "./panel";

// ---------------------------------------------------------------------------
// "What do I do right now?" — the morning checklist, auto-assembled: open
// ideas whose live price demands action (stop breached / target hit / near
// stop / in entry zone) plus the catalysts firing today. Everything links to
// its source so each line is one click from the full plan.
// ---------------------------------------------------------------------------

const STATE_META: Record<
  Exclude<PlanState, "tracking">,
  { label: string; cls: string }
> = {
  stop_breached: { label: "⚠ STOP BREACHED", cls: "border-[var(--down)] text-[var(--down)]" },
  target_hit: { label: "◎ TARGET HIT", cls: "border-[var(--up)] text-[var(--up)]" },
  near_stop: { label: "NEAR STOP", cls: "border-[var(--amber-dim)] text-[var(--amber)]" },
  in_entry_zone: { label: "IN ENTRY ZONE", cls: "border-[var(--amber-dim)] text-[var(--amber)]" },
};

function fmtPrice(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export default function PlaybookPanel({
  checks,
  todayEvents,
}: {
  checks: PlanCheck[];
  todayEvents: CalendarEvent[];
}) {
  const actionable = checks.filter((c) => c.state !== "tracking");
  const tracking = checks.length - actionable.length;

  return (
    <Panel
      code="PLAY"
      title="Today's Playbook"
      learn="The morning checklist, auto-assembled from live prices and the published plans: open ideas whose live price has crossed (or is within 2% of) a published level — stop breached, target hit, near stop, in entry zone — plus every catalyst on today's calendar. If a line is here, it wants a decision today; everything else on the book is just tracking."
      meta={
        <span>
          {actionable.length} ACTIONABLE · {tracking} TRACKING
        </span>
      }
      asOf={nowUtcHM()}
    >
      {/* Catalysts firing today */}
      {todayEvents.length > 0 && (
        <ul className="divide-y divide-[var(--border)] border-b border-[var(--border)]">
          {todayEvents.map((e) => (
            <li
              key={`${e.date}-${e.label}`}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-2 py-1.5 font-mono text-[11px]"
            >
              <span className="shrink-0 border border-[var(--amber-dim)] bg-black px-1 text-[9px] uppercase tracking-wider text-[var(--amber)]">
                TODAY{e.time_et ? ` · ${e.time_et} ET` : ""}
              </span>
              <span className="min-w-0 flex-1 basis-48 text-[var(--foreground)]">{e.label}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Ideas demanding a decision */}
      {actionable.length === 0 ? (
        <div className="p-3 text-center font-mono text-[11px] text-[var(--dim)]">
          No live level crossings on the book — nothing demands action right now.
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {actionable.map(({ opportunity: o, price, state, to_stop_pct }) => {
            const meta = STATE_META[state as Exclude<PlanState, "tracking">];
            const lv = o.levels;
            return (
              <li key={o.id} className="px-2 py-1.5 font-mono">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px]">
                  <span
                    className={cn(
                      "shrink-0 border bg-black px-1 text-[9px] uppercase tracking-wider",
                      meta.cls,
                    )}
                  >
                    {meta.label}
                  </span>
                  <Link
                    href={`/opportunities/${o.id}`}
                    className="text-[var(--amber)] hover:underline"
                  >
                    {o.ticker}
                  </Link>
                  <span className="min-w-0 flex-1 basis-40 truncate text-[var(--foreground)]">
                    {o.title}
                  </span>
                  <span className="ml-auto shrink-0 text-[var(--dim)]">
                    live <span className="text-[var(--foreground)]">${fmtPrice(price)}</span>
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-[var(--dim)]">
                  {state === "in_entry_zone" && lv?.entry_low !== undefined && (
                    <>zone ${fmtPrice(lv.entry_low)}–${fmtPrice(lv.entry_high!)} · </>
                  )}
                  {lv?.stop !== undefined && <>stop ${fmtPrice(lv.stop)}</>}
                  {to_stop_pct !== null && to_stop_pct > 0 && (
                    <> · {to_stop_pct.toFixed(1)}% cushion</>
                  )}
                  {lv?.targets && lv.targets.length > 0 && (
                    <> · targets {lv.targets.map((t) => `$${fmtPrice(t)}`).join(" / ")}</>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
