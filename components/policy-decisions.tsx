import Panel from "@/components/panel";
import { countdownBadge } from "@/lib/earnings";
import type { CalendarEvent } from "@/lib/data";

/**
 * Fed and Bank of Japan decision dates on the Calendar page.
 *
 * These come from the static tables in lib/calendar-feeds.ts, which had no
 * caller between the old catalyst calendar's removal (2026-08-03) and this
 * panel. They are their own class of event, not earnings: no ticker, no EPS,
 * no revenue estimate, so they get their own panel rather than em-dashed
 * cells in the earnings schedule.
 *
 * Recent decisions stay listed after they happen — a Fed decision that landed
 * last week is how you read this week's tape, and a calendar that drops it the
 * next morning leaves a blank fortnight behind today.
 */

/** Colour by imminence. Past decisions read as settled, not as urgent. */
function tone(days: number): string {
  if (days < 0) return "text-[var(--dim)]";
  if (days <= 7) return "text-[var(--amber)]";
  if (days <= 30) return "text-[var(--cyan-term)]";
  return "text-[var(--dim)]";
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Whole days between two YYYY-MM-DD strings. Both are read at noon UTC so a
 * daylight-saving shift can't round the difference to the wrong day.
 */
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T12:00:00Z`);
  const b = Date.parse(`${to}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** The clock, when one is meaningful in Eastern time. */
function when(e: CalendarEvent): string {
  if (e.time_et) return e.time_et;
  // BoJ announces during the Tokyo lunch hour — the previous evening in New
  // York. A Tokyo clock on an ET column would be wrong; "overnight" is honest.
  if (e.source === "boj") return "overnight";
  return "—";
}

export default function PolicyDecisions({
  events,
  today,
}: {
  events: CalendarEvent[];
  today: string;
}) {
  if (events.length === 0) {
    return (
      <Panel code="POLICY" title="Central bank decisions">
        <p className="p-4 text-center font-mono text-[11px] text-[var(--dim)]">
          No scheduled decisions on file.
        </p>
      </Panel>
    );
  }

  return (
    <Panel code="POLICY" title="Central bank decisions — Fed and Bank of Japan">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)] text-[9px] uppercase tracking-widest text-[var(--dim)]">
              <th className="px-2 py-1 text-left">When</th>
              <th className="px-2 py-1 text-left">Date</th>
              <th className="px-2 py-1 text-left">Event</th>
              <th className="px-2 py-1 text-left">Time ET</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const days = daysBetween(today, e.date);
              const t = tone(days);
              const muted = days < 0 ? "text-[var(--dim)]" : "text-[var(--foreground)]";
              return (
                <tr
                  key={`${e.source}-${e.date}`}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className={`px-2 py-1 font-bold ${t}`}>
                    {countdownBadge(days)}
                  </td>
                  <td className={`px-2 py-1 ${muted}`}>{fmtDate(e.date)}</td>
                  <td className={`px-2 py-1 ${muted}`}>{e.label}</td>
                  <td className="px-2 py-1 text-[var(--dim)]">{when(e)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[var(--border)] px-2 py-1 font-mono text-[9px] leading-relaxed text-[var(--dim)]">
        FOMC dates from federalreserve.gov, BoJ from boj.or.jp — both published
        well ahead and rarely moved. Decisions from the last 45 days stay listed.
        The Fed announces at 2:00 PM ET; the BoJ lands overnight ET, so you wake
        up to it.
      </p>
    </Panel>
  );
}
