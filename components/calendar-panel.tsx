import Link from "next/link";
import { getCalendarEvents, getAllOpportunities } from "@/lib/data";
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

  // Curated catalysts from the briefings (IPO pricings, signal windows, …),
  // cross-linked to the open ideas that hinge on them. Past events drop off.
  const events = getCalendarEvents().filter((e) => daysFromToday(e.date) >= 0);
  const openOpps = getAllOpportunities().filter(
    (o) => o.status === "active" || o.status === "triggered",
  );

  return (
    <Panel
      code="CAL"
      title="Week Ahead · Catalysts, Earnings & Macro"
      meta={<span>BRIEFINGS + YAHOO + FRED · 14D</span>}
    >
      {events.length > 0 && (
        <ul className="divide-y divide-[var(--border)] border-b border-[var(--border)]">
          {events.map((e) => {
            const { day, mdy } = formatCalDate(e.date);
            const badge = dayBadgeText(e.date);
            const isSoon = daysFromToday(e.date) <= 1;
            const linked = e.tickers
              ? openOpps.filter((o) => e.tickers!.includes(o.ticker))
              : [];
            return (
              <li key={`${e.date}-${e.label}`} className="px-2 py-1.5 font-mono">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px]">
                  <span className="shrink-0 border border-[var(--border)] bg-[var(--background)] px-1 text-[9px] uppercase tracking-wider text-[var(--cyan-term)]">
                    {e.kind}
                  </span>
                  <span className="min-w-0 flex-1 basis-48 text-[var(--foreground)]">
                    {e.label}
                  </span>
                  <span
                    className={
                      "ml-auto shrink-0 text-[10px] " +
                      (isSoon ? "text-[var(--amber)]" : "text-[var(--dim)]")
                    }
                  >
                    {day} · {mdy}
                    {e.time_et ? ` · ${e.time_et} ET` : ""} · {badge}
                  </span>
                </div>
                {(e.note || linked.length > 0) && (
                  <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[10px] leading-snug">
                    {e.note && <span className="text-[var(--dim)]">{e.note}</span>}
                    {linked.length > 0 && (
                      <span className="flex flex-wrap items-baseline gap-1">
                        <span className="uppercase tracking-wider text-[var(--amber-dim)]">
                          open ideas ▸
                        </span>
                        {linked.map((o) => (
                          <Link
                            key={o.id}
                            href={`/opportunities/${o.id}`}
                            title={o.title}
                            className="text-[var(--amber)] hover:underline"
                          >
                            {o.ticker}
                          </Link>
                        ))}
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
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
