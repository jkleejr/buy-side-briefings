"use client";

import { useEffect, useRef, useState } from "react";
import LevelsChart from "./levels-chart";
import Link from "next/link";
import type {
  HomeData,
  BriefView,
  SectorRow,
  CalRow,
  KeyPoint,
} from "@/lib/home-terminal";

// ---------------------------------------------------------------------------
// Journal homepage — the front page of a small daily, in the Design Notes
// theme (warm paper, serif editorial voice, monospace utility labels).
//   hero          : eyebrow (edition + time) with an AM/PM switch, the headline
//                   at display size, an italic lede, a link into the briefing
//   tape          : the metric strip as a ruled row of figures
//   what matters  : the briefing's key points, each sourced — one place, no echo
//   week ahead    : the calendar, paired beside what-matters
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

function SectionRule({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 border-b border-[var(--foreground)] pb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--dim)]">
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
    <div className="max-w-[780px] pt-10 sm:pt-14">
      <h1 className="text-[30px] font-semibold leading-[1.13] tracking-[-0.008em] [text-wrap:balance] sm:text-[38px] lg:text-[46px]">
        {brief.headline}
      </h1>
      <p className="mt-5 max-w-[62ch] text-[17px] italic leading-[1.6] text-[var(--ink-3)] sm:text-[19px]">
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

// --- what matters today (merged: in-brief + the evidence) --------------------

