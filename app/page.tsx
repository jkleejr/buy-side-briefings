import {
  getAllBriefings,
  getAllMarketsVerdicts,
  getAllOpportunities,
  getLatestMarketsVerdict,
  getLatestCryptoVerdict,
  getOpportunityStats,
} from "@/lib/data";
import { buildPaperPortfolio } from "@/lib/paper-portfolio";
import { getLatestAssetDaily } from "@/lib/asset-daily";
import { getSpxDailyCloses } from "@/lib/markets";
import { aggregateStats, monthsBackFor, scoreVerdict } from "@/lib/verdict-scoring";
import TrackGlanceStrip from "@/components/track-glance-strip";
import VerdictCard from "@/components/verdict-card";
import AssetCallsPanel from "@/components/asset-calls-panel";
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
// Terminal-styled (amber mono label + hairline rule); doubles as a clear
// section break when panels stack into a single column on mobile.
function SectionLabel({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-center gap-2 px-0.5 pt-2 pb-0.5 lg:col-span-12">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
        {title}
      </span>
      {note && (
        <span className="hidden font-mono text-[10px] tracking-wide text-[var(--dim)] sm:inline">
          · {note}
        </span>
      )}
      <span className="ml-1 h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}

export default async function Home() {
  const verdict = getLatestMarketsVerdict();
  const crypto = getLatestCryptoVerdict();
  const briefings = getAllBriefings();
  const assetCalls = [
    getLatestAssetDaily("nvda"),
    getLatestAssetDaily("btc"),
    getLatestAssetDaily("skhynix"),
  ].filter((d): d is NonNullable<typeof d> => d !== null);

  // Accountability strip: score every verdict against SPX (same math as
  // /track-record) plus the opportunities journal stats.
  const allVerdicts = getAllMarketsVerdicts();
  const earliest = allVerdicts.length ? allVerdicts[allVerdicts.length - 1].date : null;
  const spxSeries = await getSpxDailyCloses(monthsBackFor(earliest));
  const scoredRows = allVerdicts.map((v) => ({ v, score: scoreVerdict(v, spxSeries) }));
  let hits = 0;
  let scored = 0;
  for (const { score } of scoredRows) {
    for (const r of [score.right_d1, score.right_d5, score.right_d20]) {
      if (r === null) continue;
      scored += 1;
      if (r) hits += 1;
    }
  }
  const hitRate = scored > 0 ? (hits / scored) * 100 : null;
  const { streak_d5 } = aggregateStats(scoredRows);
  const oppStats = getOpportunityStats();
  const portfolio = buildPaperPortfolio(getAllOpportunities(), spxSeries);
  const equity = portfolio
    ? {
        values: portfolio.points.slice(-60).map((p) => p.strategy),
        total_pct: portfolio.stats.total_return_pct,
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

      {/* At-a-glance market header — fills the top edge-to-edge, no dead space. */}
      <MarketKpiStrip verdict={verdict} crypto={crypto} />

      {/* Accountability at a glance: hit rate, streak, what's on the book. */}
      <TrackGlanceStrip
        hitRate={hitRate}
        hits={hits}
        scored={scored}
        streak={streak_d5}
        ops={oppStats}
        equity={equity}
      />

      <div className="grid auto-rows-min grid-cols-1 gap-1 lg:grid-cols-12">
        {/* ========================= THE CALL ========================= */}
        {/* Verdict and today's asset buy/hold/sell calls, side by side. */}
        <SectionLabel title="The Call" note="latest verdict & today's decisions" />

        {verdict ? (
          <div className="lg:col-span-8">
            <VerdictCard verdict={verdict} />
          </div>
        ) : (
          <div className="lg:col-span-8">
            <Panel code="VRDCT" title="Latest Buy Verdict">
              <div className="p-4 text-center font-mono text-[11px] text-[var(--dim)]">
                No Buy Verdict on file yet.
              </div>
            </Panel>
          </div>
        )}
        {assetCalls.length > 0 ? (
          <div className="lg:col-span-4">
            <AssetCallsPanel calls={assetCalls} />
          </div>
        ) : (
          <div className="lg:col-span-4">
            <CryptoPanel />
          </div>
        )}

        {/* ========================= MARKETS ========================= */}
        {/* Three index charts share one panel (no lonely wide chart), with
            metals beside; global sessions and live crypto fill the next row. */}
        <SectionLabel title="Markets" note="US indices, metals, crypto & overnight sessions" />

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

        {/* =================== BREADTH, SENTIMENT & RISK =================== */}
        <SectionLabel title="Breadth, Sentiment & Risk" note="the internals a desk scans first" />

        <div className="lg:col-span-12">
          <UsPulsePanel />
        </div>
        <div className="lg:col-span-5">
          <SentimentPanel />
        </div>
        {verdict && (
          <div className="lg:col-span-4">
            <RegimeRiskBars indicators={verdict.regime_risk} />
          </div>
        )}
        <div className="lg:col-span-3">
          <CyclePanel />
        </div>

        {/* =================== MACRO, SECTORS & WEEK AHEAD =================== */}
        <SectionLabel title="Macro, Sectors & Week Ahead" />

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
