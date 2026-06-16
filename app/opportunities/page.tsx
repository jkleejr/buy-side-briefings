import Link from "next/link";
import { getAllOpportunities, getCalendarEvents } from "@/lib/data";
import {
  checkOpenOpportunities,
  classifyOpenOpportunities,
  yahooSymbolFor,
} from "@/lib/opportunity-check";
import { computeOpenRisk } from "@/lib/risk";
import { getDailyCloses, type DailyClose } from "@/lib/markets";
import { buildBookCorrelation } from "@/lib/correlation";
import { todayET } from "@/lib/utils";
import Panel from "@/components/panel";
import OpportunitiesList from "@/components/opportunities-list";
import RankedOpportunities from "@/components/ranked-opportunities";
import CorrelationMap from "@/components/correlation-map";
import PlaybookPanel from "@/components/playbook-panel";
import RiskPanel from "@/components/risk-panel";

export const metadata = { title: "Opportunities — Buy-Side Briefings" };
export const revalidate = 300;

export default async function OpportunitiesPage() {
  const items = getAllOpportunities();
  const live = await checkOpenOpportunities(items);

  // Live plan-state per open idea + book-level risk (relocated off the home
  // page — this is where our trades actually live).
  const planChecks = await classifyOpenOpportunities(items);
  const openRisk = computeOpenRisk(items);
  const today = todayET();
  const todayEvents = getCalendarEvents().filter((e) => e.date === today);

  // Book correlation/beta: how many independent bets the open book really is.
  const bookTickers = [
    ...new Set(
      items
        .filter((o) => o.status === "active" || o.status === "triggered")
        .map((o) => o.ticker),
    ),
  ].slice(0, 12);
  const [benchSeries, ...tickerSeries] = await Promise.all([
    getDailyCloses("QQQ", 6),
    ...bookTickers.map((t) => getDailyCloses(yahooSymbolFor(t), 6)),
  ]);
  const seriesByTicker: Record<string, DailyClose[]> = {};
  bookTickers.forEach((t, i) => {
    if (tickerSeries[i]?.length) seriesByTicker[t] = tickerSeries[i];
  });
  const correlation = buildBookCorrelation(seriesByTicker, benchSeries, "QQQ");

  const activeCount = items.filter((o) => o.status === "active").length;
  const longCount = items.filter((o) =>
    ["long", "long_vol"].includes(o.direction),
  ).length;
  const highConv = items.filter((o) => o.conviction === "high").length;

  return (
    <div className="space-y-1">
      <header className="flex items-start justify-between gap-2 px-1 pb-2">
        <div className="space-y-1">
          <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Opportunities
          </h1>
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
            Active trade ideas · refreshed every weekday 8am ET · filter by direction · conviction · tag
          </p>
        </div>
        <Link
          href="/opportunities/history"
          className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] hover:underline"
        >
          HISTORY ▸
        </Link>
      </header>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
            Active
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--foreground)]">
            {activeCount}
          </div>
        </div>
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--up)]">
            Long
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--foreground)]">
            {longCount}
          </div>
        </div>
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--down)]">
            Short / Pair
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--foreground)]">
            {items.length - longCount}
          </div>
        </div>
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
            High Conviction
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--foreground)]">
            {highConv}
          </div>
        </div>
      </div>

      {/* What needs action right now + what the book risks if it all goes wrong.
          (Relocated from the home page so the dashboard stays informational.) */}
      {planChecks.length > 0 && (
        <div className="grid grid-cols-1 gap-1 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <PlaybookPanel checks={planChecks} todayEvents={todayEvents} />
          </div>
          <div className="lg:col-span-4">
            <RiskPanel risk={openRisk} />
          </div>
        </div>
      )}

      {/* #3 — rank the open book by expected value per unit of risk */}
      <RankedOpportunities items={items} />

      {/* Correlation/beta — is the book one bet wearing many tickers? */}
      {correlation && <CorrelationMap data={correlation} />}

      <Panel code="HOW" title="How to read these">
        <div className="space-y-1.5 p-2 font-mono text-[11px] leading-snug text-[var(--dim)]">
          <p>
            Each card is a discrete trade idea sourced from the briefings work — with a
            specific <span className="text-[var(--amber)]">entry</span>,{" "}
            <span className="text-[var(--amber)]">stop loss</span>,{" "}
            <span className="text-[var(--amber)]">targets</span>, and{" "}
            <span className="text-[var(--amber)]">position size</span>. Click a card for the
            full thesis: bull case, bear case, invalidation, sources.
          </p>
          <p>
            <span className="text-[var(--amber-dim)]">Conviction levels:</span>{" "}
            <span className="text-[var(--up)]">█ HIGH</span> — multi-leg thesis with strong
            evidence, ≥3:1 R/R;{" "}
            <span className="text-[var(--amber)]">█ MED</span> — single primary catalyst, 2:1
            R/R; <span className="text-[var(--dim)]">█ LOW</span> — speculative or tactical,
            often sized small as portfolio insurance / asymmetric tail bet.
          </p>
          <p>
            <span className="text-[var(--amber-dim)]">Not investment advice.</span>{" "}
            Educational only. Position sizes are illustrative; adjust to your own risk budget
            and account constraints. Sources are linked in each detail page.
          </p>
        </div>
      </Panel>

      {items.length === 0 ? (
        <Panel code="EMPTY" title="No opportunities yet">
          <div className="p-4 text-center font-mono text-[11px] text-[var(--dim)]">
            Add opportunities JSON files to{" "}
            <code className="text-[var(--amber)]">data/opportunities/</code> and commit.
          </div>
        </Panel>
      ) : (
        <OpportunitiesList items={items} live={live} />
      )}
    </div>
  );
}
