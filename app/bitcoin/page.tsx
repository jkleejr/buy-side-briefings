import Link from "next/link";
import { getAssetDailySeries } from "@/lib/asset-daily";
import { getThesis } from "@/lib/theses";
import AssetCallRecord from "@/components/asset-call-record";
import AssetDailyView from "@/components/asset-daily-view";
import BigAssetChart from "@/components/big-asset-chart";
import BtcFearGreedPanel from "@/components/btc-fear-greed-panel";
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

  const thesis = getThesis("bitcoin");

  return (
    <div className="space-y-2">
      {/* Standing thesis CTA — the permanent "why Bitcoin" narrative, above the
          daily dossier. */}
      {thesis && (
        <Link
          href="/bitcoin/thesis"
          className="group block border border-[var(--amber-dim)] bg-[rgba(255,165,0,0.05)] px-3 py-2 transition-colors hover:bg-[rgba(255,165,0,0.1)]"
        >
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
            <span className="h-1.5 w-1.5 shrink-0 bg-[var(--amber)]" />
            {thesis.meta.title}
            <span className="ml-auto shrink-0 text-[var(--cyan-term)] group-hover:text-[var(--amber)]">
              Read the full thesis ▸
            </span>
          </div>
          {thesis.meta.summary && (
            <p className="mt-1 line-clamp-2 font-mono text-[11px] leading-snug text-[var(--dim)]">
              {thesis.meta.summary}
            </p>
          )}
        </Link>
      )}

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
        fundamentals={
          <>
            <BtcFundamentalsPanel />
            <BtcFearGreedPanel />
          </>
        }
        technicals={<TechnicalsPanel symbol="BTC-USD" />}
        callRecord={<AssetCallRecord series={series} symbol="BTC-USD" />}
      />
    </div>
  );
}
