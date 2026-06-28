"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  HomeData,
  BriefView,
  MarketRow,
  SectorRow,
  WireRow,
  CalRow,
  TickerCard,
} from "@/lib/home-terminal";

// ---------------------------------------------------------------------------
// Terminal homepage — a two-column Bloomberg-style brief reader.
//   left rail  : brand, morning/evening switch, live markets, session status,
//                next scheduled brief
//   main column: the selected brief (sentiment, headline, key points, key
//                signal, tickers to watch) + today's context (sector
//                performance, wire headlines, week-ahead calendar)
// All data is server-fetched and passed in; the only client state is which
// brief (morning / evening) is in view.
// ---------------------------------------------------------------------------

function Pct({ pct, big = false }: { pct: number | null; big?: boolean }) {
  if (pct === null || !Number.isFinite(pct))
    return <span className="text-[var(--dim)]">—</span>;
  const up = pct >= 0;
  return (
    <span className={up ? "text-[var(--up)]" : "text-[var(--down)]"}>
      {up ? "▲" : "▼"}
      {Math.abs(pct).toFixed(2)}%{big ? "" : ""}
    </span>
  );
}

function sentColor(code: string): string {
  if (code === "buy") return "text-[var(--up)]";
  if (code === "bearish") return "text-[var(--down)]";
  return "text-[var(--amber)]";
}

function shortDate(dateLabel: string): string {
  // "Saturday, June 27, 2026" -> "Sat · Jun 27"
  const parts = dateLabel.split(", ");
  if (parts.length < 2) return dateLabel;
  const wd = parts[0].slice(0, 3);
  const md = parts[1].replace(
    /^(\w{3})\w*/,
    (_m, a) => a, // June -> Jun
  );
  return `${wd} · ${md}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[var(--dim)]">
      <span className="h-1 w-1 bg-[var(--amber-dim)]" />
      {children}
    </div>
  );
}

// --- live ET clock ---------------------------------------------------------

function LiveClock() {
  const [t, setT] = useState<string>("");
  useEffect(() => {
    const tick = () => {
      const now = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        timeZone: "America/New_York",
      });
      setT(now);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="tabular-nums text-[var(--dim)]">
      {t || "--:--:--"} <span className="text-[var(--amber-dim)]">ET</span>
    </span>
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
          {brief ? `${brief.timeLabel} · ${shortDate(brief.dateLabel)}` : "—"}
        </span>
      </span>
      {active && (
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--amber)] term-blink" />
      )}
    </button>
  );
}

function MarketsList({ markets }: { markets: MarketRow[] }) {
  return (
    <div>
      <SectionLabel>Markets</SectionLabel>
      <div>
        {markets.map((m) => (
          <div
            key={m.code}
            className="flex items-baseline justify-between border-b border-[var(--border)]/60 py-1.5"
          >
            <div className="min-w-0">
              <div className="text-[12px] font-bold text-[var(--amber)]">{m.code}</div>
              <div className="truncate text-[9px] uppercase tracking-wide text-[var(--dim)]">
                {m.name}
              </div>
            </div>
            <div className="text-right">
              <div className="tabular-nums text-[12px] text-[var(--foreground)]">
                {m.level}
              </div>
              <div className="text-[11px] tabular-nums">
                <Pct pct={m.pct} />
              </div>
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
    <aside className="flex flex-col gap-5 border-[var(--border)] p-3 lg:sticky lg:top-2 lg:h-[calc(100vh-1.5rem)] lg:self-start lg:overflow-y-auto lg:border-r panel-scroll">
      <div>
        <div className="text-[15px] font-bold uppercase tracking-[0.28em] text-[var(--amber)]">
          Buy-Side
        </div>
        <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-widest">
          <span className="flex items-center gap-1 text-[var(--up)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--up)] term-blink" />
            Live
          </span>
          <LiveClock />
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

      <MarketsList markets={data.markets} />
      <StatusList status={data.status} />

      <div className="mt-auto border border-[var(--amber-dim)]/60 bg-[rgba(255,165,0,0.04)] p-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--amber)]">
          <span>☀</span> Next Brief
        </div>
        <div className="mt-1 text-[13px] font-bold text-[var(--foreground)]">
          {data.nextBrief.when}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-[var(--dim)]">
          {data.nextBrief.note}
        </div>
      </div>
    </aside>
  );
}

// --- main column sections --------------------------------------------------

function SentimentBar({ brief }: { brief: BriefView }) {
  const { pct, label } = brief.sentiment;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--dim)]">
          Market Sentiment
        </span>
        <span
          className={`text-[12px] font-bold uppercase tracking-widest ${sentColor(brief.code)}`}
        >
          {label}
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-sm bg-[#111]">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--down)] via-[var(--amber)] to-[var(--up)]" />
        <div
          className="absolute inset-y-0 right-0 bg-black/75"
          style={{ left: `${pct}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-white/90"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-[var(--dim)]">
        <span>Bearish</span>
        <span>Neutral</span>
        <span>Bullish</span>
      </div>
    </div>
  );
}

