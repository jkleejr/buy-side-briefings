import Link from "next/link";
import BigAssetChart from "@/components/big-asset-chart";
import BigCompareChart from "@/components/big-compare-chart";
import Panel from "@/components/panel";
import { TICKER_TIPS } from "@/lib/glossary";

export const metadata = { title: "Crypto — Buy-Side Briefings" };
export const revalidate = 60;

export default function CryptoPage() {
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
          Crypto
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          Bitcoin · Ethereum · cycle context
        </p>
      </header>

      <BigAssetChart
        symbol="BTC-USD"
        code="BTC"
        title="Bitcoin (BTC)"
        color="#f7931a"
        learn={TICKER_TIPS["BTC-USD"]}
        metaLabel="USD · YAHOO"
      />

      <BigAssetChart
        symbol="ETH-USD"
        code="ETH"
        title="Ethereum (ETH)"
        color="#627eea"
        learn={TICKER_TIPS["ETH-USD"]}
        metaLabel="USD · YAHOO"
      />

      <BigCompareChart
        code="VS-SPY"
        title="BTC vs SPY — risk-sentiment lead/lag"
        assets={[
          { symbol: "BTC-USD", label: "BTC", color: "#f7931a" },
          { symbol: "SPY", label: "SPY", color: "#22d3ee" },
        ]}
        learn="Bitcoin and the S&P 500 ETF, both normalized to 100 at the start of the window. Useful for seeing when crypto leads or lags risk-on/risk-off. Sustained divergence is rare and meaningful — if BTC is rallying hard while SPY is flat (or vice versa), one of them is wrong about risk appetite."
        metaLabel="NORMALIZED 100"
      />

      <Panel code="EDU" title="How to think about crypto">
        <div className="space-y-3 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <div>
            <div className="text-[var(--amber)]">Why it&apos;s on this dashboard at all</div>
            <p className="mt-1">
              Crypto isn&apos;t recommended as a portfolio anchor here — it&apos;s on the
              dashboard because it functions as a{" "}
              <span className="text-[var(--amber-dim)]">live risk-sentiment gauge</span>.
              In the last few years BTC has been highly correlated with US tech stocks. When
              crypto crashes overnight, it usually tells you risk appetite is breaking down
              before the US opens. When it rips, the opposite.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">The two assets you actually need to watch</div>
            <ul className="mt-1 ml-3 list-disc space-y-1 pl-2 marker:text-[var(--amber-dim)]">
              <li>
                <span className="text-[var(--amber-dim)]">BTC</span> — store-of-value
                narrative, fixed 21M supply, 4-year halving cycle. Treat as the
                &quot;digital gold&quot; bet. Largest market cap by a wide margin.
              </li>
              <li>
                <span className="text-[var(--amber-dim)]">ETH</span> — smart-contract
                platform, native asset of the Ethereum network. Treat as the
                &quot;crypto tech platform&quot; bet. Risk profile is more app/tech-cycle
                than gold-cycle.
              </li>
            </ul>
            <p className="mt-1 text-[var(--dim)]">
              Everything else (SOL, BNB, XRP, etc.) is higher-beta on these two. If BTC
              breaks, so does almost everything else.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">The halving cycle (key context for BTC)</div>
            <p className="mt-1">
              Every ~4 years (every 210,000 blocks), the Bitcoin mining reward is cut in
              half. Historically, BTC has run up <span className="text-[var(--up)]">12–18
              months after each halving</span>, peaked, then drawdown 70–80% into the next
              one. The cycle clock is shown in the{" "}
              <Link href="/" className="text-[var(--cyan-term)] hover:underline">
                Cycle panel on the dashboard
              </Link>{" "}
              (T+days since last halving, T-days to next).
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">What the bear case looks like</div>
            <p className="mt-1">
              Crypto&apos;s base bear case isn&apos;t complicated:{" "}
              <span className="text-[var(--down)]">no cash flows = no valuation
              anchor.</span> Price is set by supply, demand, and narrative. In a
              risk-off macro regime (Fed tightening, dollar strong, recession fear), crypto
              tends to fall harder than equities because it has no fundamentals to defend
              the price. Sizing matters.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">Time-window controls</div>
            <p className="mt-1">
              Each chart above has a timeframe selector{" "}
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
                1D · 5D · 1M · 3M · 1Y · 5Y · ALL
              </span>
              . The ALL view is useful for crypto specifically because the 4-year halving
              cycles only become visible at multi-year scale.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
