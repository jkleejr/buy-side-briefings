import { getEarningsSchedule } from "@/lib/earnings";
import { getFomcEvents, getBojEvents } from "@/lib/calendar-feeds";
import { todayET } from "@/lib/utils";
import EarningsSchedule from "@/components/earnings-schedule";
import PolicyDecisions from "@/components/policy-decisions";

// The route stays /earnings — it is linked from the briefings and indexed —
// but the page presents itself as the Calendar everywhere a reader sees it.
export const metadata = {
  title: "Calendar",
  description:
    "Upcoming Events for every stock you track: a timeline chart and full calendar with dates, countdowns, and the Street's EPS and revenue estimates — confirmed vs. estimated.",
};

// Live from Yahoo; refresh hourly.
export const revalidate = 3600;

export default async function EarningsPage() {
  const schedule = await getEarningsSchedule();

  // Fed and BoJ decisions come from static published tables, so this is a
  // synchronous read with no failure mode — the calendar can't be thinned by a
  // feed hiccup the way the earnings half can.
  //
  // Lookback 0: the page is titled "Upcoming Events", and a decision that has
  // already happened is not one. A meeting dated today still counts, since
  // `since` is today itself rather than tomorrow.
  const today = todayET();
  const policy = [...getFomcEvents(today, 0), ...getBojEvents(today, 0)].sort(
    (a, b) => a.date.localeCompare(b.date),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-1 px-4 pb-14 pt-[39px] sm:px-6">
      <header className="space-y-1 pb-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Upcoming Events
        </h1>
      </header>

      <PolicyDecisions events={policy} today={today} />

      <EarningsSchedule schedule={schedule} />
    </div>
  );
}
