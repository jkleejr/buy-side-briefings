import {
  getAllBriefings,
  getCalendarEvents,
  getLatestMarketsVerdict,
  getLatestCryptoVerdict,
} from "@/lib/data";
import { getLatestAssetDaily } from "@/lib/asset-daily";
import { getCoveredRelevance } from "@/lib/relevance";
import { todayET } from "@/lib/utils";
import ForYouFeed from "@/components/for-you-feed";
import VerdictCard from "@/components/verdict-card";
import DecisionBar from "@/components/decision-bar";
import MarketKpiStrip from "@/components/market-kpi-strip";
import RegimeRiskBars from "@/components/regime-risk-bars";
import BriefingList from "@/components/briefing-list";
import CryptoPanel from "@/components/crypto-panel";
import SentimentPanel from "@/components/sentiment-panel";
import SectorRotation from "@/components/sector-rotation";
import FedPanel from "@/components/fed-panel";
import CyclePanel from "@/components/cycle-panel";
import UsIndicesPanel from "@/components/us-indices-panel";
import MetalsPanel from "@/components/metals-panel";
import GlobalMarketsPanel from "@/components/global-markets-panel";
import UsPulsePanel from "@/components/us-pulse-panel";
import CalendarPanel from "@/components/calendar-panel";
import Panel from "@/components/panel";

export const revalidate = 300;

// Full-width labeled divider that groups the dashboard into scannable sections.
// Terminal-styled (amber square + label + hairline rule); doubles as a clear
// section break when panels stack into a single column on mobile.
function SectionLabel({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-center gap-2 px-0.5 pt-6 pb-1 first:pt-2 lg:col-span-12">
      <span className="h-1.5 w-1.5 shrink-0 bg-[var(--amber)]" />
      <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber)]">
        {title}
      </span>
      {note && (
        <span className="hidden font-mono text-[10px] tracking-wide text-[var(--dim)] sm:inline">
          · {note}
        </span>
      )}
      <span className="ml-1 h-px flex-1 bg-[var(--border-strong)]" />
    </div>
  );
}

export default function Home() {
  const verdict = getLatestMarketsVerdict();
  const crypto = getLatestCryptoVerdict();
  const briefings = getAllBriefings();
  const relevance = getCoveredRelevance();
  const assetCalls = [
    getLatestAssetDaily("nvda"),
    getLatestAssetDaily("btc"),
    getLatestAssetDaily("skhynix"),
    getLatestAssetDaily("mu"),
    getLatestAssetDaily("nbis"),
    getLatestAssetDaily("be"),
    getLatestAssetDaily("crwv"),
    getLatestAssetDaily("spcx"),
  ].filter((d): d is NonNullable<typeof d> => d !== null);

  // Next catalyst for the decision bar's countdown.
  const today = todayET();
  const upcomingEvents = getCalendarEvents()
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextCatalyst = upcomingEvents.length
    ? {
        label: upcomingEvents[0].label,
        date: upcomingEvents[0].date,
        days: Math.round(
          (Date.parse(upcomingEvents[0].date) - Date.parse(today)) / 86_400_000,
        ),
      }
    : null;

  return (
    <div className="space-y-1">
      {verdict?.is_seed && (
        <div className="border border-[var(--amber-dim)] bg-[rgba(255,165,0,0.05)] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
          ⚠ Seed data · Generate a real briefing via Claude and commit to{" "}
          <code>data/briefings/</code> and <code>data/verdicts/</code>.
        </div>
      )}

      {/* So what for me? — the personalized layer. Reads the user's holdings
          (this browser) and translates each desk's call into what it means for
          their book. Sits above the market-wide view by design. */}
      <ForYouFeed relevance={relevance} />

      {/* The answer first: standing call, every desk, and the next catalyst. */}
      <DecisionBar verdict={verdict} desks={assetCalls} nextCatalyst={nextCatalyst} />

      {/* At-a-glance market header — fills the top edge-to-edge, no dead space. */}
      <MarketKpiStrip verdict={verdict} crypto={crypto} />

      <div className="grid auto-rows-min grid-cols-1 gap-1 lg:grid-cols-12">
        {/* ===================== TODAY'S CALL ===================== */}
        {/* The market verdict. Per-name standing calls live on each asset's own
            dossier page (/nvidia, /bitcoin, /skhynix, /spacex), linked from nav
            and the DecisionBar strip above — kept off the homepage by design. */}
        <SectionLabel title="Today's Call" note="the market verdict" />

        {verdict ? (
          <div className="lg:col-span-12">
            <VerdictCard verdict={verdict} />
          </div>
        ) : (
          <div className="lg:col-span-12">
            <Panel code="VRDCT" title="Latest Buy Verdict">
              <div className="p-4 text-center font-mono text-[11px] text-[var(--dim)]">
                No Buy Verdict on file yet.
              </div>
            </Panel>
          </div>
        )}

        {/* ===================== MARKET CONTEXT ===================== */}
        {/* The backdrop for any decision: indices, metals, world, crypto, and
            the internals a desk scans before acting. */}
        <SectionLabel title="Market Context" note="indices, world, crypto & the internals" />

        <div className="lg:col-span-9">
          <UsIndicesPanel />
        </div>
        <div className="lg:col-span-3">
          <MetalsPanel />
        </div>
        <div className="lg:col-span-8">
          <GlobalMarketsPanel />
        </div>
        <div className="lg:col-span-4">
          <CryptoPanel />
        </div>
        <div className="lg:col-span-12">
          <UsPulsePanel />
        </div>
        <div className="lg:col-span-5">
          <SentimentPanel />
        </div>
        {verdict && (
          <div id="regime" className="scroll-mt-12 lg:col-span-4">
            <RegimeRiskBars indicators={verdict.regime_risk} />
          </div>
        )}
        <div className="lg:col-span-3">
          <CyclePanel />
        </div>

        {/* =================== MACRO & WHAT'S AHEAD =================== */}
        <SectionLabel title="Macro & What's Ahead" note="rates, the cycle & the calendar to watch" />

        {/* Sector spans 2 rows to sit beside both the Fed panel and the calendar. */}
        <div className="lg:col-span-8">
          <FedPanel />
        </div>
        <div className="lg:col-span-4 lg:row-span-2">
          <SectorRotation />
        </div>
        <div className="lg:col-span-8">
          <CalendarPanel />
        </div>

        {/* ========================= BRIEFINGS ========================= */}
        <SectionLabel title="Latest Briefings" />

        <div className="lg:col-span-12">
          <BriefingList items={briefings} limit={8} />
        </div>
      </div>
    </div>
  );
}
