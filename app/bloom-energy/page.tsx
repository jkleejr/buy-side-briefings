import { getAssetDailySeries } from "@/lib/asset-daily";
import AssetCallRecord from "@/components/asset-call-record";
import AssetDailyView from "@/components/asset-daily-view";
import BigAssetChart from "@/components/big-asset-chart";
import TechnicalsPanel from "@/components/technicals-panel";

export const metadata = {
  title: "Bloom Energy (BE) — Daily Investor Brief — Buy-Side Briefings",
  description:
    "Daily Bloom Energy dossier: who made money today (bulls vs. bears), the buy/hold/sell call, price and positioning, news, outlook, the bull and bear case, key levels, and catalysts — the fuel-cell maker powering AI data centers and Aschenbrenner's top long.",
};

export const revalidate = 300;

export default function BloomEnergyPage() {
  const series = getAssetDailySeries("be");

  if (series.length === 0) {
    return (
      <div className="border border-[var(--border)] bg-[var(--panel)] p-6 text-center font-mono text-[11px] text-[var(--dim)]">
        No Bloom Energy briefings yet.
      </div>
    );
  }

  return (
    <AssetDailyView
      series={series}
      chart={
        <BigAssetChart
          symbol="BE"
          code="BE"
          title="Bloom Energy · Price"
          color="#22d3ee"
          metaLabel="NYSE"
          learn="Live Bloom Energy (BE) price with a range selector (1D–ALL). Data via Yahoo Finance; the dossier's decision and levels above are point-in-time editorial."
        />
      }
      technicals={<TechnicalsPanel symbol="BE" />}
      callRecord={<AssetCallRecord series={series} symbol="BE" />}
    />
  );
}
