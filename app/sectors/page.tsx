import Link from "next/link";
import SectorRotation from "@/components/sector-rotation";
import Panel from "@/components/panel";

export const metadata = { title: "Sectors — Buy-Side Briefings" };
export const revalidate = 300;

export default function SectorsPage() {
  // The 11-quote batch, the per-sector brand colours and the top/bottom sort
  // all existed only to pick which four charts to draw. With the charts gone
  // the page renders straight from SectorRotation, which fetches its own data
  // — so this route no longer makes 11 quote calls of its own.
  return (
    <div className="mx-auto max-w-5xl space-y-1">
      <header className="space-y-1 px-1 pb-2">
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] hover:underline"
        >
          ◂ DASHBOARD
        </Link>
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Sectors
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          11 S&P sector ETFs · today&apos;s leaders &amp; laggards · rotation context
        </p>
      </header>

      {/* Full sector rotation table (same as dashboard). */}
      <SectorRotation />

      <Panel code="LEAD/LAG" title="Reading today's leaders &amp; laggards">
        <p className="p-2 font-mono text-[11px] leading-snug text-[var(--dim)]">
          The divergence between the best and worst performers above is the
          rotation story — when defensives (XLU/XLP/XLV) lead, the market is
          taking risk off; when cyclicals (XLI/XLY/XLB) lead, it&apos;s leaning
          into growth.
        </p>
      </Panel>

      <Panel code="EDU" title="How to think about sector rotation">
        <div className="space-y-3 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <div>
            <div className="text-[var(--amber)]">What rotation tells you</div>
            <p className="mt-1">
              Sector rotation is the market voting on what part of the cycle
              we&apos;re in. The same SPX level can mask very different regimes
              underneath: a market where Tech + Discretionary lead is a
              risk-on growth tape; one where Staples + Utilities + Health lead
              is a risk-off defensive tape. <span className="text-[var(--amber)]">
              The headline index can hide the regime change — the sector chart
              shows it.</span>
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">The classic cycle map</div>
            <p className="mt-1">
              A simplified template (Sam Stovall&apos;s classic framing):
            </p>
            <ul className="mt-1 ml-3 list-disc space-y-1 pl-2 marker:text-[var(--amber-dim)]">
              <li>
                <span className="text-[var(--amber-dim)]">Early cycle</span> (post-recession): Financials (XLF), Industrials (XLI), Materials (XLB), Consumer Discretionary (XLY) lead. Fed cutting, credit easing, demand returning.
              </li>
              <li>
                <span className="text-[var(--amber-dim)]">Mid cycle</span>: Technology (XLK), Communications (XLC) lead. Growth accelerating, earnings expanding, multiples rising.
              </li>
              <li>
                <span className="text-[var(--amber-dim)]">Late cycle</span>: Energy (XLE), Materials (XLB) lead on commodity inflation. Fed starting to tighten.
              </li>
              <li>
                <span className="text-[var(--amber-dim)]">Recession</span>: Consumer Staples (XLP), Health Care (XLV), Utilities (XLU) lead. Defensive bid, earnings shrinking, multiples compressing.
              </li>
            </ul>
            <p className="mt-1 text-[var(--dim)]">
              Real life is messier than the template — but the template gives you
              a vocabulary for what you&apos;re seeing.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">Reading the ~50d trend column</div>
            <p className="mt-1">
              The <span className="text-[var(--amber)]">~50d</span> column on the
              table above is each sector&apos;s % change vs its 50-day moving
              average. Positive = the sector is above its near-term trend (in an
              uptrend). Negative = below trend (downtrend). A sector that&apos;s
              up today but still red on the 50d is bouncing within a downtrend —
              less convincing than a sector that&apos;s up today AND above its 50d.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">When sector rotation lies</div>
            <p className="mt-1">
              On options-expiry Fridays, FOMC days, or quarter-end rebalance
              dates, sector moves can be mechanical (delta hedging, basket
              rebalancing) rather than fundamental. Don&apos;t read regime change
              from a single Friday print. Look for sustained 5-10 day rotation
              before treating it as a signal.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
