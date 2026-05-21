import Link from "next/link";
import BigAssetChart from "@/components/big-asset-chart";
import TechStocksPanel from "@/components/tech-stocks-panel";
import Panel from "@/components/panel";
import { TICKER_TIPS } from "@/lib/glossary";

export const metadata = { title: "Major Tech Stocks — Buy-Side Briefings" };
export const revalidate = 60;

const TECH: Array<{ symbol: string; label: string; color: string }> = [
  { symbol: "AAPL", label: "Apple", color: "#a3a3a3" },
  { symbol: "MSFT", label: "Microsoft", color: "#22d3ee" },
  { symbol: "NVDA", label: "Nvidia", color: "#84cc16" },
  { symbol: "GOOGL", label: "Alphabet", color: "#fbbf24" },
  { symbol: "AMZN", label: "Amazon", color: "#fb923c" },
  { symbol: "META", label: "Meta", color: "#60a5fa" },
  { symbol: "TSLA", label: "Tesla", color: "#ef4444" },
  { symbol: "AVGO", label: "Broadcom", color: "#a78bfa" },
];

export default function TechPage() {
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
          Major Tech Stocks
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          Mag 7 + AVGO · ~35% of the S&P by weight · the eight names that move the index
        </p>
      </header>

      {/* Snapshot row — the same shared-timeframe panel that used to live on the dashboard. */}
      <TechStocksPanel />

      <Panel code="DEPTH" title="Each name, full chart">
        <p className="p-2 font-mono text-[11px] leading-snug text-[var(--dim)]">
          Snapshot tiles up top, full historical charts below. Pick any
          timeframe — earnings cycles, AI capex narratives, and antitrust
          overhangs play out over months, so the multi-year view is often more
          revealing than the daily print.
        </p>
      </Panel>

      {TECH.map((t) => (
        <BigAssetChart
          key={t.symbol}
          symbol={t.symbol}
          code={t.symbol}
          title={`${t.symbol} — ${t.label}`}
          color={t.color}
          learn={TICKER_TIPS[t.symbol]}
        />
      ))}

      <Panel code="EDU" title="How to think about the eight">
        <div className="space-y-3 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <div>
            <div className="text-[var(--amber)]">Why these eight matter so much</div>
            <p className="mt-1">
              The Magnificent 7 (AAPL, MSFT, NVDA, GOOGL, AMZN, META, TSLA) plus
              AVGO together make up roughly a third of the S&P 500 by market cap.
              When these eight move, the index moves; when they diverge from the
              other 492 names, you get the &quot;narrow rally&quot; that the
              breadth pages flag as fragile. Watching them as a group is the
              fastest way to see whether SPX strength is broad or carried.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">Quality vs growth within tech</div>
            <p className="mt-1">
              When risk gets pulled in, money usually rotates toward the
              quality-flight names — MSFT, AAPL, GOOGL — and away from the
              higher-beta AI / capex / sentiment plays — NVDA, AVGO, TSLA.
              If you see the first three holding up while the second three
              sell off hard, that&apos;s an intra-tech rotation rather than
              a tech-wide breakdown.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">The narrative drivers to know</div>
            <ul className="mt-1 ml-3 list-disc space-y-1 pl-2 marker:text-[var(--amber-dim)]">
              <li>
                <span className="text-[var(--amber-dim)]">NVDA / AVGO</span> — AI
                accelerator and networking demand from hyperscalers; sovereign AI.
              </li>
              <li>
                <span className="text-[var(--amber-dim)]">MSFT / GOOGL / AMZN</span>
                {" "}— cloud growth rates (Azure / GCP / AWS) and AI capex digestion.
              </li>
              <li>
                <span className="text-[var(--amber-dim)]">AAPL</span> — iPhone unit
                trajectory + the long-running services attach narrative.
              </li>
              <li>
                <span className="text-[var(--amber-dim)]">META</span> — ad-cycle
                bellwether; Reality Labs losses funded by the ad business.
              </li>
              <li>
                <span className="text-[var(--amber-dim)]">TSLA</span> — auto margins
                vs the FSD / robotaxi / Optimus optionality.
              </li>
            </ul>
          </div>
        </div>
      </Panel>
    </div>
  );
}
