import Link from "next/link";
import FedPanel from "@/components/fed-panel";
import LevelsChart from "@/components/levels-chart";
import Panel from "@/components/panel";

// The rates instruments, in the order the story runs: short end of the curve
// the Fed steers, the long end the market sets, the bond price that inverts
// them, and the dollar that prices all of it against everyone else.
const MACRO_SYMBOLS = ["^TNX", "^TYX", "TLT", "DX-Y.NYB"];
const MACRO_LABELS: Record<string, string> = {
  "^TNX": "10Y Yield",
  "^TYX": "30Y Yield",
  TLT: "TLT",
  "DX-Y.NYB": "Dollar",
};

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

      {/* Same chart as the homepage: candles, derived levels, drawing tools.
          All four carry real OHLC from Yahoo. Only TLT reports traded volume —
          yields and the dollar index are calculated, so every bar reads zero
          and the chart disables its own Vol button for them. */}
      <Panel code="RATES" title="Rates, bonds & the dollar">
        <div className="p-2">
          <LevelsChart symbols={MACRO_SYMBOLS} labels={MACRO_LABELS} />
        </div>
      </Panel>

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
              Pick an instrument, then a timeframe{" "}
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
                1D · 5D · 1M · 3M · 1Y · 5Y · ALL
              </span>{" "}
              — for macro the multi-year view is usually most useful, because rate
              cycles move on quarter-and-longer timescales. Hover any bar for its
              date, open, high, low and close.{" "}
              <span className="text-[var(--amber)]">S/R</span> derives the levels
              the price kept turning at, and{" "}
              <span className="text-[var(--amber)]">Vol</span> overlays traded
              volume — available on TLT only, since yields and the dollar index
              are calculated rather than traded and report no volume.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
