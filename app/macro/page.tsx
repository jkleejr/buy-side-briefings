import Link from "next/link";
import BigAssetChart from "@/components/big-asset-chart";
import FedPanel from "@/components/fed-panel";
import Panel from "@/components/panel";
import { TICKER_TIPS } from "@/lib/glossary";

export const metadata = { title: "Macro — Buy-Side Briefings" };
export const revalidate = 60;

export default function MacroPage() {
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
          Fed &amp; Macro
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          The rates story · long bonds · dollar · inflation · jobs
        </p>
      </header>

      {/* The dashboard MACRO panel rendered full-width for the snapshot view. */}
      <FedPanel />

      <BigAssetChart
        symbol="^TNX"
        code="10Y"
        title="10-Year Treasury Yield"
        color="#22d3ee"
        learn={TICKER_TIPS["^TNX"]}
        metaLabel="YIELD · %"
      />

      <BigAssetChart
        symbol="^TYX"
        code="30Y"
        title="30-Year Treasury Yield"
        color="#a78bfa"
        learn={TICKER_TIPS["^TYX"]}
        metaLabel="YIELD · %"
      />

      <BigAssetChart
        symbol="TLT"
        code="TLT"
        title="20+ Year Treasury Bond ETF"
        color="#fbbf24"
        learn={TICKER_TIPS["TLT"]}
        metaLabel="PRICE · INVERSE TO LONG YIELDS"
      />

      <BigAssetChart
        symbol="DX-Y.NYB"
        code="DXY"
        title="US Dollar Index"
        color="#cbd5e1"
        learn={TICKER_TIPS["DXY"]}
        metaLabel="USD vs 6-CURRENCY BASKET"
      />

      <Panel code="EDU" title="How to read this page">
        <div className="space-y-3 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <div>
            <div className="text-[var(--amber)]">The macro story in five numbers</div>
            <p className="mt-1">
              Everything on this page is part of one story: how expensive is money,
              which way is it heading, and what does that mean for risk assets.
              The Fed sets short-term rates (Fed Funds, top panel). The bond market
              sets longer rates (10Y and 30Y yields). The dollar is the price of
              all of it expressed against the rest of the world. Inflation prints
              (CPI/PCE) are the data the Fed responds to. Jobs prints (Unemployment,
              NFP) are the other half of the Fed&apos;s dual mandate.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">Why yields matter more than the Fed itself</div>
            <p className="mt-1">
              The Fed only directly controls overnight rates. The 10Y and 30Y trade
              freely — they reflect what bond investors think the Fed will be doing
              in 2, 5, 10 years. When the 10Y rises faster than the Fed is hiking,
              the bond market is saying &quot;you&apos;re behind the curve.&quot; When
              it falls faster than the Fed is cutting, the market is sniffing
              recession. These yields are the *real* gravity behind every stock,
              every house, every car loan.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">TLT is the simplest way to chart bonds</div>
            <p className="mt-1">
              Bond prices move inversely to yields. TLT (long-duration bond ETF) is
              the cleanest visual: <span className="text-[var(--up)]">TLT up = long
              yields down</span> (bonds rallying — usually flight-to-safety or
              recession bid). <span className="text-[var(--down)]">TLT down = long
              yields up</span> (bond selloff — inflation/term-premium concerns).
              For most readers, watching TLT&apos;s chart is easier than watching
              yields directly.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">What the dollar tells you</div>
            <p className="mt-1">
              Strong dollar = headwind for: emerging markets (their dollar debt
              gets expensive), gold (priced in USD), US multinationals (overseas
              earnings translate to fewer dollars), and crypto (correlated with
              broader risk-on). Weak dollar = the opposite. The DXY is the simplest
              read — a basket against EUR/JPY/GBP/CAD/SEK/CHF. Big moves matter
              more than levels.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">The 2s10s spread (in the panel above)</div>
            <p className="mt-1">
              2-year yield minus 10-year yield. When negative (&quot;inverted&quot;),
              the bond market is pricing slower growth ahead — historically preceded
              recessions by 6–18 months. When positive and steep, normal expansion.
              When flat (0–25bps), late-cycle caution. The most-watched single
              indicator on the page above for recession-risk signaling.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">How to use the charts on this page</div>
            <p className="mt-1">
              Each chart has the full timeframe selector{" "}
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
                1D · 5D · 1M · 3M · 1Y · 5Y · ALL
              </span>{" "}
              — for macro, the multi-year view is usually most useful because rate
              cycles move on quarter-and-longer timescales. Hover any chart for
              the exact value on a given date.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
