import {
  getAllBriefings,
  getCalendarEvents,
  getLatestMarketsVerdict,
  getLatestCryptoVerdict,
} from "@/lib/data";
import { getLatestAssetDaily } from "@/lib/asset-daily";
import { getCoveredRelevance, getLiteRelevance } from "@/lib/relevance";
import { getMacroSignals } from "@/lib/macro-signals";
import { todayET } from "@/lib/utils";
import ForYouFeed from "@/components/for-you-feed";
import VerdictCard from "@/components/verdict-card";
import DecisionBar from "@/components/decision-bar";
import MarketPulseStrip from "@/components/market-pulse-strip";
import RegimeRiskBars from "@/components/regime-risk-bars";
import BriefingList from "@/components/briefing-list";
import FedPanel from "@/components/fed-panel";
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
  const liteRelevance = getLiteRelevance();
  const macroSignals = getMacroSignals();
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
      <ForYouFeed
        relevance={relevance}
        liteRelevance={liteRelevance}
        macroSignals={macroSignals}
      />

      {/* The answer first: standing call, every desk, and the next catalyst. */}
      <DecisionBar verdict={verdict} desks={assetCalls} nextCatalyst={nextCatalyst} />

      <div className="grid auto-rows-min grid-cols-1 gap-1 lg:grid-cols-12">
        {/* ===================== MARKET PULSE ===================== */}
        {/* The chart-free tape that gates every call: the key numbers, then the
            live regime triggers. Deep charts/context live on the dedicated
            pages (/markets, /indices, /crypto, /metals), reachable from nav. */}
        <SectionLabel title="Market Pulse" note="the tape that gates every call" />

        <div className="lg:col-span-12">
          <MarketPulseStrip verdict={verdict} crypto={crypto} />
        </div>
        {verdict && (
          <div id="regime" className="scroll-mt-12 lg:col-span-12">
            <RegimeRiskBars indicators={verdict.regime_risk} />
          </div>
        )}

        {/* ===================== TODAY'S CALL ===================== */}
        {/* The market verdict. Per-name standing calls live on each asset's own
            dossier page, linked from nav and the DecisionBar strip above. */}
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

        {/* =================== WHAT'S AHEAD =================== */}
        <SectionLabel title="What's Ahead" note="rates & the calendar to watch" />

        <div className="lg:col-span-7">
          <CalendarPanel />
        </div>
        <div className="lg:col-span-5">
          <FedPanel />
        </div>

        {/* ========================= BRIEFINGS ========================= */}
        <SectionLabel title="Latest Briefings" />

        <div className="lg:col-span-12">
          <BriefingList items={briefings} limit={6} />
        </div>
      </div>
    </div>
  );
}
