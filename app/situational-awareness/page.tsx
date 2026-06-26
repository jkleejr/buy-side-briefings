import Link from "next/link";
import {
  getSituationalAwarenessPortfolio,
  getCopyBook,
  getPutBook,
  getThemeBreakdown,
  getUpcomingFilings,
  fmtUsd,
} from "@/lib/situational-awareness";
import { getThesis } from "@/lib/theses";
import Panel from "@/components/panel";
import ProseMarkdown from "@/components/prose-markdown";
import SituationalAwarenessPortfolio from "@/components/situational-awareness-portfolio";

export const metadata = {
  title: "Situational Awareness — Aschenbrenner's AI Fund | Buy-Side Briefings",
  description:
    "Tracking Leopold Aschenbrenner's Situational Awareness LP from its SEC filings: the AGI thesis, the picks-and-shovels long book to copy-trade, the semiconductor hedge book, and how to shadow it honestly.",
};

export const revalidate = 3600;

// One stat tile in the fund header strip.
function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5 border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
      <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
        {label}
      </span>
      <span
        className="font-mono text-[13px] font-semibold tracking-tight"
        style={{ color: tone ?? "var(--foreground)" }}
      >
        {value}
      </span>
    </div>
  );
}

export default function SituationalAwarenessPage() {
  const portfolio = getSituationalAwarenessPortfolio();
  const thesis = getThesis("situational-awareness");

  if (!portfolio) {
    return (
      <div className="border border-[var(--border)] bg-[var(--panel)] p-6 text-center font-mono text-[11px] text-[var(--dim)]">
        Portfolio data not found.
      </div>
    );
  }

  const copyBook = getCopyBook(portfolio);
  const putBook = getPutBook(portfolio);
  const themes = getThemeBreakdown(portfolio);
  const copyTotal = copyBook.reduce((s, h) => s + h.value, 0);

  // AUM trajectory, oldest → newest, for the growth strip.
  const trail = [...portfolio.filings].reverse();

  // Forward-looking calendar of the next quarterly 13F deadlines.
  const upcoming = getUpcomingFilings(4);

  return (
    <div className="mx-auto max-w-5xl space-y-1">
      {/* ---------------------------------------------------------------- */}
      <header className="space-y-1 px-1 pb-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)]">
          COPY-TRADE DESK
        </span>
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Situational Awareness LP
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          Leopold Aschenbrenner · the AGI picks-and-shovels fund
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--dim)]">
          Tracked from public SEC filings · 13F snapshot {portfolio.as_of} · latest
          disclosure {portfolio.latest_disclosure ?? portfolio.filed}
        </p>
      </header>

      {/* Fund stat strip ------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        <Stat label="13F Notional" value={fmtUsd(portfolio.total_value)} tone="var(--amber)" />
        <Stat label="Disclosed Positions" value={String(portfolio.long_count)} />
        <Stat label="Copy-Book Longs" value={`${copyBook.length} names`} tone="var(--up)" />
        <Stat label="Long Notional" value={fmtUsd(copyTotal)} tone="var(--up)" />
      </div>

      {/* Most current signal — post-13F 13D/13G disclosures --------------- */}
      {portfolio.recent_disclosures && portfolio.recent_disclosures.length > 0 && (
        <Panel
          code="NEWEST"
          title="Most current signal — disclosed since the Q1 13F"
        >
          <div className="divide-y divide-[var(--border)]">
            {portfolio.recent_disclosures.map((d) => (
              <div key={d.ticker ?? d.name} className="space-y-1.5 p-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="font-mono text-[13px] font-semibold text-[var(--up)]">
                    {d.ticker ? `${d.ticker} · ` : ""}
                    {d.name}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)]">
                    {d.form} · filed {d.filed}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                  <Stat label="Stake of company" value={`${d.pct_of_class}%`} tone="var(--amber)" />
                  <Stat label="Shares" value={d.shares.toLocaleString()} />
                  <Stat
                    label={`Value @ ${d.ref_price_date}`}
                    value={fmtUsd(d.est_value)}
                    tone="var(--up)"
                  />
                  <Stat label="Crossed 5% on" value={d.event_date} />
                </div>
                <p className="font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
                  {d.note}
                </p>
                <a
                  href={d.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block font-mono text-[10px] text-[var(--cyan-term)] hover:underline"
                >
                  SEC {d.form} →
                </a>
              </div>
            ))}
          </div>
          <p className="border-t border-[var(--border)] px-2 py-1 font-mono text-[9px] leading-relaxed text-[var(--dim)]">
            A 13D/13G is filed within days of crossing a 5% stake — far fresher than
            the 45-day-lagged 13F. Value is marked at the noted price; the filing
            itself reports shares and percent, not dollars.
          </p>
        </Panel>
      )}

      {/* TL;DR ----------------------------------------------------------- */}
      {thesis?.meta.summary && (
        <Panel code="TL;DR" title="The trade in one paragraph">
          <p className="p-2 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
            {thesis.meta.summary}
          </p>
        </Panel>
      )}

      {/* AUM trajectory -------------------------------------------------- */}
      <Panel code="GROWTH" title="13F book trajectory — $255M → $13.7B in five quarters">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[9px] uppercase tracking-widest text-[var(--dim)]">
                <th className="px-2 py-1 text-left">Quarter</th>
                <th className="px-2 py-1 text-left">As of</th>
                <th className="px-2 py-1 text-right">Positions</th>
                <th className="px-2 py-1 text-right">13F Notional</th>
              </tr>
            </thead>
            <tbody>
              {trail.map((f) => (
                <tr key={f.report} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-2 py-1 font-semibold text-[var(--amber)]">{f.report}</td>
                  <td className="px-2 py-1 text-[var(--dim)]">{f.as_of}</td>
                  <td className="px-2 py-1 text-right text-[var(--foreground)]">{f.positions}</td>
                  <td className="px-2 py-1 text-right text-[var(--foreground)]">
                    {fmtUsd(f.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-[var(--border)] px-2 py-1 font-mono text-[9px] leading-relaxed text-[var(--dim)]">
          Notional includes option lines reported at the underlying&apos;s value, so it
          overstates capital. Directionally, the book has compounded fast.
        </p>
      </Panel>

      {/* Next filings due ------------------------------------------------ */}
      <Panel code="CALENDAR" title="Next filings — when the book updates next">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[9px] uppercase tracking-widest text-[var(--dim)]">
                <th className="px-2 py-1 text-left">Filing</th>
                <th className="px-2 py-1 text-left">Covers quarter end</th>
                <th className="px-2 py-1 text-left">Expected by</th>
                <th className="px-2 py-1 text-right">Countdown</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((f, i) => (
                <tr key={f.report} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-2 py-1 font-semibold text-[var(--amber)]">
                    {f.type} · {f.report}
                  </td>
                  <td className="px-2 py-1 text-[var(--dim)]">{f.period_end}</td>
                  <td
                    className="px-2 py-1"
                    style={{ color: i === 0 ? "var(--cyan-term)" : "var(--foreground)" }}
                  >
                    {f.expected_by}
                    {i === 0 && (
                      <span className="ml-1 text-[9px] uppercase tracking-widest text-[var(--cyan-term)]">
                        ◂ next
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-right text-[var(--foreground)]">
                    {f.days_out} days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-[var(--border)] px-2 py-1 font-mono text-[9px] leading-relaxed text-[var(--dim)]">
          A 13F-HR is due within 45 days of each quarter-end; this fund files right at
          the deadline. Dates are the SEC deadline, not a confirmed file date. Interim
          13D/13G stakes (like the Nebius line above) are event-driven and can land any
          day — those show up in the NEWEST panel as they hit EDGAR.
        </p>
      </Panel>

      {/* The portfolio --------------------------------------------------- */}
      <SituationalAwarenessPortfolio
        portfolio={portfolio}
        copyBook={copyBook}
        putBook={putBook}
        themes={themes}
      />

      {/* Full thesis ----------------------------------------------------- */}
      {thesis && (
        <Panel code="THESIS" title="The Situational Awareness thesis — explained">
          <article className="px-3 py-2">
            <ProseMarkdown>{thesis.body}</ProseMarkdown>
          </article>
        </Panel>
      )}

      <p className="px-1 pt-2 font-mono text-[10px] leading-snug text-[var(--dim)]">
        Tracked from public{" "}
        <a
          href={portfolio.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--cyan-term)] hover:underline"
        >
          SEC 13F filings
        </a>
        , which lag ~45 days and omit shorts, swaps and private positions. This is a
        map of where the fund&apos;s disclosed capital sits — not a live mirror.
        Educational only — not investment advice. See the{" "}
        <Link href="/long-term-ideas" className="text-[var(--cyan-term)] hover:underline">
          long-term ideas
        </Link>{" "}
        for our own structural theses.
      </p>
    </div>
  );
}