function TickerGrid({ tickers }: { tickers: TickerCard[] }) {
  if (!tickers.length) return null;
  return (
    <div>
      <SectionLabel>Tickers to Watch</SectionLabel>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tickers.map((t) => {
          const up = (t.pct ?? 0) >= 0;
          return (
            <div
              key={t.symbol}
              className={[
                "border p-3",
                up
                  ? "border-[var(--up)]/25 bg-[var(--up)]/[0.04]"
                  : "border-[var(--down)]/25 bg-[var(--down)]/[0.04]",
              ].join(" ")}
            >
              <div className="text-[13px] font-bold text-[var(--foreground)]">
                {t.label}
              </div>
              <div className="mt-1 tabular-nums text-[13px] text-[#a1a1aa]">
                {t.price}
              </div>
              <div className="mt-2 text-[12px] tabular-nums">
                <Pct pct={t.pct} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BriefReader({
  brief,
  other,
}: {
  brief: BriefView;
  other: BriefView | null;
}) {
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

      <SentimentBar brief={brief} />

      <h1 className="font-display max-w-[24ch] text-[30px] font-extrabold leading-[1.06] tracking-tight text-white sm:text-[40px]">
        {brief.headline}
      </h1>

      <p className="max-w-[68ch] text-[15px] leading-relaxed text-[#a1a1aa]">
        {brief.lede}
      </p>

      {brief.keyPoints.length > 0 && (
        <div>
          <SectionLabel>Key Points</SectionLabel>
          <div className="divide-y divide-[var(--border)]">
            {brief.keyPoints.map((kp) => (
              <div
                key={kp.label}
                className="grid grid-cols-[84px_1fr] gap-3 py-3 sm:grid-cols-[110px_1fr]"
              >
                <div className="pt-0.5 text-right text-[10px] uppercase leading-tight tracking-widest text-[var(--amber)]">
                  {kp.label}
                </div>
                <div className="border-l border-[var(--border-strong)] pl-3 text-[14px] leading-snug text-[#d4d4d8]">
                  {kp.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-l-2 border-[var(--amber)] bg-[rgba(255,165,0,0.05)] px-4 py-3">
        <div className="text-[10px] uppercase tracking-widest text-[var(--amber)]">
          Key Signal
        </div>
        <div className="mt-1 text-[16px] font-semibold leading-snug text-white">
          {brief.keySignal}
        </div>
      </div>

      <TickerGrid tickers={brief.tickers} />

      {other && (
        <Link
          href={other.href}
          className="flex items-center justify-between gap-3 border border-[var(--border)] bg-[var(--panel)] px-4 py-3 transition-colors hover:border-[var(--border-strong)]"
        >
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-[var(--dim)]">
              {other.window === "morning" ? "Morning" : "Evening"} Brief ·{" "}
              {other.dateLabel}
            </div>
            <div className="mt-0.5 truncate text-[15px] text-[#d4d4d8]">
              {other.headline}
            </div>
          </div>
          <span className="text-[18px] text-[var(--dim)]">›</span>
        </Link>
      )}
    </div>
  );
}

function SectorPerformance({ sectors }: { sectors: SectorRow[] }) {
  const maxAbs = Math.max(
    1,
    ...sectors.map((s) => Math.abs(s.pct ?? 0)),
  );
  return (
    <div>
      <SectionLabel>S&amp;P 500 Sector Performance · 1D</SectionLabel>
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
              <span className="hidden truncate text-[var(--dim)] sm:block">
                {s.name}
              </span>
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
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${toneDot(w.tone)}`}
                />
                <span className="text-[14px] leading-snug text-[#d4d4d8]">
                  {w.headline}
                </span>
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
          <div
            key={i}
            className="grid grid-cols-[52px_1fr_auto] items-center gap-3 py-3"
          >
            <div className="text-[10px] uppercase tracking-widest text-[var(--amber)]">
              {c.day}
              <div className="text-[9px] tracking-normal text-[var(--dim)]">
                {c.dateLabel}
              </div>
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
