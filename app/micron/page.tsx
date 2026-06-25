import { getAssetDailySeries } from "@/lib/asset-daily";
import AssetCallRecord from "@/components/asset-call-record";
import AssetDailyView from "@/components/asset-daily-view";
import BigAssetChart from "@/components/big-asset-chart";
import TechnicalsPanel from "@/components/technicals-panel";

export const metadata = {
  title: "Micron (MU) — Daily Investor Brief — Buy-Side Briefings",
  description:
    "Daily Micron dossier: who made money today (bulls vs. bears), the buy/hold/sell call, price and positioning, news, outlook, the bull and bear case, key levels, and catalysts — the HBM/DRAM leader at the center of the AI-memory super-cycle.",
};

export const revalidate = 300;

export default function MicronPage() {
  const series = getAssetDailySeries("mu");

  if (series.length === 0) {
    return (
      <div className="border border-[var(--border)] bg-[var(--panel)] p-6 text-center font-mono text-[11px] text-[var(--dim)]">
        No Micron briefings yet.
      </div>
    );
  }

  return (
    <AssetDailyView
      series={series}
      chart={
        <BigAssetChart
          symbol="MU"
          code="MU"
          title="Micron · Price"
          color="#22d3ee"
          metaLabel="NASDAQ"
          learn="Live Micron (MU) price with a range selector (1D–ALL). Data via Yahoo Finance; the dossier's decision and levels above are point-in-time editorial."
        />
      }
      technicals={<TechnicalsPanel symbol="MU" />}
      callRecord={<AssetCallRecord series={series} symbol="MU" />}
    />
  );
}
