import { getAssetDailySeries } from "@/lib/asset-daily";
import AssetCallRecord from "@/components/asset-call-record";
import AssetDailyView from "@/components/asset-daily-view";
import BigAssetChart from "@/components/big-asset-chart";
import TechnicalsPanel from "@/components/technicals-panel";
import SpacexShortPanel from "@/components/spacex-short-panel";

export const metadata = {
  title: "SpaceX (SPCX) — Daily Investor Brief — Buy-Side Briefings",
  description:
    "Daily SpaceX dossier: who made money today (bulls vs. bears), the buy/hold/sell call, price and positioning, news, outlook, the bull and bear case, key levels, and catalysts — tracking the Starlink/Starship megacap since its record-breaking June 2026 IPO.",
};

export const revalidate = 300;

export default function SpaceXPage() {
  const series = getAssetDailySeries("spcx");

  if (series.length === 0) {
    return (
      <div className="border border-[var(--border)] bg-[var(--panel)] p-6 text-center font-mono text-[11px] text-[var(--dim)]">
        No SpaceX briefings yet.
      </div>
    );
  }

  return (
    <AssetDailyView
      series={series}
      chart={
        <BigAssetChart
          symbol="SPCX"
          code="SPCX"
          title="SpaceX · Price"
          color="#22d3ee"
          metaLabel="NYSE"
          learn="Live SPCX price with a range selector (1D–ALL). Data via Yahoo Finance; history only runs back to the June 2026 IPO. The dossier's decision and levels above are point-in-time editorial."
        />
      }
      technicals={<TechnicalsPanel symbol="SPCX" currency="$" />}
      callRecord={<AssetCallRecord series={series} symbol="SPCX" />}
      extra={<SpacexShortPanel />}
    />
  );
}
