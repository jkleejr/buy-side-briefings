import { getAssetDailySeries } from "@/lib/asset-daily";
import AssetCallRecord from "@/components/asset-call-record";
import AssetDailyView from "@/components/asset-daily-view";
import TechnicalsPanel from "@/components/technicals-panel";

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
      technicals={<TechnicalsPanel symbol="SPCX" currency="$" />}
      callRecord={<AssetCallRecord series={series} symbol="SPCX" />}
    />
  );
}
