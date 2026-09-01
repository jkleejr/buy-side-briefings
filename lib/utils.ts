import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 48) return `${hours}h ago`;
  return `${days}d ago`;
}

export function formatPct(n: number | null | undefined): string {
  // Defensive: a single missing/non-finite value must never crash the static
  // build (the whole site is one prerender). Render an em-dash instead.
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/**
 * Date formatters, built once and reused.
 *
 * `toLocaleDateString(locale, options)` constructs a fresh Intl.DateTimeFormat
 * on every call, and construction — not formatting — is the expensive half. The
 * report archive renders 200+ rows that each called four of these helpers, so a
 * single render built 800+ formatters and did it again on every keystroke in
 * the filter box. Vercel flagged it as a 576ms INP on nav clicks.
 *
 * Held as module constants rather than a cache keyed on options: the set is
 * small, fixed, and known at author time.
 */
const FMT_ET_CLOCK = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/New_York",
  timeZoneName: "short",
});
const FMT_WEEKDAY_LONG_UTC = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  timeZone: "UTC",
});
const FMT_DATE_LONG_UTC = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const FMT_DATE_SHORT_UTC = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const FMT_WEEKDAY_LONG_ET = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  timeZone: "America/New_York",
});
const FMT_DATE_LONG_ET = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "America/New_York",
});

/**
 * Format an ISO timestamp as a US Eastern clock time, e.g. "8:30 PM ET".
 * Returns null if input is missing/invalid.
 */
export function formatBriefingTime(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return FMT_ET_CLOCK.format(d);
}

/**
 * Format a date (YYYY-MM-DD) or full ISO datetime for chart tooltips:
 *   { day: "Friday", full: "May 15, 2026", time: "10:30 AM ET" | null }
 * For date-only inputs, time is null. For full ISO datetimes (intraday data),
 * time is formatted in US Eastern (market) time.
 */
export function formatChartDate(iso: string): {
  day: string;
  full: string;
  time: string | null;
} {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = isDateOnly ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  if (isNaN(d.getTime())) return { day: "", full: iso, time: null };

  // A date-only input is read at noon UTC and printed in UTC; a full timestamp
  // is market data and prints in Eastern.
  const day = (isDateOnly ? FMT_WEEKDAY_LONG_UTC : FMT_WEEKDAY_LONG_ET).format(d);
  const full = (isDateOnly ? FMT_DATE_LONG_UTC : FMT_DATE_LONG_ET).format(d);
  const time = isDateOnly ? null : FMT_ET_CLOCK.format(d);
  return { day, full, time };
}

/**
 * Compact X-axis tick label for charts: "Jun 10" for daily series, "2:30 PM"
 * (US Eastern) for intraday timestamps. Raw ISO strings on an axis are
 * unreadable, especially at mobile widths.
 */
export function formatChartTick(iso: string, intraday?: boolean): string {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = isDateOnly ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  if (isNaN(d.getTime())) return iso;
  if (intraday && !isDateOnly) {
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/New_York",
    });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: isDateOnly ? "UTC" : "America/New_York",
  });
}

export function formatLevel(n: number | null | undefined): string {
  // Defensive: one malformed level must not crash the static build.
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
  return n.toFixed(2);
}


/** Display name for a briefing window. */
export function windowLabel(w: string): string {
  return WINDOW_LABEL[w] ?? w;
}

const WINDOW_LABEL: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  night: "Night",
  daily: "Daily",
};

/**
 * The briefing title: "Monday, July 20, 2026 · Night".
 * Used for the heading, the <title> and the share card, as well as list rows.
 * Every briefing in the archive is a markets one, so the old "Markets
 * Briefing · " prefix was pure repetition pushing the date rightward.
 */
export function formatBriefingDateLine(b: {
  date: string;
  window?: string | null;
}): string {
  const d = new Date(`${b.date}T12:00:00Z`);
  const win = b.window ? ` · ${windowLabel(b.window)}` : "";
  return `${FMT_WEEKDAY_LONG_UTC.format(d)}, ${FMT_DATE_LONG_UTC.format(d)}${win}`;
}

/**
 * Compact variant for narrow screens: "Wed, Jun 10 · Night". The routine is
 * already shown as a code chip next to the title, so repeating "Markets
 * Briefing · " only pushes the date off-screen.
 */
export function formatBriefingTitleShort(b: {
  date: string;
  window?: string | null;
}): string {
  const d = new Date(`${b.date}T12:00:00Z`);
  const win = b.window ? ` · ${windowLabel(b.window)}` : "";
  return `${FMT_DATE_SHORT_UTC.format(d)}${win}`;
}


const WORDS_PER_MINUTE = 200;

/**
 * Roughly how long a table row takes to scan. A close table is read at a
 * glance, not at reading speed, but it is not free either — counting its cells
 * as prose overstated a report by a minute, counting them as nothing would
 * understate a 25-row week-ahead table.
 */
const TABLE_ROW_SECONDS = 2.5;

/**
 * Honest read-time in minutes for a markdown report.
 *
 * Counts what a reader actually reads. The input is markdown, so three things
 * have to come out before counting or the estimate drifts long:
 *   - link targets — `](https://very/long/url)` is one token to split() and
 *     zero words to a reader; a report carries a dozen or more
 *   - table rows — counted separately at a scanning rate, not a reading one
 *   - syntax marks — #, *, >, backticks, brackets
 *
 * Measured against the archive, the old raw split() overstated by up to a
 * minute, most on the table-heavy night reports.
 */
export function readMinutes(markdown: string): number {
  let t = markdown.replace(/```[\s\S]*?```/g, " ");
  t = t.replace(/\]\([^)]*\)/g, "]");

  // Count body rows before removing them; the |---|---| separator is not one.
  const rows = (t.match(/^[ \t]*\|.*\|[ \t]*$/gm) ?? []).filter(
    (r) => !/^[ \t]*\|[\s:|-]+\|[ \t]*$/.test(r),
  );
  t = t.replace(/^[ \t]*\|.*$/gm, " ").replace(/[#>*_`~[\]]/g, " ");

  const words = t.split(/\s+/).filter(Boolean).length;
  const seconds = (words / WORDS_PER_MINUTE) * 60 + rows.length * TABLE_ROW_SECONDS;
  return Math.max(1, Math.round(seconds / 60));
}

/** Current time as "HH:MM UTC" — stamped at server render, i.e. the moment the data was fetched. */
export function nowUtcHM(): string {
  const d = new Date();
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}

/**
 * Today's calendar date (YYYY-MM-DD) in US market time (America/New_York).
 * Use this for any "what day is it now" comparison against briefing/calendar/
 * dossier dates. Plain `new Date().toISOString()` runs in UTC on Vercel, which
 * rolls past midnight ~8pm ET and silently shifts "today" forward by a day.
 * `en-CA` formats as YYYY-MM-DD, and the timeZone option handles DST.
 */
export function todayET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

/**
 * Today's date in US market time, formatted MM-DD-YYYY for display.
 *
 * Deliberately separate from todayET(): that one's YYYY-MM-DD is a key, not a
 * label — it is compared against briefing slugs and calendar dates and passed
 * to the lite-read route, so it has to stay ISO. This is the display-only
 * spelling, for chrome that a reader looks at rather than code that sorts.
 */
const FMT_TODAY_ET = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "numeric",
  day: "numeric",
  year: "2-digit",
});

export function todayETDisplay(): string {
  return FMT_TODAY_ET.format(new Date());
}
