import { getAllBriefings, getLatestMarketsVerdict } from "@/lib/data";
import { getLatestAssetDaily } from "@/lib/asset-daily";
import VerdictCard from "@/components/verdict-card";
import AssetCallsPanel from "@/components/asset-calls-panel";
import SnapshotGrid from "@/components/snapshot-grid";
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

export default function Home() {
  const verdict = getLatestMarketsVerdict();
  const briefings = getAllBriefings();
  const assetCalls = [
    getLatestAssetDaily("nvda"),
    getLatestAssetDaily("btc"),
    getLatestAssetDaily("skhynix"),
  ].filter((d): d is NonNullable<typeof d> => d !== null);

  return (
    <div className="space-y-1">
      {verdict?.is_seed && (
        <div className="border border-[var(--amber-dim)] bg-[rgba(255,165,0,0.05)] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
          ⚠ Seed data · Generate a real briefing via Claude and commit to{" "}
          <code>data/briefings/</code> and <code>data/verdicts/</code>.
        </div>
      )}

      <div className="grid auto-rows-min grid-cols-1 gap-1 lg:grid-cols-12">
        {/* ========================= THE CALL ========================= */}
        {/* Decision-critical, top of the page: the verdict, today's asset
            buy/hold/sell calls, the markets snapshot, and live crypto. */}
        <SectionLabel title="The Call" note="latest verdict & today's decisions" />

        {verdict ? (
          <div className="lg:col-span-5">
            <VerdictCard verdict={verdict} />
          </div>
        ) : (
          <div className="lg:col-span-5">
            <Panel code="VRDCT" title="Latest Buy Verdict">
              <div className="p-4 text-center font-mono text-[11px] text-[var(--dim)]">
                No Buy Verdict on file yet.
              </div>
            </Panel>
          </div>
        )}
        {verdict && (
          <div className="lg:col-span-4">
            <SnapshotGrid verdict={verdict} />
          </div>
        )}
        <div className="lg:col-span-3">
          <CryptoPanel />
        </div>

        {/* Today's single-asset desks (NVDA · BTC · SK Hynix) — the
            buy/hold/sell + who-won read, linking to each full dossier. */}
        {assetCalls.length > 0 && (
          <div className="lg:col-span-12">
            <AssetCallsPanel calls={assetCalls} />
          </div>
        )}

        {/* ========================= MARKETS ========================= */}
        <SectionLabel title="Markets" note="equities, metals & overnight sessions" />

        {/* SPY only on the home page; QQQ + IWM live on /indices, tech on /tech. */}
        <div className="lg:col-span-9">
          <UsIndicesPanel
            assets={[
              { symbol: "SPY", label: "SPY", sublabel: "S&P 500", color: "#22d3ee" },
            ]}
            code="SPY"
            title="SPY · S&P 500"
            learn="The single most-watched US equity benchmark — SPDR S&P 500 ETF. Use this as the 'is the market up or down today?' read; full US-indices comparison (SPY · QQQ · IWM) lives on the Indices page."
          />
        </div>
        <div className="lg:col-span-3">
          <MetalsPanel />
        </div>
        <div className="lg:col-span-12">
          <GlobalMarketsPanel />
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
