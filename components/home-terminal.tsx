"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  HomeData,
  BriefView,
  MetricCard,
  SectorRow,
  WireRow,
  CalRow,
  ArchiveRow,
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
//   on the wire   : recent headlines OTHER than today's points (deduped upstream)
//   sectors / past: reference band
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
        className="mt-6 inline-flex items-center gap-2 font-mono text-[12.5px] font-semibold uppercase tracking-[0.1em] text-[var(--amber)]"
      >
        Read {brief.window === "morning" ? "this morning's" : "tonight's"} briefing
        <span className="text-[var(--dim)]">· {brief.readMin} min →</span>
      </Link>
    </div>
  );
}

// --- tape ----------------------------------------------------------------------

function Tape({ metrics }: { metrics: MetricCard[] }) {
  if (!metrics.length) return null;
  return (
    <div
      className="mt-10 flex flex-wrap border-b border-[var(--border)]"
      style={{ borderTop: "1px solid var(--foreground)" }}
    >
      {metrics.map((m) => (
        <div
          key={m.label}
          className="min-w-[140px] flex-1 border-r border-[var(--border)] p-4 last:border-r-0"
        >
          <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--dim)]">
            {m.label}
          </div>
          <div className="mt-1.5 font-mono text-[22px] font-semibold tabular-nums">
            {m.value}
            <span
              className={[
                "ml-2 text-[12.5px] font-normal",
                m.dir === "up"
                  ? "text-[var(--up)]"
                  : m.dir === "down"
                    ? "text-[var(--down)]"
                    : "text-[var(--dim)]",
              ].join(" ")}
            >
              {m.sub}
            </span>
          </div>
        </div>
      ))}
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

// --- on the wire (recent headlines other than today's points) ----------------

function Wire({ wire }: { wire: WireRow[] }) {
  if (!wire.length) return null;
  return (
    <div>
      <SectionRule>On the wire</SectionRule>
      {wire.map((w, i) => {
        const row = (
          <div className="grid grid-cols-[54px_1fr] gap-3 border-t border-[var(--border)] py-3 first:border-t-0">
            <span className="pt-0.5 font-mono text-[10px] font-semibold tracking-[0.06em] text-[var(--amber)]">
              {w.tag}
            </span>
            <span className="text-[14.5px] leading-snug text-[var(--ink-soft)]">
              {w.headline}
            </span>
          </div>
        );
        return w.url ? (
          <a
            key={i}
            href={w.url}
            target="_blank"
            rel="noopener noreferrer"
            className="-mx-3 block rounded-sm px-3 hover:bg-[var(--panel)]"
          >
            {row}
          </a>
        ) : (
          <div key={i}>{row}</div>
        );
      })}
    </div>
  );
}

// --- right column ----------------------------------------------------------------

function WeekAhead({ calendar }: { calendar: CalRow[] }) {
  if (!calendar.length) return null;
  const hot = new Set(["CPI", "FOMC", "NFP", "PCE", "GEO"]);
  return (
    <div>
      <SectionRule>The week ahead</SectionRule>
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

function PreviousEditions({ archive }: { archive: ArchiveRow[] }) {
  if (!archive.length) return null;
  return (
    <div>
      <SectionRule>Previous editions</SectionRule>
      {archive.map((a, i) => (
        <Link
          key={i}
          href={a.href}
          className="-mx-3 block rounded-sm border-t border-[var(--border)] px-3 py-3 first:border-t-0 hover:bg-[var(--panel)]"
        >
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--dim)]">
            {a.window === "morning" ? "☀" : "☾"} {a.dayLabel}
          </span>
          <span className="mt-1 block text-[14.5px] leading-snug text-[var(--ink-2)]">
            {a.headline}
          </span>
        </Link>
      ))}
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
          {view === "morning" ? "Morning briefing" : "Evening briefing"}
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
          <Tape metrics={current.metrics} />

          {/* What matters + the week ahead — the two forward-looking modules. */}
          <div className="grid gap-12 pt-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
            <WhatMatters points={current.keyPoints} />
            <WeekAhead calendar={data.calendar} />
          </div>

          {/* The wire (recent headlines, distinct from today's points) + past. */}
          <div className="grid gap-12 pt-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
            <Wire wire={data.wire} />
            <PreviousEditions archive={data.archive} />
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
            ? "Evening edition follows at 20:00 ET"
            : "Morning edition follows at 06:00 ET"}
        </span>
      </div>
    </div>
  );
}
