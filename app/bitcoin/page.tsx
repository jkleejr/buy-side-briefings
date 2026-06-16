import { getAssetDailySeries } from "@/lib/asset-daily";
import AssetCallRecord from "@/components/asset-call-record";
import AssetDailyView from "@/components/asset-daily-view";
import BigAssetChart from "@/components/big-asset-chart";
import BtcFundamentalsPanel from "@/components/btc-fundamentals-panel";
import TechnicalsPanel from "@/components/technicals-panel";

export const metadata = {
  title: "Bitcoin (BTC) — Daily Investor Brief — Buy-Side Briefings",
  description:
    "Daily Bitcoin (BTC) dossier: who made money today (bulls vs. bears), the buy/hold/sell call, price and derivatives positioning, news, outlook, the bull and bear case, key levels, and catalysts ahead.",
};

export const revalidate = 300;

export default function BitcoinPage() {
  const series = getAssetDailySeries("btc");

  if (series.length === 0) {
    return (
      <div className="border border-[var(--border)] bg-[var(--panel)] p-6 text-center font-mono text-[11px] text-[var(--dim)]">
        No Bitcoin briefings yet.
      </div>
    );
  }

  return (
    <AssetDailyView
      series={series}
      chart={
        <BigAssetChart
          symbol="BTC-USD"
          code="BTC"
          title="Bitcoin · Price"
          color="#22d3ee"
          metaLabel="USD · 24/7"
          learn="Live BTC-USD price with a range selector (1D–ALL). Data via Yahoo Finance; the dossier's decision and levels above are point-in-time editorial."
        />
      }
      fundamentals={<BtcFundamentalsPanel />}
      technicals={<TechnicalsPanel symbol="BTC-USD" />}
      callRecord={<AssetCallRecord series={series} symbol="BTC-USD" />}
    />
  );
}
