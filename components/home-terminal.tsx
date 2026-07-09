"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  HomeData,
  BriefView,
  MarketRow,
  MetricCard,
  SectorRow,
  WireRow,
  CalRow,
  ArchiveRow,
} from "@/lib/home-terminal";

// ---------------------------------------------------------------------------
// Terminal homepage — a two-column Bloomberg-style brief reader.
//   left rail  : brand + date, morning/evening switch, brief archive, live
//                market pulse, session status
//   main column: the selected brief (metric strip, outlook, headline, clickable
//                key points → source articles) + today's context (sector
//                performance, wire headlines, calendar)
// All data is server-fetched and passed in; the only client state is which
// brief (morning / evening) is in view.
// ---------------------------------------------------------------------------

function Pct({ pct }: { pct: number | null }) {
  if (pct === null || !Number.isFinite(pct))
    return <span className="text-[var(--dim)]">—</span>;
  const up = pct >= 0;
  return (
    <span className={up ? "text-[var(--up)]" : "text-[var(--down)]"}>
      {up ? "▲" : "▼"}
      {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

function dirColor(dir: "up" | "down" | "flat"): string {
  if (dir === "up") return "text-[var(--up)]";
  if (dir === "down") return "text-[var(--down)]";
  return "text-[var(--foreground)]";
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[var(--dim)]">
      <span className="h-1 w-1 bg-[var(--amber-dim)]" />
      {children}
    </div>
  );
}

// --- left rail -------------------------------------------------------------

function BriefSwitch({
  brief,
  active,
  onClick,
}: {
  brief: BriefView | null;
  active: boolean;
  onClick: () => void;
}) {
  const isMorning = brief?.window === "morning";
  const title = isMorning ? "MORNING" : "EVENING";
  const icon = isMorning ? "☀" : "☾";
  const disabled = !brief;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "group relative flex w-full items-center gap-3 border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-[var(--amber)] bg-[rgba(255,165,0,0.06)]"
          : "border-[var(--border)] bg-[var(--panel)] hover:border-[var(--border-strong)]",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center text-[15px]",
          active
            ? "bg-[var(--amber)] text-black"
            : "bg-[var(--panel-head)] text-[var(--dim)]",
        ].join(" ")}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={[
            "block text-[13px] font-bold tracking-wider",
            active ? "text-[var(--amber)]" : "text-[var(--foreground)]",
          ].join(" ")}
        >
          {title}
        </span>
        <span className="block truncate text-[10px] text-[var(--dim)]">
          {brief ? brief.timeLabel : "—"}
        </span>
      </span>
      {active && (
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--amber)] term-blink" />
      )}
    </button>
  );
}

