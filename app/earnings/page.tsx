import { getEarningsSchedule, countdownBadge } from "@/lib/earnings";
import EarningsSchedule from "@/components/earnings-schedule";

// The route stays /earnings — it is linked from the briefings and indexed —
// but the page presents itself as the Calendar everywhere a reader sees it.
export const metadata = {
  title: "Calendar — Buy-Side Briefings",
  description:
    "Upcoming events for every stock you track: a timeline chart and full calendar with dates, countdowns, and the Street's EPS and revenue estimates — confirmed vs. estimated.",
};

// Live from Yahoo; refresh hourly.
export const revalidate = 3600;

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5 border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
      <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
        {label}
      </span>
      <span
        className="font-mono text-[13px] font-semibold tracking-tight"
        style={{ color: tone ?? "var(--foreground)" }}
      >
        {value}
      </span>
      {sub && (
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
          {sub}
        </span>
      )}
    </div>
  );
}

export default async function EarningsPage() {
  const schedule = await getEarningsSchedule();
  const { entries } = schedule;

  const next = entries[0] ?? null;
  const within7 = entries.filter((e) => e.daysUntil >= 0 && e.daysUntil <= 7).length;
  const within30 = entries.filter((e) => e.daysUntil >= 0 && e.daysUntil <= 30).length;

  return (
    <div className="mx-auto max-w-5xl space-y-1">
      <header className="space-y-1 px-1 pb-1">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Upcoming events
        </h1>
      </header>

      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        <Stat
          label="Next Up"
          value={next ? next.symbol : "—"}
          sub={next ? `${countdownBadge(next.daysUntil)} · ${next.isEstimate ? "est" : "confirmed"}` : undefined}
          tone="var(--amber)"
        />
        <Stat label="Next 7 Days" value={String(within7)} sub="reports" tone={within7 ? "var(--amber)" : undefined} />
        <Stat label="Next 30 Days" value={String(within30)} sub="reports" tone="var(--cyan-term)" />
        <Stat label="Tracked" value={String(entries.length)} sub="with a date" />
      </div>

      <EarningsSchedule schedule={schedule} />

      <p className="px-1 pt-2 font-mono text-[10px] leading-snug text-[var(--dim)]">
        Dates and consensus via Yahoo Finance, refreshed hourly. Drawn from your{" "}
        <a href="/watchlist" className="text-[var(--cyan-term)] hover:underline">
          watchlist
        </a>{" "}
        — add a ticker there and it appears here automatically. Estimated dates
        (○) can shift; confirmed dates (●) are company-announced. Educational only —
        not investment advice.
      </p>
    </div>
  );
}
