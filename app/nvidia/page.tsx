import { getAssetDailySeries } from "@/lib/asset-daily";
import AssetDailyView from "@/components/asset-daily-view";
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
    <AssetDailyView series={series} technicals={<TechnicalsPanel symbol="NVDA" />} />
  );
}
