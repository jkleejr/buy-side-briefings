import { getAssetDailySeries } from "@/lib/asset-daily";
import AssetDailyView from "@/components/asset-daily-view";

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

  return <AssetDailyView series={series} />;
}
