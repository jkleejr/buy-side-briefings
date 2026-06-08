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

export default function Home() {
  const verdict = getLatestMarketsVerdict();
  const briefings = getAllBriefings();
  const assetCalls = [getLatestAssetDaily("nvda"), getLatestAssetDaily("btc")].filter(
    (d): d is NonNullable<typeof d> => d !== null,
  );

  return (
    <div className="space-y-2.5">
      {verdict?.is_seed && (
        <div className="rounded-[var(--radius)] border border-[var(--amber)]/40 bg-[var(--amber-soft)] px-3 py-2 text-[11px] text-[var(--amber)]">
          ⚠ Seed data · Generate a real briefing via Claude and commit to{" "}
          <code className="rounded bg-[var(--panel-head)] px-1 py-0.5">data/briefings/</code> and{" "}
          <code className="rounded bg-[var(--panel-head)] px-1 py-0.5">data/verdicts/</code>.
        </div>
      )}

      <div className="grid auto-rows-min grid-cols-1 gap-2.5 lg:grid-cols-12">
        {/* Row 1 */}
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

        {/* Row 1.5 — single-asset daily calls (NVDA + BTC): the buy/hold/sell
            and who-won read, linking to the full /nvidia and /bitcoin dossiers */}
        {assetCalls.length > 0 && (
          <div className="lg:col-span-12">
            <AssetCallsPanel calls={assetCalls} />
          </div>
        )}

        {/* Row 2 — SPY only on the home page; QQQ + IWM live on /indices,
            tech stocks on /tech (linked from the nav). */}
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

        {/* Row 3 — US breadth & risk internals (the 6 numbers a desk trader scans first) */}
        <div className="lg:col-span-12">
          <UsPulsePanel />
        </div>

        {/* Row 4 — Week-ahead calendar: upcoming earnings + macro releases */}
        <div className="lg:col-span-12">
          <CalendarPanel />
        </div>

        {/* Row 5 — Global markets (overnight & European sessions) */}
        <div className="lg:col-span-12">
          <GlobalMarketsPanel />
        </div>

        {/* Row 5 */}
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

        {/* Row 3 — Sector spans 2 rows to fit its 11 entries beside Macro + Briefings */}
        <div className="lg:col-span-8">
          <FedPanel />
        </div>
        <div className="lg:col-span-4 lg:row-span-2">
          <SectorRotation />
        </div>

        {/* Row 4 (Briefings sits under Macro, beside the tall Sector column) */}
        <div className="lg:col-span-8">
          <BriefingList items={briefings} limit={6} />
        </div>
      </div>
    </div>
  );
}
