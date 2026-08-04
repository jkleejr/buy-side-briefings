"use client";

import { useMemo, useState } from "react";
// Types only. A value import from lib/schedule would pull lib/data — and with
// it the fs reads and the Yahoo client — into the browser bundle; `import type`
// is erased at compile time, so the boundary holds.
import type { ScheduleData, ScheduleEvent } from "@/lib/schedule";

// --- month arithmetic --------------------------------------------------------
// All of it on noon-UTC dates keyed off "YYYY-MM-DD" strings, so a cell never
// slips a day for a reader west of the server.

type Cell = { iso: string; dayNum: number; inMonth: boolean };

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1, 12));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1, 12)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Aug" — the three-letter form the month buttons wear. */
function monthAbbr(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1, 12)).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * The month's grid, weeks running Monday→Sunday.
 *
 * Only as many weeks as the month actually occupies — a fixed six-row grid
 * leaves a trailing row of pure next-month greys on most months, which reads as
 * a week of the calendar being empty rather than absent.
 */
function monthCells(month: string): Cell[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1, 12));
  const daysInMonth = new Date(Date.UTC(y, m, 0, 12)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday = 0
  const weeks = Math.ceil((lead + daysInMonth) / 7);

  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(first);
    d.setUTCDate(1 - lead + i);
    return {
      iso: d.toISOString().slice(0, 10),
      dayNum: d.getUTCDate(),
      inMonth: d.getUTCMonth() === m - 1,
    };
  });
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TONE: Record<"macro" | "earnings" | "other", string> = {
  macro: "var(--down)",
  earnings: "var(--amber)",
  other: "var(--dim)",
};

/** Kinds that move a whole session rather than a single name. */
const MACRO_KINDS = new Set(["MACRO", "FOMC", "BOJ", "CPI", "NFP", "PCE", "GEO"]);

function kindTone(kind: string): "macro" | "earnings" | "other" {
  const k = kind.toUpperCase();
  if (MACRO_KINDS.has(k)) return "macro";
  if (k === "EARNINGS") return "earnings";
  return "other";
}

/** "T−4", "TODAY", "5D AGO" — the countdown, in both directions. */
function countdown(e: ScheduleEvent): string {
  if (e.isToday) return "Today";
  if (e.tMinus > 0) return `T−${e.tMinus}`;
  return `${Math.abs(e.tMinus)}d ago`;
}

// --- chrome ------------------------------------------------------------------

function SectionRule({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 border-b border-[var(--foreground)] pb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--dim)]">
      {children}
    </h2>
  );
}

function NavButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="border border-[var(--border-strong)] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--dim)] transition-colors hover:border-[var(--foreground)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-[var(--border-strong)] disabled:hover:text-[var(--dim)]"
    >
      {children}
    </button>
  );
}

// --- page --------------------------------------------------------------------

