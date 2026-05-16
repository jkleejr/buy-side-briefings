import Link from "next/link";
import BigAssetChart from "@/components/big-asset-chart";
import UsPulsePanel from "@/components/us-pulse-panel";
import Panel from "@/components/panel";
import { TICKER_TIPS } from "@/lib/glossary";

export const metadata = { title: "US Pulse — Buy-Side Briefings" };
export const revalidate = 60;

export default function PulsePage() {
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
          US Pulse
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          Breadth · credit · commodities · long bonds — what SPX alone hides
        </p>
      </header>

      {/* Current snapshot — same component as the dashboard. */}
      <UsPulsePanel />

      <Panel code="DEPTH" title="Each indicator, full chart">
        <p className="p-2 font-mono text-[11px] leading-snug text-[var(--dim)]">
          Today&apos;s tile snapshot up top, full historical charts below. Pick
          any timeframe — the long view is usually more revealing for these
          indicators since regime changes play out over months.
        </p>
      </Panel>

      <BigAssetChart
        symbol="^RUT"
        code="RUT"
        title="Russell 2000 — Small Caps"
        color="#22d3ee"
        learn={TICKER_TIPS["^RUT"]}
        metaLabel="BROAD US ECONOMY READ"
      />

      <BigAssetChart
        symbol="RSP"
        code="RSP"
        title="S&P 500 Equal Weight (vs cap-weight SPY = breadth)"
        color="#84cc16"
        learn={TICKER_TIPS["RSP"]}
        metaLabel="BREADTH PROXY"
      />

      <BigAssetChart
        symbol="HG=F"
        code="COPPER"
        title="Copper Futures — Dr. Copper"
        color="#fb923c"
        learn={TICKER_TIPS["HG=F"]}
        metaLabel="GLOBAL GROWTH PULSE"
      />

      <BigAssetChart
        symbol="HYG"
        code="HYG"
        title="High-Yield Corporate Bond ETF"
        color="#ef4444"
        learn={TICKER_TIPS["HYG"]}
        metaLabel="CREDIT STRESS SIGNAL"
      />

      <Panel code="EDU" title="What the pulse panel is for">
        <div className="space-y-3 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <div>
            <div className="text-[var(--amber)]">The hidden story SPX hides</div>
            <p className="mt-1">
              The S&P 500 is cap-weighted — the top 10 stocks make up ~35% of the
              index. So if Apple/Microsoft/Nvidia/Amazon/Meta are up while everything
              else is flat, SPX still prints green. This page exists because that
              kind of <span className="text-[var(--amber)]">narrow rally is
              historically fragile</span> — bull markets that broaden tend to
              keep going; ones that narrow tend to top.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">How to read each chart</div>
            <ul className="mt-1 ml-3 list-disc space-y-1 pl-2 marker:text-[var(--amber-dim)]">
              <li>
                <span className="text-[var(--amber-dim)]">Russell 2000</span> — when
                this outperforms SPX, the rally is broad and includes the actual US
                domestic economy. When it underperforms badly, only mega-caps are
                working — narrow rally, fragile.
              </li>
              <li>
                <span className="text-[var(--amber-dim)]">RSP (Equal-Weight S&P)</span>
                {" "}— same idea but cleaner: every S&P stock equal-weighted. RSP
                outperforming SPY = the average stock is rising. SPY outperforming RSP
                = the index is being lifted by a few names.
              </li>
              <li>
                <span className="text-[var(--amber-dim)]">Copper</span> — &quot;Dr.
                Copper, the PhD economist.&quot; Copper goes into everything
                industrial (construction, EVs, electronics, grid infrastructure).
                Rising = global growth accelerating. Falling = demand softening. One
                of the cleanest leading indicators of real economic activity.
              </li>
              <li>
                <span className="text-[var(--amber-dim)]">HYG</span> — junk corporate
                bonds. When HYG breaks down, credit spreads are widening — investors
                demanding more compensation for risky debt. This is usually an early
                warning before equity weakness. Stocks crack later; credit cracks
                first.
              </li>
            </ul>
          </div>

          <div>
            <div className="text-[var(--amber)]">The composite signal</div>
            <p className="mt-1">
              When 3 or 4 of these turn at once — Russell breaking down + RSP
              underperforming + Copper rolling over + HYG selling off — that&apos;s
              a real risk-off setup, not a one-day flush. The Friday May 15 night
              briefing flagged exactly this confluence.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">Common false signals to ignore</div>
            <p className="mt-1">
              One day of weakness usually isn&apos;t signal — especially around
              options expiry (third Friday of every month), quarter-end rebalances,
              or FOMC days. Look for sustained 5–10 day deterioration across multiple
              indicators before treating it as regime change.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