function ArchiveList({ archive }: { archive: ArchiveRow[] }) {
  if (!archive.length) return null;
  return (
    <div>
      <SectionLabel>Archive</SectionLabel>
      <div className="space-y-3">
        {archive.map((a, i) => (
          <Link key={i} href={a.href} className="group block">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--dim)]">
              <span className={a.window === "morning" ? "text-[var(--amber)]" : "text-[var(--cyan)]"}>
                {a.window === "morning" ? "☀" : "☾"}
              </span>
              {a.dayLabel}
            </div>
            <div className="mt-0.5 text-[12px] leading-snug text-[#a1a1aa] group-hover:text-[var(--foreground)]">
              {a.headline}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MarketPulse({ pulse }: { pulse: MarketRow[] }) {
  return (
    <div>
      <SectionLabel>Market Pulse</SectionLabel>
      <div className="grid grid-cols-2 gap-px bg-[var(--border)] [&>*:last-child:nth-child(odd)]:col-span-2">
        {pulse.map((m) => (
          <div key={m.code} className="bg-[var(--background)] p-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--amber)]">
              {m.code}
            </div>
            <div className="mt-1 tabular-nums text-[18px] font-bold leading-none text-[var(--foreground)]">
              {m.level}
            </div>
            <div className="mt-1.5 text-[11px] tabular-nums">
              <Pct pct={m.pct} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusList({ status }: { status: HomeData["status"] }) {
  return (
    <div>
      <SectionLabel>Status</SectionLabel>
      <div className="space-y-1.5">
        {status.map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--dim)]">{s.label}</span>
            <span
              className={[
                "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest",
                s.state === "open" ? "text-[var(--up)]" : "text-[var(--dim)]",
              ].join(" ")}
            >
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  s.state === "open" ? "bg-[var(--up)]" : "bg-[var(--dim)]",
                ].join(" ")}
              />
              {s.state}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sidebar({
  data,
  view,
  setView,
}: {
  data: HomeData;
  view: "morning" | "evening";
  setView: (v: "morning" | "evening") => void;
}) {
  return (
    <aside className="flex flex-col gap-5 border-[var(--border)] p-3 lg:sticky lg:top-10 lg:h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:border-r panel-scroll">
      <div>
        <div className="text-[15px] font-bold uppercase tracking-[0.28em] text-[var(--amber)]">
          Buy-Side
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[var(--dim)]">
          {data.todayLabel}
        </div>
      </div>

      <div className="space-y-2">
        <BriefSwitch
          brief={data.morning}
          active={view === "morning"}
          onClick={() => data.morning && setView("morning")}
        />
        <BriefSwitch
          brief={data.evening}
          active={view === "evening"}
          onClick={() => data.evening && setView("evening")}
        />
      </div>

      <ArchiveList archive={data.archive} />
      <MarketPulse pulse={data.pulse} />
      <StatusList status={data.status} />
    </aside>
  );
}

// --- main column sections --------------------------------------------------

function MetricStrip({ metrics }: { metrics: MetricCard[] }) {
  if (!metrics.length) return null;
  return (
    <div className="grid grid-cols-2 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.label} className="bg-[var(--background)] px-4 py-3">
          <div className="text-[10px] uppercase tracking-widest text-[var(--dim)]">
            {m.label}
          </div>
          <div className={`mt-1.5 tabular-nums text-[24px] font-bold leading-none ${dirColor(m.dir)}`}>
            {m.value}
          </div>
          <div className="mt-1.5 text-[11px] tabular-nums text-[var(--dim)]">{m.sub}</div>
        </div>
      ))}
    </div>
  );
}

function KeyPoints({ brief }: { brief: BriefView }) {
  if (!brief.keyPoints.length) return null;
  return (
    <div>
      <SectionLabel>Key Points</SectionLabel>
      <div className="space-y-1.5">
        {brief.keyPoints.map((kp, i) => {
          const inner = (
            <div className="grid grid-cols-[84px_1fr_16px] items-center gap-3 border border-[var(--border)] bg-[var(--panel)] px-3 py-3 transition-colors group-hover:border-[var(--border-strong)] group-hover:bg-[var(--panel-head)] sm:grid-cols-[120px_1fr_16px]">
              <div className="text-[10px] uppercase leading-tight tracking-widest text-[var(--amber)]">
                {kp.label}
              </div>
              <div className="truncate text-[13px] text-[#d4d4d8]">{kp.text}</div>
              <span className="text-right text-[13px] text-[var(--dim)] group-hover:text-[var(--amber)]">
                ›
              </span>
            </div>
          );
          return kp.url ? (
            <a
              key={i}
              href={kp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              {inner}
            </a>
          ) : (
            <div key={i} className="group block">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReadFullBriefing({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 border border-[var(--amber)]/50 bg-[rgba(255,165,0,0.06)] px-4 py-3.5 transition-colors hover:border-[var(--amber)] hover:bg-[rgba(255,165,0,0.12)]"
    >
      <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-[var(--amber)]">
        <span aria-hidden>▤</span> Read the full briefing
      </span>
      <span className="text-[16px] text-[var(--amber)] transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  );
}

function BriefReader({ brief, other }: { brief: BriefView; other: BriefView | null }) {
  const isMorning = brief.window === "morning";
  return (
    <div className="space-y-7">
      {brief.isSeed && (
        <div className="border border-[var(--amber-dim)] bg-[rgba(255,165,0,0.05)] px-2 py-1 text-[10px] uppercase tracking-widest text-[var(--amber)]">
          ⚠ Seed data — generate a real briefing and commit
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            className={[
              "border px-2 py-1 text-[10px] font-bold uppercase tracking-widest",
              isMorning
                ? "border-[var(--amber)] text-[var(--amber)]"
                : "border-[var(--cyan)] text-[var(--cyan)]",
            ].join(" ")}
          >
            {isMorning ? "☀ Morning Brief" : "☾ Evening Brief"}
          </span>
          <span className="text-[11px] text-[var(--dim)]">
            {brief.dateLabel} · {brief.timeLabel}
          </span>
        </div>
        <span className="text-[11px] text-[var(--dim)]">{brief.readMin} min read</span>
      </div>

      <MetricStrip metrics={brief.metrics} />

      <div className="max-w-3xl space-y-5">
        <h1 className="font-display text-[22px] font-extrabold leading-[1.15] tracking-tight text-white sm:text-[28px]">
          {brief.headline}
        </h1>
        <p className="text-[15px] leading-relaxed text-[#a1a1aa]">{brief.lede}</p>
      </div>

      <ReadFullBriefing href={brief.href} />

      <KeyPoints brief={brief} />

      {other && (
        <Link
          href={other.href}
          className="flex items-center justify-between gap-3 border border-[var(--border)] bg-[var(--panel)] px-4 py-3 transition-colors hover:border-[var(--border-strong)]"
        >
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-[var(--dim)]">
              {other.window === "morning" ? "Morning" : "Evening"} Brief · {other.dateLabel}
            </div>
            <div className="mt-0.5 truncate text-[15px] text-[#d4d4d8]">{other.headline}</div>
          </div>
          <span className="text-[18px] text-[var(--dim)]">›</span>
        </Link>
      )}
    </div>
  );
}

function SectorPerformance({ sectors }: { sectors: SectorRow[] }) {
  const maxAbs = Math.max(1, ...sectors.map((s) => Math.abs(s.pct ?? 0)));
  return (
    <div>
      <SectionLabel>S&amp;P 500 Sectors · 1D</SectionLabel>
      <div className="space-y-1.5">
        {sectors.map((s) => {
          const pct = s.pct ?? 0;
          const up = pct >= 0;
          const w = Math.min(100, (Math.abs(pct) / maxAbs) * 100);
          return (
            <div
              key={s.code}
              className="grid grid-cols-[42px_minmax(0,1fr)_56px] items-center gap-2 text-[12px] sm:grid-cols-[48px_120px_minmax(0,1fr)_56px]"
            >
              <span className="font-bold text-[var(--amber)]">{s.code}</span>
              <span className="hidden truncate text-[var(--dim)] sm:block">{s.name}</span>
              <span className="relative h-2.5 w-full bg-[#0c0c0c]">
                {up ? (
                  <span
                    className="absolute left-0 top-0 h-full bg-[var(--up)]"
                    style={{ width: `${w}%` }}
                  />
                ) : (
                  <span
                    className="absolute right-0 top-0 h-full bg-[var(--down)]"
                    style={{ width: `${w}%` }}
                  />
                )}
              </span>
              <span
                className={`text-right tabular-nums ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}
              >
                {s.pct === null ? "—" : `${up ? "+" : ""}${pct.toFixed(2)}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function toneDot(tone: WireRow["tone"]): string {
  if (tone === "pos") return "bg-[var(--up)]";
  if (tone === "neg") return "bg-[var(--down)]";
  return "bg-[var(--dim)]";
}

function WireHeadlines({ wire }: { wire: WireRow[] }) {
  if (!wire.length) return null;
  return (
    <div>
      <SectionLabel>Wire Headlines</SectionLabel>
      <div className="divide-y divide-[var(--border)]">
        {wire.map((w, i) => {
          const Row = (
            <div className="grid grid-cols-[52px_1fr] gap-3 py-2.5">
              <div className="text-[10px] uppercase tracking-widest text-[var(--amber)]">
                {w.tag}
              </div>
              <div className="flex items-start gap-2">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${toneDot(w.tone)}`} />
                <span className="text-[14px] leading-snug text-[#d4d4d8]">{w.headline}</span>
              </div>
            </div>
          );
          return w.url ? (
            <a
              key={i}
              href={w.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block transition-colors hover:bg-white/[0.02]"
            >
              {Row}
            </a>
          ) : (
            <div key={i}>{Row}</div>
          );
        })}
      </div>
    </div>
  );
}

function kindBadgeClass(kind: string): string {
  const k = kind.toUpperCase();
  if (["FOMC", "NFP", "CPI", "PCE", "GEO"].includes(k))
    return "border-[var(--down)]/60 text-[var(--down)]";
  if (["IPO", "EARN", "EARNINGS", "FED"].includes(k))
    return "border-[var(--amber)]/60 text-[var(--amber)]";
  return "border-[var(--border-strong)] text-[var(--dim)]";
}

function EconCalendar({ calendar }: { calendar: CalRow[] }) {
  if (!calendar.length) return null;
  return (
    <div>
      <SectionLabel>Economic Calendar · Week Ahead</SectionLabel>
      <div className="divide-y divide-[var(--border)]">
        {calendar.map((c, i) => (
          <div key={i} className="grid grid-cols-[52px_1fr_auto] items-center gap-3 py-3">
            <div className="text-[10px] uppercase tracking-widest text-[var(--amber)]">
              {c.day}
              <div className="text-[9px] tracking-normal text-[var(--dim)]">{c.dateLabel}</div>
            </div>
            <div className="min-w-0">
              <div className="text-[14px] text-[var(--foreground)]">{c.label}</div>
              {(c.note || c.timeET) && (
                <div className="mt-0.5 truncate text-[11px] text-[var(--dim)]">
                  {[c.timeET, c.note].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
            <span
              className={`border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${kindBadgeClass(c.kind)}`}
            >
              {c.kind}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- shell -----------------------------------------------------------------

export default function HomeTerminal({ data }: { data: HomeData }) {
  const [view, setView] = useState<"morning" | "evening">(data.defaultView);
  const current = view === "morning" ? data.morning : data.evening;
  const other = view === "morning" ? data.evening : data.morning;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[clamp(230px,19vw,290px)_minmax(0,1fr)]">
      <Sidebar data={data} view={view} setView={setView} />

      <section className="min-w-0 space-y-8 px-3 py-4 sm:px-6">
        {current ? (
          <BriefReader brief={current} other={other} />
        ) : (
          <div className="py-10 text-center text-[12px] text-[var(--dim)]">
            No {view} brief on file yet.
          </div>
        )}

        <div className="space-y-8 border-t border-[var(--border)] pt-7">
          <SectorPerformance sectors={data.sectors} />
          <WireHeadlines wire={data.wire} />
          <EconCalendar calendar={data.calendar} />
        </div>
      </section>
    </div>
  );
}
