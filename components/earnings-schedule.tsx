import Panel from "@/components/panel";
import {
  type EarningsEntry,
  type EarningsSchedule as Schedule,
  fmtRevenue,
  countdownBadge,
} from "@/lib/earnings";

const HORIZON = 90; // days shown on the timeline chart axis

// Colour the countdown by how imminent the report is.
function tone(days: number): { text: string } {
  if (days <= 7) return { text: "text-[var(--amber)]" };
  if (days <= 30) return { text: "text-[var(--cyan-term)]" };
  return { text: "text-[var(--dim)]" };
}

/**
 * The timeline marker reads the same as the schedule table's Status column:
 * green for a date the company has confirmed, grey for one Yahoo is estimating.
 * It used to take the countdown's amber/cyan/grey instead, which meant the dot
 * and the number beside it both said "how soon" and nothing said "how sure".
 * Filled vs hollow still carries it for anyone who can't separate the two hues.
 */
function dotColor(isEstimate: boolean): string {
  return isEstimate ? "var(--dim)" : "var(--up)";
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

/**
 * What to print in the timeline's name column. A US ticker is the clearest
 * label it has, but a foreign listing is an exchange code — "000660.KS" and
 * "005930.KS" name SK Hynix and Samsung to nobody. Those carry the watchlist
 * label instead. Keyed on the dot, which is what separates a plain ticker from
 * an exchange-suffixed one, the same rule the levels chart's switcher uses.
 */
function axisName(e: EarningsEntry): string {
  return e.symbol.includes(".") ? e.label : e.symbol;
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
              <span
                title={e.symbol}
                className="w-14 shrink-0 truncate text-right font-mono text-[11px] font-bold text-[var(--foreground)]"
              >
                {axisName(e)}
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
                      background: e.isEstimate
                        ? "transparent"
                        : dotColor(e.isEstimate),
                      border: `1.5px solid ${dotColor(e.isEstimate)}`,
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
        <span className="text-[var(--up)]">●</span> confirmed date ·{" "}
        <span className="text-[var(--dim)]">○</span> estimated
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
  const { entries } = schedule;

  if (entries.length === 0) {
    return (
      <Panel title="Upcoming earnings">
        <p className="p-4 text-center font-mono text-[11px] text-[var(--dim)]">
          No upcoming earnings dates available right now.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-1">
      <Panel title="Earnings timeline — next 90 days">
        <TimelineChart entries={entries} />
      </Panel>

      <Panel title="Full schedule">
        <ScheduleTable entries={entries} />
      </Panel>
    </div>
  );
}
