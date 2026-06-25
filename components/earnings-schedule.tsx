import Panel from "@/components/panel";
import {
  type EarningsEntry,
  type EarningsSchedule as Schedule,
  fmtRevenue,
  countdownBadge,
} from "@/lib/earnings";

const HORIZON = 90; // days shown on the timeline chart axis

// Colour a row by how imminent the report is.
function tone(days: number): { dot: string; text: string } {
  if (days <= 7) return { dot: "var(--amber)", text: "text-[var(--amber)]" };
  if (days <= 30) return { dot: "var(--cyan-term)", text: "text-[var(--cyan-term)]" };
  return { dot: "var(--dim)", text: "text-[var(--dim)]" };
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ---- The "chart": a horizontal gantt of when each name reports ------------
function TimelineChart({ entries }: { entries: EarningsEntry[] }) {
  const onAxis = entries.filter((e) => e.daysUntil <= HORIZON);
  if (onAxis.length === 0) return null;

  return (
    <div className="p-2">
      {/* Axis header */}
      <div className="relative mb-1 ml-16 h-4 border-b border-[var(--border)]">
        {[0, 30, 60, 90].map((d) => (
          <div
            key={d}
            className="absolute top-0 flex h-full flex-col items-center"
            style={{ left: `${(d / HORIZON) * 100}%` }}
          >
            <span className="-translate-x-1/2 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
              {d === 0 ? "TODAY" : `+${d}d`}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {onAxis.map((e) => {
          const t = tone(e.daysUntil);
          const left = `${(Math.max(e.daysUntil, 0) / HORIZON) * 100}%`;
          return (
            <div key={e.symbol} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-right font-mono text-[11px] font-bold text-[var(--foreground)]">
                {e.symbol}
              </span>
              <div className="relative h-4 flex-1">
                {/* gridlines */}
                {[30, 60, 90].map((d) => (
                  <span
                    key={d}
                    className="absolute inset-y-0 w-px bg-[var(--border)]"
                    style={{ left: `${(d / HORIZON) * 100}%` }}
                  />
                ))}
                {/* the report marker */}
                <span
                  className="absolute top-1/2 flex -translate-y-1/2 items-center gap-1"
                  style={{ left }}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 -translate-x-1/2 rounded-full"
                    style={{
                      background: e.isEstimate ? "transparent" : t.dot,
                      border: `1.5px solid ${t.dot}`,
                    }}
                  />
                  <span className={`whitespace-nowrap font-mono text-[9px] ${t.text}`}>
                    {countdownBadge(e.daysUntil)}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 border-t border-[var(--border)] pt-1 font-mono text-[9px] leading-relaxed text-[var(--dim)]">
        ● confirmed date · ○ estimated · amber ≤7d · cyan ≤30d. Names reporting
        beyond +90d are listed in the table below.
      </p>
    </div>
  );
}

// ---- The detail schedule table -------------------------------------------
function ScheduleTable({ entries }: { entries: EarningsEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-[11px]">
        <thead>
          <tr className="border-b border-[var(--border)] text-[9px] uppercase tracking-widest text-[var(--dim)]">
            <th className="px-2 py-1 text-left">When</th>
            <th className="px-2 py-1 text-left">Date</th>
            <th className="px-2 py-1 text-left">Ticker</th>
            <th className="px-2 py-1 text-left">Name</th>
            <th className="px-2 py-1 text-right">Price</th>
            <th className="px-2 py-1 text-right">EPS est</th>
            <th className="px-2 py-1 text-right">Rev est</th>
            <th className="px-2 py-1 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const t = tone(e.daysUntil);
            return (
              <tr key={e.symbol} className="border-b border-[var(--border)] last:border-0">
                <td className={`px-2 py-1 font-bold ${t.text}`}>
                  {countdownBadge(e.daysUntil)}
                </td>
                <td className="px-2 py-1 text-[var(--foreground)]">{fmtDate(e.date)}</td>
                <td className="px-2 py-1 font-bold text-[var(--amber)]">{e.symbol}</td>
                <td className="px-2 py-1 text-[var(--dim)]">{e.name ?? e.label}</td>
                <td className="px-2 py-1 text-right text-[var(--foreground)]">
                  {e.price != null ? `$${e.price.toLocaleString()}` : "—"}
                </td>
                <td className="px-2 py-1 text-right text-[var(--foreground)]">
                  {e.epsEstimate != null ? `$${e.epsEstimate.toFixed(2)}` : "—"}
                </td>
                <td className="px-2 py-1 text-right text-[var(--foreground)]">
                  {fmtRevenue(e.revenueEstimate)}
                </td>
                <td className="px-2 py-1 text-[9px] uppercase tracking-widest">
                  {e.isEstimate ? (
                    <span className="text-[var(--dim)]">○ est</span>
                  ) : (
                    <span className="text-[var(--up)]">● confirmed</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function EarningsSchedule({ schedule }: { schedule: Schedule }) {
  const { entries, noDate } = schedule;

  if (entries.length === 0) {
    return (
      <Panel code="EARN" title="Upcoming earnings">
        <p className="p-4 text-center font-mono text-[11px] text-[var(--dim)]">
          No upcoming earnings dates available right now.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-1">
      <Panel code="CHART" title="Earnings timeline — next 90 days">
        <TimelineChart entries={entries} />
      </Panel>

      <Panel code="SCHED" title="Full schedule — every name you track">
        <ScheduleTable entries={entries} />
      </Panel>

      {noDate.length > 0 && (
        <Panel code="TBD" title="No date on file yet">
          <p className="p-2 font-mono text-[10px] leading-relaxed text-[var(--dim)]">
            Yahoo has no upcoming earnings date for:{" "}
            <span className="text-[var(--foreground)]">
              {noDate.map((n) => n.symbol).join(", ")}
            </span>
            . These are non-reporting names (e.g. ETFs) or dates not yet scheduled.
          </p>
        </Panel>
      )}
    </div>
  );
}
