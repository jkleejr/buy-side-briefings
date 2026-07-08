import Link from "next/link";
import BigAssetChart from "@/components/big-asset-chart";
import UsIndicesPanel from "@/components/us-indices-panel";
import Panel from "@/components/panel";

export const metadata = { title: "US Indices — Buy-Side Briefings" };
export const revalidate = 60;

export default function IndicesPage() {
  return (
    <div className="space-y-1">
      <header className="space-y-1 px-1 pb-2">
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] hover:underline"
        >
          ◂ DASHBOARD
        </Link>
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          US Indices
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          SPY · QQQ · IWM — the three benchmarks that frame every US trading day
        </p>
      </header>

      {/* Same shared-timeframe comparison panel as the old dashboard row. */}
      <UsIndicesPanel />

      <BigAssetChart
        symbol="SPY"
        code="SPY"
        title="SPY — S&P 500 ETF (the broad market)"
        color="#22d3ee"
        metaLabel="500 LARGEST US COMPANIES · CAP-WEIGHTED"
      />

      <BigAssetChart
        symbol="QQQ"
        code="QQQ"
        title="QQQ — Nasdaq 100 ETF (tech-heavy growth)"
        color="#fbbf24"
        metaLabel="100 LARGEST NON-FIN NASDAQ NAMES"
      />

      <BigAssetChart
        symbol="IWM"
        code="IWM"
        title="IWM — Russell 2000 ETF (small-cap domestic economy)"
        color="#84cc16"
        metaLabel="~85% US REVENUE · BREADTH READ"
      />

      <Panel code="EDU" title="How to read these three together">
        <div className="space-y-3 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <div>
            <div className="text-[var(--amber)]">Why three indices and not one</div>
            <p className="mt-1">
              SPY alone hides the texture of a market. The S&P is cap-weighted —
              the ten biggest names are ~35% of the index — so SPY can print green
              on a day where the average stock is flat or red. Pairing SPY with
              QQQ (concentrated tech growth) and IWM (small-cap domestic) tells
              you <span className="text-[var(--amber)]">what kind</span> of day it
              actually was, not just the headline number.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">The classic combinations</div>
            <ul className="mt-1 ml-3 list-disc space-y-1 pl-2 marker:text-[var(--amber-dim)]">
              <li>
                <span className="text-[var(--amber-dim)]">SPY up · QQQ up · IWM up</span>
                {" "}— broad risk-on. Strongest tape.
              </li>
              <li>
                <span className="text-[var(--amber-dim)]">SPY up · QQQ up · IWM down</span>
                {" "}— narrow mega-cap rally. Looks healthy on the headline; isn&apos;t.
              </li>
              <li>
                <span className="text-[var(--amber-dim)]">SPY flat · QQQ down · IWM up</span>
                {" "}— rotation out of growth into cyclicals/value. Often a regime change.
              </li>
              <li>
                <span className="text-[var(--amber-dim)]">SPY down · QQQ down · IWM down hard</span>
                {" "}— risk-off across the board. Recession fear or liquidity event.
              </li>
            </ul>
          </div>

          <div>
            <div className="text-[var(--amber)]">Why IWM is the tell</div>
            <p className="mt-1">
              Small caps are ~85% domestic-revenue and far more sensitive to
              credit conditions, the dollar, and the real US economy than the
              multinational mega-caps in SPY/QQQ. When IWM leads, money is
              betting on broad growth and easier financial conditions. When IWM
              lags badly for weeks, the bond market is usually already pricing
              recession before equities admit it.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
