import { getAssetDailySeries } from "@/lib/asset-daily";
import AssetCallRecord from "@/components/asset-call-record";
import AssetDailyView from "@/components/asset-daily-view";
import BigAssetChart from "@/components/big-asset-chart";
import TechnicalsPanel from "@/components/technicals-panel";

export const metadata = {
  title: "CoreWeave (CRWV) — Daily Investor Brief — Buy-Side Briefings",
  description:
    "Daily CoreWeave dossier: who made money today (bulls vs. bears), the buy/hold/sell call, price and positioning, news, outlook, the bull and bear case, key levels, and catalysts — the flagship AI neocloud renting Nvidia GPUs to OpenAI and Anthropic, and an Aschenbrenner long.",
};

export const revalidate = 300;

export default function CoreWeavePage() {
  const series = getAssetDailySeries("crwv");

  if (series.length === 0) {
    return (
      <div className="border border-[var(--border)] bg-[var(--panel)] p-6 text-center font-mono text-[11px] text-[var(--dim)]">
        No CoreWeave briefings yet.
      </div>
    );
  }

  return (
    <AssetDailyView
      series={series}
      chart={
        <BigAssetChart
          symbol="CRWV"
          code="CRWV"
          title="CoreWeave · Price"
          color="#22d3ee"
          metaLabel="NASDAQ"
          learn="Live CoreWeave (CRWV) price with a range selector (1D–ALL). Data via Yahoo Finance; the dossier's decision and levels above are point-in-time editorial."
        />
      }
      technicals={<TechnicalsPanel symbol="CRWV" />}
      callRecord={<AssetCallRecord series={series} symbol="CRWV" />}
    />
  );
}
