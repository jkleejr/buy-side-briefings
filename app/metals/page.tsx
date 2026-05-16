import Link from "next/link";
import BigAssetChart from "@/components/big-asset-chart";
import BigCompareChart from "@/components/big-compare-chart";
import Panel from "@/components/panel";
import { TICKER_TIPS } from "@/lib/glossary";

export const metadata = { title: "Metals — Buy-Side Briefings" };
export const revalidate = 60;

export default function MetalsPage() {
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
          Precious Metals
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          Gold · Silver · how to read them
        </p>
      </header>

      <BigAssetChart
        symbol="GLD"
        code="GLD"
        title="Gold ETF (GLD)"
        color="#fbbf24"
        learn={TICKER_TIPS["GLD"]}
        metaLabel="NYSE ARCA · YAHOO"
      />

      <BigAssetChart
        symbol="SLV"
        code="SLV"
        title="Silver ETF (SLV)"
        color="#cbd5e1"
        learn={TICKER_TIPS["SLV"]}
        metaLabel="NYSE ARCA · YAHOO"
      />

      <BigCompareChart
        code="GLD/SLV"
        title="Gold / Silver ratio — risk-off signal"
        assets={[
          { symbol: "GLD", label: "GLD", color: "#fbbf24" },
          { symbol: "SLV", label: "SLV", color: "#cbd5e1" },
        ]}
        asRatio
        learn="GLD / SLV price ratio, normalized to 100 at the start of the window. Classic precious-metals signal: when the ratio rises, gold is outperforming silver — typically a risk-off / safe-haven signal because silver is more industrial. When the ratio falls, silver is leading — usually a risk-on / reflation tape. Historical mean is around 70–85."
        metaLabel="RATIO · NORMALIZED 100"
      />

      <Panel code="EDU" title="How to think about precious metals">
        <div className="space-y-3 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <div>
            <div className="text-[var(--amber)]">What gold actually does in a portfolio</div>
            <p className="mt-1">
              Gold isn&apos;t a productive asset — no cash flows, no dividends, no
              earnings. What it offers is two things:{" "}
              <span className="text-[var(--amber-dim)]">an inflation hedge</span> (preserves
              purchasing power when paper money loses value), and{" "}
              <span className="text-[var(--amber-dim)]">a crisis hedge</span> (rallies when
              trust in governments, banks, or fiat currencies breaks down). The right size
              in a portfolio is typically <span className="text-[var(--up)]">5–10%</span>,
              not 50%. It&apos;s ballast, not the engine.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">Silver — gold&apos;s high-beta cousin</div>
            <p className="mt-1">
              Silver is mostly mined as a byproduct of copper, lead, and zinc — so its
              supply is inelastic to silver-specific demand. Combined with the fact that
              ~50% of silver demand is industrial (electronics, solar panels, EVs), silver
              tends to <span className="text-[var(--amber)]">amplify gold&apos;s
              moves</span> in both directions. When gold rallies 10%, silver often rallies
              20–30%. When gold sells off, silver sells off harder.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">What moves the gold price</div>
            <ul className="mt-1 ml-3 list-disc space-y-1 pl-2 marker:text-[var(--amber-dim)]">
              <li>
                <span className="text-[var(--amber-dim)]">Real yields</span> — the single
                strongest correlation. Falling real yields (TIPS) = rising gold.{" "}
                <span className="text-[var(--dim)]">Why: when bonds pay less above
                inflation, the &quot;cost&quot; of holding gold (which pays nothing) goes
                down.</span>
              </li>
              <li>
                <span className="text-[var(--amber-dim)]">The US dollar (DXY)</span> —
                inverse correlation most of the time. Weak dollar = strong gold (gold is
                priced in USD globally).
              </li>
              <li>
                <span className="text-[var(--amber-dim)]">Central-bank buying</span> —
                emerging-market central banks (China, India, Russia, Turkey) have been
                heavy buyers since 2022 as a way to diversify reserves away from USD.
              </li>
              <li>
                <span className="text-[var(--amber-dim)]">Geopolitical stress</span> —
                wars, sanctions, banking crises tend to spike gold on a flight-to-safety
                bid.
              </li>
            </ul>
          </div>

          <div>
            <div className="text-[var(--amber)]">Why these ETFs, not physical or futures</div>
            <p className="mt-1">
              <span className="text-[var(--amber-dim)]">GLD and SLV</span> are physically
              backed (real bullion in vaults), trade like stocks, no storage hassle, no
              futures-curve roll cost. For a self-directed investor wanting metals
              exposure, they&apos;re the cleanest vehicle. Trade-off: small annual
              management fee (~0.4% for GLD, ~0.5% for SLV) vs. owning bars yourself.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">What the bear case looks like</div>
            <p className="mt-1">
              <span className="text-[var(--down)]">Rising real yields and a strong dollar
              are gold&apos;s worst environment.</span> A Fed determined to crush inflation
              by keeping rates high in real terms is bearish for gold even if nominal
              inflation is elevated. The 2013 taper-tantrum and 2022 Fed hikes both
              produced large gold drawdowns despite high inflation.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">Time-window controls</div>
            <p className="mt-1">
              Each chart above has a timeframe selector{" "}
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
                1D · 5D · 1M · 3M · 1Y · 5Y · ALL
              </span>
              . For metals, the multi-year view tends to be more useful than intraday — the
              fundamental drivers (real yields, dollar, central-bank flows) move on
              quarter-and-longer timescales.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
