import { getAssetDailySeries } from "@/lib/asset-daily";
import AssetDailyView from "@/components/asset-daily-view";
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
      technicals={<TechnicalsPanel symbol="000660.KS" currency="₩" />}
    />
  );
}
