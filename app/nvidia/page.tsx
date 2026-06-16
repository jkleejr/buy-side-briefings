import { getAssetDailySeries } from "@/lib/asset-daily";
import AssetCallRecord from "@/components/asset-call-record";
import AssetDailyView from "@/components/asset-daily-view";
import BigAssetChart from "@/components/big-asset-chart";
import FundamentalsPanel from "@/components/fundamentals-panel";
import TechnicalsPanel from "@/components/technicals-panel";

export const metadata = {
  title: "NVIDIA (NVDA) — Daily Investor Brief — Buy-Side Briefings",
  description:
    "Daily NVIDIA (NVDA) dossier: who made money today (bulls vs. bears), the buy/hold/sell call, price and options positioning, news, outlook, the bull and bear case, key levels, and catalysts ahead.",
};

export const revalidate = 300;

export default function NvidiaPage() {
  const series = getAssetDailySeries("nvda");

  if (series.length === 0) {
    return (
      <div className="border border-[var(--border)] bg-[var(--panel)] p-6 text-center font-mono text-[11px] text-[var(--dim)]">
        No NVIDIA briefings yet.
      </div>
    );
  }

  return (
    <AssetDailyView
      series={series}
      chart={
        <BigAssetChart
          symbol="NVDA"
          code="NVDA"
          title="NVIDIA · Price"
          color="#22d3ee"
          metaLabel="NASDAQ"
          learn="Live NVDA price with a range selector (1D–ALL). Data via Yahoo Finance; the dossier's decision and levels above are point-in-time editorial."
        />
      }
      fundamentals={<FundamentalsPanel symbol="NVDA" />}
      technicals={<TechnicalsPanel symbol="NVDA" />}
      callRecord={<AssetCallRecord series={series} symbol="NVDA" />}
    />
  );
}
