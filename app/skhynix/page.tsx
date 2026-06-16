import { getAssetDailySeries } from "@/lib/asset-daily";
import AssetCallRecord from "@/components/asset-call-record";
import AssetDailyView from "@/components/asset-daily-view";
import BigAssetChart from "@/components/big-asset-chart";
import TechnicalsPanel from "@/components/technicals-panel";

export const metadata = {
  title: "SK Hynix (000660.KS) — Daily Investor Brief — Buy-Side Briefings",
  description:
    "Daily SK Hynix dossier: who made money today (bulls vs. bears), the buy/hold/sell call, price and positioning, news, outlook, the bull and bear case, key levels, and catalysts — the HBM/AI-memory leader and supply-side twin of the NVIDIA trade.",
};

export const revalidate = 300;

export default function SkHynixPage() {
  const series = getAssetDailySeries("skhynix");

  if (series.length === 0) {
    return (
      <div className="border border-[var(--border)] bg-[var(--panel)] p-6 text-center font-mono text-[11px] text-[var(--dim)]">
        No SK Hynix briefings yet.
      </div>
    );
  }

  return (
    <AssetDailyView
      series={series}
      chart={
        <BigAssetChart
          symbol="000660.KS"
          code="HYNIX"
          title="SK Hynix · Price"
          color="#22d3ee"
          metaLabel="KRX"
          currencySymbol="₩"
          learn="Live SK Hynix (000660.KS) price in won with a range selector (1D–ALL). Data via Yahoo Finance; the dossier's decision and levels above are point-in-time editorial."
        />
      }
      technicals={<TechnicalsPanel symbol="000660.KS" currency="₩" />}
      callRecord={<AssetCallRecord series={series} symbol="000660.KS" />}
    />
  );
}