export default function ScheduleCalendar({ data }: { data: ScheduleData }) {
  const [month, setMonth] = useState(data.todayMonth);
  const [selected, setSelected] = useState<string | null>(null);

  // Every event on the board, bucketed by date once.
  const byDate = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const e of data.events) {
      map.set(e.date, [...(map.get(e.date) ?? []), e]);
    }
    return map;
  }, [data.events]);

  const cells = useMemo(() => monthCells(month), [month]);

  // The month's own events, chronological — the reading layer under the grid.
  const monthEvents = useMemo(
    () => data.events.filter((e) => e.date.slice(0, 7) === month),
    [data.events, month],
  );

  const behind = monthEvents.filter((e) => e.past);
  const ahead = monthEvents.filter((e) => !e.past);

  // Paging stops at the edge of what we actually hold rather than running off
  // into empty months forever.
  const atStart = month <= data.firstMonth.slice(0, 7);
  const atEnd = month >= data.lastMonth.slice(0, 7);

  const jumpTo = (iso: string) => {
    setSelected(iso);
    document.getElementById(`day-${iso}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-16 sm:px-6">
      {/* --- masthead --- */}
      {/* Carries the page's h1. The month title that used to hold it is gone,
          and a page whose only headings are the section rules below reads as
          untitled to a screen reader and to search. Styled as the eyebrow it
          looks like. */}
      <div className="border-t border-[var(--foreground)] pt-4">
        <h1 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--dim)]">
          Schedule
        </h1>
      </div>

      {/* --- month nav --- */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <NavButton
            label="Previous month"
            onClick={() => setMonth(addMonths(month, -1))}
            disabled={atStart}
          >
            ‹ {monthAbbr(addMonths(month, -1))}
          </NavButton>
          {/* The middle button names the month it takes you to — the real
              current month, not the one being viewed. So while it is August it
              reads AUG, in September it reads SEP, and the flanking buttons
              step off the *viewed* month either side. */}
          <NavButton
            label={`Jump to ${monthLabel(data.todayMonth)}, the current month`}
            onClick={() => setMonth(data.todayMonth)}
          >
            {monthAbbr(data.todayMonth)}
          </NavButton>
          <NavButton
            label="Next month"
            onClick={() => setMonth(addMonths(month, 1))}
            disabled={atEnd}
          >
            {monthAbbr(addMonths(month, 1))} ›
          </NavButton>
        </div>

        {/* Legend — three tones is the whole vocabulary of the grid. */}
        <div className="hidden items-center gap-3.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--dim)] sm:flex">
          {(["macro", "earnings", "other"] as const).map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span
                className="inline-block h-[7px] w-[7px] rounded-full"
                style={{ background: TONE[t] }}
              />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* --- the month face --- */}
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[620px]">
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="border-b border-[var(--foreground)] pb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--dim)]"
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((c) => {
              const events = byDate.get(c.iso) ?? [];
              const isToday = c.iso === data.today;
              const isPast = c.iso < data.today;
              const isSelected = c.iso === selected;
              const shown = events.slice(0, 3);
              const rest = events.length - shown.length;

              return (
                <div
                  key={c.iso}
                  onClick={events.length ? () => jumpTo(c.iso) : undefined}
                  className={[
                    "min-h-[104px] border-b border-r border-[var(--border)] p-1.5",
                    "[&:nth-child(7n+1)]:border-l",
                    events.length ? "cursor-pointer" : "",
                    !c.inMonth ? "opacity-35" : isPast ? "opacity-70" : "",
                    // One background, chosen here rather than stacked as three
                    // competing `bg-*` utilities — today's shade is the only
                    // thing marking today now that the chip is gone, and it
                    // must not lose to a hover or a selection that happens to
                    // sort later in the stylesheet.
                    isToday
                      ? "bg-[var(--panel-head)]"
                      : isSelected
                        ? "bg-[var(--panel)]"
                        : events.length
                          ? "hover:bg-[var(--panel)]"
                          : "",
                  ].join(" ")}
                >
                  {/* No "today" chip. The shaded cell says it, and the label
                      was competing with the events for the width of a column.
                      The date stays bold so the day reads even at a glance. */}
                  <div className="flex items-baseline justify-between">
                    <span
                      className={[
                        "font-mono text-[13px] tabular-nums",
                        isToday
                          ? "font-bold text-[var(--foreground)]"
                          : c.inMonth
                            ? "text-[var(--ink-3)]"
                            : "text-[var(--faint)]",
                      ].join(" ")}
                    >
                      {c.dayNum}
                    </span>
                  </div>

                  {/* Full chips where there's room; a row of dots when there
                      isn't, so a narrow screen still shows which days are busy. */}
                  <div className="mt-1 hidden space-y-[3px] sm:block">
                    {shown.map((e, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-1 text-[10.5px] leading-[1.25] text-[var(--ink-2)]"
                      >
                        <span
                          className="mt-[4px] inline-block h-[5px] w-[5px] shrink-0 rounded-full"
                          style={{ background: TONE[kindTone(e.kind)] }}
                        />
                        <span className="line-clamp-2">{e.short}</span>
                      </div>
                    ))}
                    {rest > 0 && (
                      <div className="pl-[9px] font-mono text-[9.5px] text-[var(--faint)]">
                        +{rest} more
                      </div>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-1 sm:hidden">
                    {events.map((e, i) => (
                      <span
                        key={i}
                        className="inline-block h-[6px] w-[6px] rounded-full"
                        style={{ background: TONE[kindTone(e.kind)] }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- the reading layer: this month, in full, both directions --- */}
      <div className="pt-12">
        <SectionRule>{monthLabel(month)} in detail</SectionRule>

        {monthEvents.length === 0 ? (
          <p className="py-10 text-center text-[14px] italic text-[var(--dim)]">
            Nothing dated in {monthLabel(month)}.
          </p>
        ) : (
          <>
            <DayList title="Already happened" events={behind} today={data.today} />
            <DayList title="Still ahead" events={ahead} today={data.today} />
          </>
        )}
      </div>

      <div className="mt-14 flex flex-wrap justify-between gap-2 border-t border-[var(--foreground)] pt-3 font-mono text-[11.5px] text-[var(--dim)]">
        <span>
          Catalysts from the daily routine · earnings and macro dates from Yahoo
          and FRED · Fed and BoJ from their published schedules.
        </span>
        <span>Educational only — not investment advice.</span>
      </div>
    </div>
  );
}

/**
 * One half of the month, grouped by day. Past and future use the same row so a
 * date reads identically whichever side of today it falls on — only the tone
 * and the countdown change.
 */
function DayList({
  title,
  events,
  today,
}: {
  title: string;
  events: ScheduleEvent[];
  today: string;
}) {
  if (!events.length) return null;

  const days = new Map<string, ScheduleEvent[]>();
  for (const e of events) days.set(e.date, [...(days.get(e.date) ?? []), e]);

  return (
    <section className="mb-9 last:mb-0">
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
        {title}
      </h3>
      {Array.from(days.entries()).map(([iso, rows]) => (
        <div
          key={iso}
          id={`day-${iso}`}
          className={[
            "grid grid-cols-[62px_1fr] items-start gap-4 border-t border-[var(--border)] py-3.5 sm:grid-cols-[78px_1fr] sm:gap-6",
            iso < today ? "opacity-75" : "",
          ].join(" ")}
        >
          <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--dim)]">
            {rows[0].day}
            <b
              className={[
                "block font-mono text-[17px] font-semibold not-italic tabular-nums",
                iso === today ? "text-[var(--down)]" : "text-[var(--foreground)]",
              ].join(" ")}
            >
              {rows[0].dateLabel}
            </b>
            <span className="block pt-0.5 text-[9.5px] tracking-[0.1em] text-[var(--faint)]">
              {countdown(rows[0])}
            </span>
          </div>

          <div className="space-y-3">
            {rows.map((e, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] items-baseline gap-3">
                <div>
                  <p className="text-[14.5px] leading-snug text-[var(--ink-2)]">{e.label}</p>
                  {(e.timeET || e.note) && (
                    <p className="mt-0.5 text-[12.5px] leading-snug italic text-[var(--faint)]">
                      {[e.timeET, e.note].filter(Boolean).join(" — ")}
                    </p>
                  )}
                  {e.tickers && e.tickers.length > 0 && (
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--amber-dim)]">
                      {e.tickers.slice(0, 8).join(" · ")}
                    </p>
                  )}
                </div>
                <span
                  className="shrink-0 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: TONE[kindTone(e.kind)] }}
                >
                  {e.kind}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