function WhatMatters({ points }: { points: KeyPoint[] }) {
  if (!points.length) return null;
  return (
    <div>
      <SectionRule>What matters today</SectionRule>
      <div className="flex flex-col">
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
          const cls =
            "block border-t border-[var(--border)] py-4 first:border-t-0 first:pt-1";
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
  "SNDK",
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
  SNDK: "SanDisk",
};

// --- the week, on a clock (Idea 04) -------------------------------------------
// A horizontal timeline of the dated catalysts, with the binary event marked
// hot — the at-a-glance layer; the detailed card list keeps the notes below.

function timelineLabel(label: string): string {
  const cut = label.split(/\s+[—–]\s+|\s*\(/)[0].trim();
  return cut.length > 44 ? `${cut.slice(0, 44).trim()}…` : cut;
}

function WeekTimeline({ timeline }: { timeline: CalRow[] }) {
  // One node per date — two catalysts can share a day (the card list below
  // keeps both); prefer the hot one so the binary never gets shadowed.
  const byDate = new Map<string, CalRow>();
  for (const c of timeline) {
    const key = `${c.day}-${c.dateLabel}`;
    const existing = byDate.get(key);
    if (!existing || (c.hot && !existing.hot)) byDate.set(key, c);
  }
  const nodes = Array.from(byDate.values());
  const firstAhead = nodes.findIndex((n) => !n.past);

  // Which nodes open a new week. The calendar is sparse — Fri 17 can be
  // followed by Tue 21 — so this compares the Monday each date belongs to
  // rather than looking for a Monday node that may not exist.
  const weekStart = (iso: string) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  };
  const startsWeek = nodes.map(
    (n, i) => i > 0 && weekStart(n.date) !== weekStart(nodes[i - 1].date),
  );

  const scroller = useRef<HTMLDivElement>(null);
  const nodeW = useNodeWidth();

  // Where the present sits, in pixels. Columns are a fixed NODE_W, so this is
  // index math rather than a DOM measurement — offsetLeft isn't trustworthy on
  // first paint (webfonts can still be settling) and would park us at the far
  // edge of the archive. One node of the past stays visible as a hint that
  // there's more behind.
  const presentX = Math.max(0, (firstAhead - 1) * nodeW);

  // Open on the present, not at the start of the archive. Jumps without
  // animating so the page doesn't visibly slide on load.
  //
  // Re-asserted after paint and again once webfonts land: setting scrollLeft
  // once on mount gets clobbered as the strip's final width resolves, which
  // leaves it pinned to the far right (the Jan 2027 end) instead of on today.
  useEffect(() => {
    const el = scroller.current;
    if (!el || firstAhead <= 0) return;

    let raf = 0;
    const park = () => {
      raf = requestAnimationFrame(() => {
        el.scrollLeft = presentX;
      });
    };

    park();
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(park);
    window.addEventListener("load", park);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", park);
    };
  }, [firstAhead, presentX]);

  const page = (dir: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.max(nodeW * 2, el.clientWidth * 0.75),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  const toPresent = () => {
    const el = scroller.current;
    if (!el || firstAhead < 0) return;
    el.scrollTo({
      left: presentX,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  if (nodes.length < 2) return null;

  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2">
        <div className="ml-auto flex items-center gap-1">
          <TimelineButton label="Scroll to earlier catalysts" onClick={() => page(-1)}>
            ‹
          </TimelineButton>
          <button
            type="button"
            onClick={toPresent}
            className="border border-[var(--border-strong)] px-2 py-[3px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--dim)] hover:bg-[var(--panel)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)]"
          >
            Today
          </button>
          <TimelineButton label="Scroll to later catalysts" onClick={() => page(1)}>
            ›
          </TimelineButton>
        </div>
      </div>

      <div
        ref={scroller}
        className="overflow-x-auto overscroll-x-contain"
        tabIndex={0}
        role="group"
        aria-label="Catalyst timeline — scroll for past and upcoming events"
      >
        <div
          className="relative grid grid-flow-col pt-1"
          style={{ gridAutoColumns: `${nodeW}px` }}
        >
          <div className="absolute left-0 right-0 top-[46px] h-[2px] bg-[var(--border-strong)]" />
          {nodes.map((c, i) => (
            <div
              key={`${c.dateLabel}-${i}`}
              data-node
              className={`relative px-2 text-center ${c.past ? "opacity-45" : ""}`}
            >
              {/* Where the past meets the future — a hairline the eye can find. */}
              {i === firstAhead && i > 0 && (
                <span
                  aria-hidden
                  className="absolute -left-px top-0 bottom-0 border-l border-dashed border-[var(--amber-dim)]"
                />
              )}
              {/* Start of a new week. Same hairline, lighter, so the today
                  divider still reads as the primary one — and never doubled
                  up when a week happens to start on the same edge. */}
              {startsWeek[i] && i !== firstAhead && (
                <span
                  aria-hidden
                  className="absolute -left-px top-0 bottom-0 border-l border-dashed border-[var(--amber-dim)] opacity-45"
                />
              )}
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--faint)]">
                {c.day}
              </div>
              <div
                className={`font-mono text-[19px] font-semibold tabular-nums leading-[1.15] ${
                  c.hot ? "text-[var(--down)]" : "text-[var(--foreground)]"
                }`}
              >
                {c.dateLabel.replace(/^[A-Za-z]+ /, "")}
              </div>
              <div
                className={`relative z-[1] mx-auto my-2 h-[11px] w-[11px] rounded-full border-2 border-[var(--background)] ${
                  c.hot
                    ? "bg-[var(--down)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--down)_20%,transparent)]"
                    : "bg-[var(--border-strong)]"
                }`}
              />
              <div
                className={`mx-auto max-w-[150px] text-[12px] leading-[1.35] ${
                  c.hot ? "font-semibold text-[var(--foreground)]" : "text-[var(--dim)]"
                }`}
              >
                {timelineLabel(c.label)}
                {c.hot && (
                  <b className="mt-1 block font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-[var(--down)]">
                    {c.tMinus === 0 ? "today" : `T−${c.tMinus}`} · the binary
                  </b>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Timeline column width. 170px shows about six days on a laptop, but only two
 * on a 390px phone — a strip of mostly empty gutter that hides the week it
 * exists to show. 124px fits three days there and still leaves the label room
 * to breathe.
 *
 * The scroll maths below multiplies by this, so the value has to be the same
 * number the grid is laid out with. Hence a hook rather than a media query in
 * the class list: CSS alone would silently desync `presentX` and park the strip
 * on the wrong day.
 */
const NODE_W = 170;
const NODE_W_NARROW = 124;

function useNodeWidth(): number {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return narrow ? NODE_W_NARROW : NODE_W;
}

function TimelineButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="border border-[var(--border-strong)] px-2 py-[2px] font-mono text-[13px] leading-none text-[var(--dim)] hover:bg-[var(--panel)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)]"
    >
      {children}
    </button>
  );
}

// --- right column ----------------------------------------------------------------

function WeekAhead({ calendar }: { calendar: CalRow[] }) {
  if (!calendar.length) return null;
  const hot = new Set(["CPI", "FOMC", "BOJ", "NFP", "PCE", "GEO"]);
  return (
    <div>
      <SectionRule>Catalysts in detail</SectionRule>
      {calendar.map((c, i) => (
        <div
          key={i}
          className="grid grid-cols-[58px_1fr_auto] items-baseline gap-4 border-t border-[var(--border)] py-3 first:border-t-0"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--dim)]">
            {c.day}
            <b className="block font-mono text-[17px] font-semibold not-italic tabular-nums text-[var(--foreground)]">
              {c.dateLabel.replace(/^[A-Za-z]+ /, "")}
            </b>
          </span>
          <span className="text-[14.5px] text-[var(--ink-2)]">
            {c.label}
            {(c.timeET || c.note) && (
              <small className="line-clamp-2 text-[12.5px] italic text-[var(--faint)]">
                {[c.timeET, c.note].filter(Boolean).join(" — ")}
              </small>
            )}
          </span>
          <span
            className={`font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] ${
              hot.has(c.kind.toUpperCase()) ? "text-[var(--down)]" : "text-[var(--faint)]"
            }`}
          >
            {c.kind}
          </span>
        </div>
      ))}
    </div>
  );
}

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
    <div className="mx-auto max-w-[1100px] px-4 pb-14 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--foreground)] pt-4">
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

          {/* The catalyst run — full-width glance layer above the columns.
              Scrolls both ways, so it's no longer only "the week ahead". */}
          {data.timeline.length >= 2 && (
            <div className="pt-12">
              <SectionRule>Schedule</SectionRule>
              <WeekTimeline timeline={data.timeline} />
            </div>
          )}

          {/* One full-size chart with a switcher. Three side-by-side tiles put
              the zone labels below legibility, so this trades breadth for a
              chart you can actually read. */}
          <div className="pt-12">
            <SectionRule>Charts</SectionRule>
            <LevelsChart symbols={CHART_SYMBOLS} labels={CHART_LABELS} />
          </div>

          {/* What matters + catalyst detail — the two forward-looking modules. */}
          <div className="grid gap-12 pt-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
            <WhatMatters points={current.keyPoints} />
            <WeekAhead calendar={data.calendar} />
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

      <div className="mt-14 flex flex-wrap justify-between gap-2 border-t border-[var(--foreground)] pt-3 font-mono text-[11.5px] text-[var(--dim)]">
        <span>Every claim links to its source. Compiled twice daily.</span>
        <span>
          {view === "morning"
            ? "Night edition follows at 20:00 ET"
            : "Morning edition follows at 06:00 ET"}
        </span>
      </div>
    </div>
  );
}
