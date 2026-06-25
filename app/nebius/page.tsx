import { getAssetDailySeries } from "@/lib/asset-daily";
import AssetCallRecord from "@/components/asset-call-record";
import AssetDailyView from "@/components/asset-daily-view";
import BigAssetChart from "@/components/big-asset-chart";
import TechnicalsPanel from "@/components/technicals-panel";

export const metadata = {
  title: "Nebius (NBIS) — Daily Investor Brief — Buy-Side Briefings",
  description:
    "Daily Nebius dossier: who made money today (bulls vs. bears), the buy/hold/sell call, price and positioning, news, outlook, the bull and bear case, key levels, and catalysts — the AI neocloud built on compute and power, the bottleneck of the AI buildout.",
};

export const revalidate = 300;

export default function NebiusPage() {
  const series = getAssetDailySeries("nbis");

  if (series.length === 0) {
    return (
      <div className="border border-[var(--border)] bg-[var(--panel)] p-6 text-center font-mono text-[11px] text-[var(--dim)]">
        No Nebius briefings yet.
      </div>
    );
  }

  return (
    <AssetDailyView
      series={series}
      chart={
        <BigAssetChart
          symbol="NBIS"
          code="NBIS"
          title="Nebius · Price"
          color="#22d3ee"
          metaLabel="NASDAQ"
          learn="Live Nebius (NBIS) price with a range selector (1D–ALL). Data via Yahoo Finance; the dossier's decision and levels above are point-in-time editorial."
        />
      }
      technicals={<TechnicalsPanel symbol="NBIS" />}
      callRecord={<AssetCallRecord series={series} symbol="NBIS" />}
    />
  );
}
