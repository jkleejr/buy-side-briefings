"use client";

import { useState } from "react";
import LevelsChart from "./levels-chart";
import Link from "next/link";
import type { HomeData, BriefView, SectorRow, KeyPoint } from "@/lib/home-terminal";

// ---------------------------------------------------------------------------
// Journal homepage — the front page of a small daily, in the Design Notes
// theme (warm paper, serif editorial voice, monospace utility labels).
//   hero          : eyebrow (edition + time) with an AM/PM switch, the headline
//                   at display size, an italic lede, a link into the briefing
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
    <h2 className="mb-5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--dim)]">
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
    <span className="inline-flex overflow-hidden rounded-full border border-[var(--border-strong)] font-mono text-[11px] not-italic">
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
            {w === "morning" ? "☀ AM" : "☾ PM"}
          </button>
        );
      })}
    </span>
  );
}

function Hero({ brief }: { brief: BriefView }) {
  return (
    <div className="pt-10 sm:pt-14">
      <h1 className="text-[30px] font-semibold leading-[1.13] tracking-[-0.008em] [text-wrap:balance] sm:text-[38px] lg:text-[52px]">
        {brief.headline}
      </h1>
      {/* One paragraph running the full width — not two newspaper columns.
          Columns filled the space but read as two separate blurbs: the eye
          finished the left one and had to hunt back up for the rest of the
          same sentence. Long lines want a little more leading, hence 1.65. */}
      <p className="mt-5 text-[17px] italic leading-[1.6] text-[var(--ink-3)] sm:text-[19px] lg:leading-[1.65]">
        {brief.lede}
      </p>
      <Link
        href={brief.href}
        className="mt-6 inline-flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12.5px] font-semibold uppercase tracking-[0.1em] text-[var(--amber)]"
      >
        {/* The label is one unit: without nowrap the phone broke it after
            "MORNING'S" and stranded the read-time on its own line, which read
            as two separate links. */}
        <span className="whitespace-nowrap">
          Read {brief.window === "morning" ? "this morning's" : "tonight's"} briefing
        </span>
        <span className="whitespace-nowrap text-[var(--dim)]">
          · {brief.readMin} min →
        </span>
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
      <div className="sm:columns-2 sm:gap-12">
        {points.map((kp, i) => {
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
          const cls =
            "block break-inside-avoid border-b border-[var(--border)] py-4";
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
    </div>
  );
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
  "^KS11": "KOSPI",
  // Quoted in won, unlike every other price chart here — the label says so,
  // because a bare "570,000" reads as dollars next to Nvidia and Micron.
  "000660.KS": "SK Hynix (KRW)",
};

function Sectors({ sectors }: { sectors: SectorRow[] }) {
  if (!sectors.length) return null;
  const maxAbs = Math.max(1, ...sectors.map((s) => Math.abs(s.pct ?? 0)));
  return (
    <div>
      <SectionRule>Sectors · 1D</SectionRule>
      {/* Two newspaper columns so eleven rows don't tower over the band. */}
      <div className="sm:columns-2 sm:gap-12">
        {sectors.map((s) => {
          const pct = s.pct ?? 0;
          const up = pct >= 0;
          const w = Math.max(2, Math.min(80, (Math.abs(pct) / maxAbs) * 80));
          return (
            <div
              key={s.code}
              className="grid break-inside-avoid grid-cols-[1fr_88px_64px] items-center gap-2 border-b border-[var(--border)] py-2"
            >
              <span className="text-[14px] text-[var(--ink-2)]">{s.name}</span>
              <span>
                <span
                  className={`inline-block h-2 align-middle ${up ? "bg-[var(--up)]" : "bg-[var(--down)]"}`}
                  style={{ width: `${w}px` }}
                />
              </span>
              <span className="text-right font-mono text-[13.5px] tabular-nums">
                <Pct pct={s.pct} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- shell -----------------------------------------------------------------------

export default function HomeTerminal({ data }: { data: HomeData }) {
  const [view, setView] = useState<"morning" | "evening">(data.defaultView);
  const current = view === "morning" ? data.morning : data.evening;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-14 sm:px-6">
      {/* No top rule here. The ticker strip directly above already ends in its
          own border, so this one drew a second heavy black line a few pixels
          under it with nothing in between. */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--dim)]">
          {view === "morning" ? "Morning briefing" : "Night briefing"}
          {current ? ` · ${current.timeLabel}` : ""}
        </span>
        <span className="flex items-center gap-3 font-mono text-[11.5px] text-[var(--dim)]">
          <span className="hidden not-italic sm:inline">
            {current?.dateLabel ?? data.todayLabel}
          </span>
          <EditionSwitch data={data} view={view} setView={setView} />
        </span>
      </div>

      {current ? (
        <>
          {current.isSeed && (
            <div className="mt-4 border border-[var(--border-strong)] bg-[var(--panel)] px-3 py-1.5 font-mono text-[11.5px] italic text-[var(--warn)]">
              Seed data — generate a real briefing and commit.
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

          {/* Reference band — sectors run full width across the two columns. */}
          <div className="pt-12">
            <Sectors sectors={data.sectors} />
          </div>
        </>
      ) : (
        <div className="py-16 text-center text-[14px] italic text-[var(--dim)]">
          No {view} briefing on file yet.
        </div>
      )}

      {/* No rule above this line either — the only two rules left on the site
          are the header's (nav from tape) and the footer's. */}
      <div className="mt-14 flex flex-wrap justify-end gap-2 pt-3 font-mono text-[11.5px] text-[var(--dim)]">
        <span>
          {view === "morning"
            ? "Night edition follows at 8:00 PM ET"
            : "Morning edition follows at 7:00 AM ET"}
        </span>
      </div>
    </div>
  );
}
