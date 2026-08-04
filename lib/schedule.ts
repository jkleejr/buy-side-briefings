// The schedule page's data gather.
//
// The homepage used to carry a horizontal catalyst strip — a glance layer that
// could only ever show a dozen nodes and had to be scrolled sideways to reach
// last week. This replaces it with a real month face at /schedule, so the same
// merged event set (the routine's authored catalysts plus the mechanical
// earnings / FOMC / BoJ / FRED feeds) can be read a month at a time, in both
// directions.
//
// The one rule this page must never break: a schedule keeps its past. A Fed
// decision, a BoJ meeting or an earnings print does not stop being on the
// calendar the morning after it happens — that is precisely when you go looking
// for it to read what moved. Every window below is deliberately two-sided.

import { getMergedTimeline, type CalendarEvent } from "@/lib/data";

/**
 * How far behind today the mechanical feeds still report, and how far ahead the
 * FRED release schedule is pulled. Wider than the homepage strip's 45 days on
 * both counts: paging back through months is the point of this page.
 */
const LOOKBACK_DAYS = 180;
const MONTHS_AHEAD = 12;

export type ScheduleEvent = {
  /** ISO date, YYYY-MM-DD. The grid keys off this. */
  date: string;
  /** "MON" — weekday for the detail rows. */
  day: string;
  /** "Aug 7" — human date for the detail rows. */
  dateLabel: string;
  label: string;
  /** Trimmed label that fits a grid cell. */
  short: string;
  kind: string;
  note?: string;
  timeET?: string;
  tickers?: string[];
  source?: CalendarEvent["source"];
  past: boolean;
  isToday: boolean;
  /** Whole days from today — negative behind us, 0 today. */
  tMinus: number;
};

export type ScheduleData = {
  /** Today in New York, ISO. The market's day, not the server's. */
  today: string;
  todayMonth: string;
  events: ScheduleEvent[];
  /** "YYYY-MM" bounds of what we actually hold, so paging can stop. */
  firstMonth: string;
  lastMonth: string;
};

/**
 * A label that fits a calendar cell.
 *
 * Same trimming the old homepage strip used, and the same caveat: cut the
 * *trailing* parenthetical only. Cutting at the first "(" turned "Bank of Japan
 * (BoJ) decision" into "Bank of Japan", eating the word that says what it is.
 */
export function shortLabel(label: string, max = 38): string {
  const cut = label
    .split(/\s+[—–]\s+/)[0]
    .replace(/\s*\([^()]*\)\s*$/, "")
    .trim();
  return cut.length > max ? `${cut.slice(0, max).trim()}…` : cut;
}

// Note: the kind→tone mapping lives in components/schedule-calendar.tsx, not
// here. This module reaches the filesystem and the Yahoo client, so a client
// component importing any *value* from it would drag both into the browser
// bundle. The calendar takes types from here and nothing else.

function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

export async function getScheduleData(): Promise<ScheduleData> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

  const merged = await getMergedTimeline(today, {
    lookbackDays: LOOKBACK_DAYS,
    monthsAhead: MONTHS_AHEAD,
  });

  const events: ScheduleEvent[] = merged
    .map((e) => {
      // Noon UTC so the weekday never slips a day either side of the date line.
      const d = new Date(`${e.date}T12:00:00Z`);
      return {
        date: e.date,
        day: d
          .toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
          .toUpperCase(),
        dateLabel: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
        label: e.label,
        short: shortLabel(e.label),
        kind: e.kind,
        note: e.note,
        timeET: e.time_et,
        tickers: e.tickers,
        source: e.source,
        past: e.date < today,
        isToday: e.date === today,
        tMinus: Math.round((Date.parse(e.date) - Date.parse(today)) / 86_400_000),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));

  // Bounds always include the current month, so an empty feed still opens on a
  // real month face rather than on nothing.
  const months = events.map((e) => monthOf(e.date));
  const todayMonth = monthOf(today);

  return {
    today,
    todayMonth,
    events,
    firstMonth: months.length ? [...months, todayMonth].sort()[0] : todayMonth,
    lastMonth: months.length ? [...months, todayMonth].sort().slice(-1)[0] : todayMonth,
  };
}
