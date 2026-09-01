"use client";

import { useState } from "react";
import LevelsChart from "./levels-chart";
import Link from "next/link";
import type {
  HomeData,
  BriefView,
  KeyPoint,
} from "@/lib/home-terminal";

// ---------------------------------------------------------------------------
// Journal homepage — the front page of a small daily, in the Design Notes
// theme (warm paper, serif editorial voice, monospace utility labels).
//   hero          : eyebrow (edition + time) with an AM/PM switch, the headline
//                   at display size, an upright lede, a link into the briefing
//   tape          : the metric strip as a ruled row of figures
//   what matters  : the briefing's key points, each sourced — one place, no echo
//   charts        : the majors, with derived support/resistance
//   sectors       : reference band
// No verdict / buy-sell call is rendered here — the homepage informs; the
// desk's stance lives inside the briefing pages.
// ---------------------------------------------------------------------------

function Pct({ pct }: { pct: number | null }) {
  if (pct === null || !Number.isFinite(pct))
    return <span className="text-[var(--dim)]">—</span>;
  const up = pct >= 0;
  return (
    <span className={up ? "text-[var(--up)]" : "text-[var(--down)]"}>
      {up ? "+" : "−"}
      {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

// A section label. It used to draw a hard rule under itself; the labels are
// spaced far enough apart to separate the bands on their own, and the rules
// read as clutter once there were three of them down one page.
function SectionRule({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--foreground)]">
      {children}
    </h2>
  );
}

function hostLabel(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// --- hero --------------------------------------------------------------------

function EditionSwitch({
  data,
  view,
  setView,
}: {
  data: HomeData;
  view: "morning" | "evening";
  setView: (v: "morning" | "evening") => void;
}) {
  return (
    <span className="inline-flex shrink-0 border border-[var(--border-strong)] font-mono text-[11px] not-italic">
      {(["morning", "evening"] as const).map((w) => {
        const brief = w === "morning" ? data.morning : data.evening;
        const active = view === w;
        return (
          <button
            key={w}
            type="button"
            disabled={!brief}
            onClick={() => brief && setView(w)}
            className={[
              "px-3 py-1 tracking-[0.08em]",
              active
                ? "bg-[var(--foreground)] font-semibold text-[var(--background)]"
                : "text-[var(--dim)]",
              brief ? "cursor-pointer" : "cursor-not-allowed opacity-40",
            ].join(" ")}
          >
            {w === "morning" ? "AM" : "PM"}
          </button>
        );
      })}
    </span>
  );
}

function Hero({ brief }: { brief: BriefView }) {
  return (
    <div className="pt-7 sm:pt-10">
      <h1 className="text-[30px] font-semibold leading-[1.13] tracking-[-0.008em] [text-wrap:balance] sm:text-[38px] lg:text-[52px]">
        {brief.headline}
      </h1>
      {/* One paragraph running the full width — not two newspaper columns.
          Columns filled the space but read as two separate blurbs: the eye
          finished the left one and had to hunt back up for the rest of the
          same sentence. Long lines want a little more leading, hence 1.65.

          The phone gets the short cut of the same paragraph: the full lede ran
          eleven lines there and pushed the link into the briefing off the
          bottom of the hero. Only one of the two is ever laid out, so the
          hidden one stays out of the accessibility tree as well. */}
      <p className="mt-5 text-[17px] leading-[1.6] text-[var(--foreground)] sm:text-[19px] lg:leading-[1.65]">
        <span className="sm:hidden">{brief.ledeShort}</span>
        <span className="hidden sm:inline">{brief.lede}</span>
      </p>
      <Link
        href={brief.href}
        className="mt-6 inline-flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12.5px] font-semibold uppercase tracking-[0.1em] text-[var(--amber)]"
      >
        {/* The label is one unit: without nowrap the phone broke it after
            "MORNING'S" and stranded the read-time on its own line, which read
            as two separate links. */}
        <span className="whitespace-nowrap">
          Read {brief.window === "morning" ? "this morning's" : "tonight's"}{" "}
          report
        </span>
        <span className="whitespace-nowrap">· {brief.readMin} min →</span>
      </Link>
    </div>
  );
}

// --- news today (merged: in-brief + the evidence) ----------------------------

function WhatMatters({ points }: { points: KeyPoint[] }) {
  if (!points.length) return null;
  return (
    <div>
      <SectionRule>News today</SectionRule>
      {/* Split into two explicit columns rather than CSS `columns-2`. Under
          multi-column the browser flows the items itself, so the DOM's last
          child is only the foot of column two — `last:border-b-0` left column
          one still trailing a hairline into empty space. Splitting the array
          makes "last in this column" a real last-child in both. Reading order
          is unchanged: down column one, then down column two. */}
      <div className="sm:grid sm:grid-cols-2 sm:gap-x-12">
        {splitColumns(points).map((column, ci, cols) => (
          <div key={ci}>
            {column.map((kp, i) => {
              const host = hostLabel(kp.url);
              const body = (
                <>
                  <div className="text-[16.5px] leading-[1.5] text-[var(--ink-soft)]">
                    {kp.text}
                  </div>
                  {host && (
                    <div className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--amber)]">
                      {host}
                    </div>
                  )}
                </>
              );
              // Rules sit under each item, not above it. With `first:border-t-0` in
              // a two-column flow only the DOM-first item loses its rule, so column
              // two opened with a hairline directly under the section rule and read
              // as a doubled heading. Bottom rules — the same as the sector table —
              // have no such first-child special case.
              // The final item of each column drops its rule. Column one only
              // does so once the columns are side by side — stacked on mobile it
              // is mid-list, and a gap there reads as the list ending early.
              const dropRule =
                i === column.length - 1
                  ? ci === cols.length - 1
                    ? "border-b-0"
                    : "sm:border-b-0"
                  : "";
              const cls = `block border-b border-[var(--border)] py-4 ${dropRule}`;
              return kp.url ? (
                <a
                  key={i}
                  href={kp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${cls} -mx-3 rounded-sm px-3 hover:bg-[var(--panel)]`}
                >
                  {body}
                </a>
              ) : (
                <div key={i} className={cls}>
                  {body}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Halve a list for the two-column bands, first half then second, so the eye
 * still travels down column one before column two. An odd count leaves the
 * extra item in column one, which keeps the taller column on the left.
 *
 * Splitting in JS rather than leaning on CSS `columns-2` is what lets each
 * column have a real last-child, so the bottom row of each can drop its rule.
 */
function splitColumns<T>(items: T[]): T[][] {
  if (items.length < 2) return [items];
  const half = Math.ceil(items.length / 2);
  return [items.slice(0, half), items.slice(half)];
}

// The benchmarks the homepage carries: the broad market, the AI bellwether
// every briefing tracks, crypto, the fear gauge, and the metal.
//
// ^GSPC is the index itself, not SPY — charting the ETF meant the page showed
// "S&P 500 743.29" a few inches under a ticker strip reading 7,457.69. These
// are the same symbols the ticker and pulse rail already use, so every number
// on the homepage now comes from one place.
const CHART_SYMBOLS = [
  "^GSPC",
  "NVDA",
  "AAPL",
  "MU",
  "BTC-USD",
  "^VIX",
  "DX-Y.NYB",
  "JPY=X",
  "GC=F",
  "CL=F",
  "^KS11",
  "000660.KS",
];
const CHART_LABELS: Record<string, string> = {
  "^GSPC": "S&P 500",
  NVDA: "Nvidia",
  AAPL: "Apple",
  MU: "Micron",
  "BTC-USD": "Bitcoin",
  "^VIX": "VIX",
  // Same symbol the ticker strip and /macro use — one dollar number sitewide.
  "DX-Y.NYB": "Dollar",
  // Labelled as the pair, not "Yen", because the quote is dollars-per-yen: the
  // line going up is the yen getting *weaker*. "Yen ▲" would read backwards.
  "JPY=X": "USD/JPY",
  "GC=F": "Gold",
  // WTI front-month, which is the barrel the briefings quote ("WTI settled
  // $82.21"). Spelled out rather than "WTI" so the row stays readable to
  // someone who doesn't trade crude; the ticker is in the chart's source line.
  "CL=F": "Crude Oil",
  // Both Korean lines are quoted in won, unlike every other price chart here,
  // and both say so — a bare "570,000" or "3,240" reads as dollars sitting next
  // to Nvidia and Micron. The index carried no currency while the stock beside
  // it did, which made the omission look deliberate.
  "^KS11": "KOSPI (KRW)",
  "000660.KS": "SK Hynix (KRW)",
};

// --- shell -----------------------------------------------------------------------

export default function HomeTerminal({
  data,
  sectors,
}: {
  data: HomeData;
  /** Server-rendered <SectorRotation />, passed in from app/page.tsx. */
  sectors?: React.ReactNode;
}) {
  const [view, setView] = useState<"morning" | "evening">(data.defaultView);
  const current = view === "morning" ? data.morning : data.evening;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-14 sm:px-6">
      {/* No top rule here. The ticker strip directly above already ends in its
          own border, so this one drew a second heavy black line a few pixels
          under it with nothing in between. */}
      {/* Date on its own line above the edition label, both flush left and set
          identically. They used to share a row at opposite ends in 11px/0.12em
          and 11.5px/no-tracking — the same face, but different enough in size
          and letterspacing to read as two typefaces sitting a few inches apart.

          Its own line also lets the date show on a phone. It was hidden below
          the sm breakpoint only because three items could not share one row
          there; stacked, there is nothing to crowd. */}
      {/* The two lines sit in one column with the switch beside them, tops
          aligned — the switch used to line up with the second line instead.
          Padding is pt-4 (16px) plus the 23px the switch already sat below the
          date, so the switch keeps the position it had and the text drops to
          meet it rather than the switch rising.

          No wrapping. With flex-wrap the longer morning label pushed the switch
          onto a second line, where justify-between put it flush LEFT — so the
          control appeared to jump corners between AM and PM. The label
          truncates instead, and the switch is pinned right on every width. */}
      <div className="flex items-start justify-between gap-3 pt-[39px]">
        <div className="min-w-0">
          <div className="font-mono text-[11px] text-[var(--foreground)]">
            {current?.dateLabel ?? data.todayLabel}
          </div>
          <div className="mt-1.5 truncate font-mono text-[11px] text-[var(--foreground)]">
            {view === "morning" ? "Morning report" : "Night report"}
            {current ? `, ${current.timeLabel}` : ""}
          </div>
        </div>
        <EditionSwitch data={data} view={view} setView={setView} />
      </div>

      {current ? (
        <>
          {current.isSeed && (
            <div className="mt-4 border border-[var(--border-strong)] bg-[var(--panel)] px-3 py-1.5 font-mono text-[11.5px] italic text-[var(--warn)]">
              Seed data — generate a real report and commit.
            </div>
          )}

          <Hero brief={current} />

          {/* One full-size chart with a switcher. Three side-by-side tiles put
              the zone labels below legibility, so this trades breadth for a
              chart you can actually read. */}
          <div className="pt-12">
            <SectionRule>Charts</SectionRule>
            <LevelsChart symbols={CHART_SYMBOLS} labels={CHART_LABELS} />
          </div>

          {/* The day's articles, now the full width of the page. This was the
              left column of a two-up with the catalyst list beside it; with the
              catalysts gone to /schedule, a 1.5fr column would have left a
              third of the band empty. Two newspaper columns instead — the same
              treatment the sector table below already uses, and it keeps the
              measure readable where one full-width column would not. */}
          <div className="pt-12">
            <WhatMatters points={current.keyPoints} />
          </div>

          {/* Reference band — the sector-rotation panel, which replaced a
              homepage-only bar band that could only show the day's move. This
              one carries the ETF and the ~50d column too. It is now the only
              place the table renders; the /sectors page it came from is gone. */}
          {sectors && <div className="pt-12">{sectors}</div>}
        </>
      ) : (
        <div className="py-16 text-center text-[14px] italic text-[var(--dim)]">
          No {view} report on file yet.
        </div>
      )}

      {/* No rule above this line either — the only two rules left on the site
          are the header's (nav from tape) and the footer's. */}
      <div className="mt-14 flex flex-wrap justify-end gap-2 pt-3 font-mono text-[11.5px] text-[var(--foreground)]">
        <span>
          {view === "morning"
            ? "Night edition follows at 8 PM ET"
            : "Morning edition follows at 8 AM ET"}
        </span>
      </div>
    </div>
  );
}
