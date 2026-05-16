import { getUpcomingEarnings } from "@/lib/markets";
import { getUpcomingReleases } from "@/lib/macro";
import Panel from "./panel";

export const revalidate = 3600;

// Mega-caps and bellwether names worth watching earnings on for a market-wide
// briefing. Kept short on purpose — clutter is the enemy.
const EARNINGS_WATCH = [
  "NVDA", "GOOGL", "AAPL", "MSFT", "META", "AMZN", "TSLA",
  "AMD", "TSM", "AVGO", "JPM", "WMT",
];

function formatCalDate(iso: string): { day: string; mdy: string } {
  // iso is YYYY-MM-DD. Render in UTC so day-of-week doesn't drift by viewer TZ.
  const d = new Date(`${iso}T12:00:00Z`);
  return {
    day: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
    mdy: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
  };
}

function daysFromToday(iso: string): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const d = new Date(`${iso}T00:00:00Z`);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

function dayBadgeText(iso: string): string {
  const n = daysFromToday(iso);
  if (n === 0) return "TODAY";
  if (n === 1) return "TMRW";
  if (n < 0) return `${n}d`;
  return `+${n}d`;
}

export default async function CalendarPanel() {
  const [earnings, releases] = await Promise.all([
    getUpcomingEarnings(EARNINGS_WATCH, 14),
    getUpcomingReleases(14),
  ]);

  return (
    <Panel
      code="CAL"
      title="Week Ahead · Earnings & Macro"
      learn="The two calendars that matter for short-horizon positioning: (left) upcoming earnings for mega-cap and bellwether stocks — these move the index even if no other news happens; (right) scheduled macro data prints — CPI, Core PCE, NFP, GDP, Retail Sales — and FOMC dates. Anything within the next 14 trading days. Updates every hour."
      meta={<span>YAHOO + FRED · 14D</span>}
    >
      <div className="grid grid-cols-1 divide-y divide-[var(--border)] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {/* ─── Earnings column ─── */}
        <div className="flex flex-col">
          <div className="border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
            Earnings · mega-caps + bellwethers
          </div>
          {earnings.length === 0 ? (
            <div className="p-3 text-center font-mono text-[11px] text-[var(--dim)]">
              No earnings scheduled in the next 14 days for the tracked list.
            </div>
          ) : (
            <table className="w-full font-mono text-[11px]">
              <tbody>
                {earnings.map((e) => {
                  const { day, mdy } = formatCalDate(e.date);
                  const badge = dayBadgeText(e.date);
                  const isSoon = daysFromToday(e.date) <= 1;
                  return (
                    <tr
                      key={`${e.symbol}-${e.date}`}
                      className="border-t border-[var(--border)] first:border-t-0"
                    >
                      <td className="px-2 py-0.5 text-[var(--amber-dim)]">{e.symbol}</td>
                      <td className="px-2 py-0.5 text-[var(--foreground)]">
                        {day} · {mdy}
                      </td>
                      <td
                        className={
                          "px-2 py-0.5 text-right text-[10px] " +
                          (isSoon ? "text-[var(--amber)]" : "text-[var(--dim)]")
                        }
                      >
                        {badge}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ─── Macro releases column ─── */}
        <div className="flex flex-col">
          <div className="border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
            Macro · Fed & data releases
          </div>
          {releases.length === 0 ? (
            <div className="p-3 text-center font-mono text-[11px] text-[var(--dim)]">
              No tracked macro releases in the next 14 days (or FRED key missing).
            </div>
          ) : (
            <table className="w-full font-mono text-[11px]">
              <tbody>
                {releases.map((r) => {
                  const { day, mdy } = formatCalDate(r.date);
                  const badge = dayBadgeText(r.date);
                  const isSoon = daysFromToday(r.date) <= 1;
                  const isHighPriority = r.priority === 1;
                  return (
                    <tr
                      key={`${r.id}-${r.date}`}
                      className="border-t border-[var(--border)] first:border-t-0"
                    >
                      <td
                        className={
                          "px-2 py-0.5 " +
                          (isHighPriority ? "text-[var(--amber)]" : "text-[var(--amber-dim)]")
                        }
                      >
                        {r.abbrev}
                      </td>
                      <td className="px-2 py-0.5 text-[var(--foreground)]">
                        {day} · {mdy}
                      </td>
                      <td
                        className={
                          "px-2 py-0.5 text-right text-[10px] " +
                          (isSoon ? "text-[var(--amber)]" : "text-[var(--dim)]")
                        }
                      >
                        {badge}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Panel>
  );
}
