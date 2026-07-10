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
// Journal homepage — the front page of a small daily.
//   hero     : eyebrow (edition + time) with an AM/PM switch, the headline at
//              display size, an italic lede, a link into the full briefing
//   in brief : the first three key points as a ruled digest
//   tape     : the metric strip as a ruled row of figures
//   columns  : evidence (remaining sourced points) + wire on the left;
//              week ahead, sectors, and previous editions on the right
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
    <h2 className="mb-1 border-b border-[var(--foreground)] pb-2 text-[12px] font-bold uppercase tracking-[0.26em]">
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
    <span className="inline-flex overflow-hidden rounded-full border border-[var(--border)] text-[11px] not-italic">
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
      <p className="mt-5 max-w-[62ch] text-[17px] italic leading-[1.6] text-[#4c4a43] sm:text-[19px]">
        {brief.lede}
      </p>
      <Link
        href={brief.href}
        className="mt-5 inline-block text-[14px] font-bold text-[var(--amber)]"
      >
        Read {brief.window === "morning" ? "this morning's" : "tonight's"} briefing —{" "}
        {brief.readMin} min →
      </Link>
    </div>
  );
}

// --- in brief ------------------------------------------------------------------

function InBrief({ points }: { points: KeyPoint[] }) {
  if (!points.length) return null;
  return (
    <div className="mt-10 border-t border-[var(--foreground)] pt-1">
      {points.map((kp, i) => (
        <div
          key={i}
          className="grid grid-cols-[92px_1fr] gap-4 border-b border-[var(--border)] py-3 sm:grid-cols-[136px_1fr] sm:gap-6"
        >
          <span className="pt-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--dim)]">
            {kp.label}
          </span>
          <span className="text-[15px] leading-[1.55] text-[#2b2924] sm:text-[17px]">
            {kp.url ? (
              <a href={kp.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--amber)]">
                {kp.text}
              </a>
            ) : (
              kp.text
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

// --- tape ----------------------------------------------------------------------

function Tape({ metrics }: { metrics: MetricCard[] }) {
  if (!metrics.length) return null;
  return (
    <div
      className="mt-2 flex flex-wrap border-b border-[var(--border)]"
      style={{ borderTop: "1px solid var(--foreground)" }}
    >
      {metrics.map((m) => (
        <div
          key={m.label}
          className="min-w-[140px] flex-1 border-r border-[var(--border)] p-4 last:border-r-0"
        >
          <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--dim)]">
            {m.label}
          </div>
          <div className="mt-1 text-[22px] font-bold">
            {m.value}
            <span
              className={[
                "ml-2 text-[13px] font-normal",
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

// --- left column ---------------------------------------------------------------

function Evidence({ points }: { points: KeyPoint[] }) {
  if (!points.length) return null;
  return (
    <div>
      <SectionRule>The evidence</SectionRule>
      {points.map((kp, i) => {
        const host = hostLabel(kp.url);
        const body = (
          <>
            <div className="text-[15.5px] leading-[1.6] text-[#2b2924]">{kp.text}</div>
            {host && (
              <div className="mt-1 text-[12.5px] italic text-[#9d9a90]">{host}</div>
            )}
          </>
        );
        return kp.url ? (
          <a
            key={i}
            href={kp.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block border-b border-[var(--border)] py-4 hover:bg-[var(--panel)]"
          >
            {body}
          </a>
        ) : (
          <div key={i} className="border-b border-[var(--border)] py-4">
            {body}
          </div>
        );
      })}
    </div>
  );
}

function Wire({ wire }: { wire: WireRow[] }) {
  if (!wire.length) return null;
  return (
    <div>
      <SectionRule>On the wire</SectionRule>
      {wire.map((w, i) => {
        const row = (
          <div className="grid grid-cols-[52px_1fr] gap-3 border-b border-[var(--border)] py-2.5">
            <span className="pt-0.5 text-[11px] font-bold tracking-[0.12em] text-[var(--amber)]">
              {w.tag}
            </span>
            <span className="text-[14px] leading-snug text-[#2b2924]">{w.headline}</span>
          </div>
        );
        return w.url ? (
          <a key={i} href={w.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-[var(--panel)]">
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
          className="grid grid-cols-[58px_1fr_auto] items-baseline gap-4 border-b border-[var(--border)] py-3"
        >
          <span className="text-[12px] uppercase tracking-[0.1em] text-[var(--dim)]">
            {c.day}
            <b className="block text-[16px] font-bold not-italic text-[var(--foreground)]">
              {c.dateLabel.replace(/^[A-Za-z]+ /, "")}
            </b>
          </span>
          <span className="text-[14.5px] text-[#3c3a34]">
            {c.label}
            {(c.timeET || c.note) && (
              <small className="line-clamp-2 text-[12.5px] italic text-[#9d9a90]">
                {[c.timeET, c.note].filter(Boolean).join(" — ")}
              </small>
            )}
          </span>
          <span
            className={`text-[10.5px] font-bold uppercase tracking-[0.18em] ${
              hot.has(c.kind.toUpperCase()) ? "text-[var(--down)]" : "text-[#9d9a90]"
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
              <span className="text-[14px] text-[#3c3a34]">{s.name}</span>
              <span>
                <span
                  className={`inline-block h-2 align-middle ${up ? "bg-[var(--up)]" : "bg-[var(--down)]"}`}
                  style={{ width: `${w}px` }}
                />
              </span>
              <span className="text-right text-[14px]">
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
          className="block border-b border-[var(--border)] py-3 hover:bg-[var(--panel)]"
        >
          <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--dim)]">
            {a.window === "morning" ? "☀" : "☾"} {a.dayLabel}
          </span>
          <span className="mt-0.5 block text-[14.5px] leading-snug text-[#3c3a34]">
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
        <span className="text-[11.5px] uppercase tracking-[0.26em] text-[var(--dim)]">
          {view === "morning" ? "Morning briefing" : "Evening briefing"}
          {current ? ` · ${current.timeLabel}` : ""}
        </span>
        <span className="flex items-center gap-3 text-[12px] italic text-[var(--dim)]">
          <span className="hidden sm:inline">{current?.dateLabel ?? data.todayLabel}</span>
          <EditionSwitch data={data} view={view} setView={setView} />
        </span>
      </div>

      {current ? (
        <>
          {current.isSeed && (
            <div className="mt-4 border border-[var(--border-strong)] bg-[var(--panel)] px-3 py-1.5 text-[12px] italic text-[var(--dim)]">
              Seed data — generate a real briefing and commit.
            </div>
          )}

          <Hero brief={current} />
          <InBrief points={current.keyPoints.slice(0, 3)} />
          <Tape metrics={current.metrics} />

          {/* Read row — evidence + wire pair off against the week ahead, which
              is the only long module on the right so the columns end together. */}
          <div className="grid gap-12 pt-10 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
            <div className="space-y-11">
              <Evidence points={current.keyPoints.slice(3)} />
              <Wire wire={data.wire} />
            </div>
            <WeekAhead calendar={data.calendar} />
          </div>

          {/* Reference band — full width so no column is left holding air. */}
          <div className="grid gap-12 pt-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
            <Sectors sectors={data.sectors} />
            <PreviousEditions archive={data.archive} />
          </div>
        </>
      ) : (
        <div className="py-16 text-center text-[14px] italic text-[var(--dim)]">
          No {view} briefing on file yet.
        </div>
      )}

      <div className="mt-14 flex flex-wrap justify-between gap-2 border-t border-[var(--foreground)] pt-3 text-[12.5px] italic text-[var(--dim)]">
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
