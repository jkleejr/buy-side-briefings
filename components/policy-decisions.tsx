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
 * Forward-looking only. Past decisions used to stay listed on the argument
 * that last week's Fed meeting is how you read this week's tape — but on a page
 * headed "Upcoming events" they read as clutter, and the reports cover what a
 * decision did far better than a dated row can. The page asks for a zero
 * lookback; the tone() guard below still handles a negative countdown so a
 * meeting dated today can't fall through a gap.
 */

/**
 * Colour by imminence — on the countdown badge only, the same amber ≤7d /
 * cyan ≤30d scale the earnings schedule uses. The negative branch is
 * unreachable from the calendar page, which asks for no lookback, and is kept
 * only so a stale build serving yesterday's date degrades to a dim row rather
 * than a mis-coloured one.
 */
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
      <Panel title="Central bank decisions">
        <p className="p-4 text-center font-mono text-[11px] text-[var(--dim)]">
          No scheduled decisions on file.
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="Central bank decisions">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
              <th className="px-2 py-1 text-left font-normal">When</th>
              <th className="px-2 py-1 text-left font-normal">Date</th>
              <th className="px-2 py-1 text-left font-normal">Event</th>
              <th className="px-2 py-1 text-left font-normal">Time ET</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const days = daysBetween(today, e.date);
              const t = tone(days);
              return (
                <tr
                  key={`${e.source}-${e.date}`}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className={`px-2 py-1 font-bold ${t}`}>
                    {countdownBadge(days)}
                  </td>
                  {/* Every row reads at full strength. Greying the date and
                      the event on past decisions made two rows look disabled
                      next to the rest of the table — and a decision that has
                      already landed is exactly the one you re-read to make
                      sense of the tape. */}
                  <td className="px-2 py-1 text-[var(--foreground)]">{fmtDate(e.date)}</td>
                  <td className="px-2 py-1 text-[var(--foreground)]">{e.label}</td>
                  <td className="px-2 py-1 text-[var(--dim)]">{when(e)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
