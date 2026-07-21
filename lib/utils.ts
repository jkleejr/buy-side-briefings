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
 * Format an ISO timestamp as a US Eastern clock time, e.g. "8:30 PM ET".
 * Returns null if input is missing/invalid.
 */
export function formatBriefingTime(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
    timeZoneName: "short",
  });
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

  const dayOpts: Intl.DateTimeFormatOptions = { weekday: "long" };
  const fullOpts: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  if (isDateOnly) {
    dayOpts.timeZone = "UTC";
    fullOpts.timeZone = "UTC";
  } else {
    dayOpts.timeZone = "America/New_York";
    fullOpts.timeZone = "America/New_York";
  }

  const day = d.toLocaleDateString("en-US", dayOpts);
  const full = d.toLocaleDateString("en-US", fullOpts);
  const time = isDateOnly
    ? null
    : d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/New_York",
        timeZoneName: "short",
      });
  return { day, full, time };
}

/**
 * Compact X-axis tick label for charts: "Jun 10" for daily series, "14:30"
 * (US Eastern) for intraday timestamps. Raw ISO strings on an axis are
 * unreadable, especially at mobile widths.
 */
export function formatChartTick(iso: string, intraday?: boolean): string {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = isDateOnly ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  if (isNaN(d.getTime())) return iso;
  if (intraday && !isDateOnly) {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
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

/**
 * Display string for how long a markets verdict is meant to hold. Older
 * verdicts predate the field; they're tactical day-trader calls scored at
 * +5d/+20d, so that's the honest fallback.
 */
export function verdictHorizon(horizon?: string): string {
  return horizon && horizon.trim() ? horizon : "Days–2 weeks (tactical)";
}

const ROUTINE_FULL: Record<string, string> = {
  markets: "Markets Briefing",
  crypto: "Crypto Briefing",
  kospi: "KOSPI Briefing",
  politics: "Politics Briefing",
  quote: "Quote of the Day",
  "app-ideas": "App Ideas",
  "pre-earnings": "Pre-Earnings Brief",
  "demand-signals": "Demand Signals",
};

/** Display name for a briefing window. "night" reads as "Evening" on the
 *  site — the data key predates the wording. */
export function windowLabel(w: string): string {
  return WINDOW_LABEL[w] ?? w;
}

const WINDOW_LABEL: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  night: "Evening",
  daily: "Daily",
};

/**
 * Produce a human-readable briefing title from its structured fields, e.g.
 *   "Markets Briefing · Friday, May 15, 2026 · Morning"
 * Always uses UTC to avoid the date shifting depending on the viewer's TZ.
 */
export function formatBriefingTitle(b: {
  routine: string;
  date: string;
  window?: string | null;
}): string {
  const routineLabel = ROUTINE_FULL[b.routine] ?? b.routine;
  const d = new Date(`${b.date}T12:00:00Z`);
  const day = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  const dateStr = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const win = b.window ? ` · ${windowLabel(b.window)}` : "";
  return `${routineLabel} · ${day}, ${dateStr}${win}`;
}

/**
 * Compact variant for narrow screens: "Wed, Jun 10 · Evening". The routine is
 * already shown as a code chip next to the title, so repeating "Markets
 * Briefing · " only pushes the date off-screen.
 */
export function formatBriefingTitleShort(b: {
  date: string;
  window?: string | null;
}): string {
  const d = new Date(`${b.date}T12:00:00Z`);
  const dateStr = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const win = b.window ? ` · ${windowLabel(b.window)}` : "";
  return `${dateStr}${win}`;
}

/**
 * Plain-English explanation of what each verdict code means and how it's
 * graded. Surfaced as a hover-tooltip wherever a verdict label is displayed.
 */
const VERDICT_EXPLANATIONS: Record<string, string> = {
  buy: "🟢 BUY — actively bullish. The analyst expects SPX up over the briefing's horizon (typically days to weeks). Usually paired with named entry levels and an invalidation. Graded RIGHT if SPX is up at the +1d/+5d/+20d marks.",
  hold: "🟡 HOLD — no directional call. Either the setup is unclear or the bull and bear cases balance out. Informational rather than positioning advice; not graded right or wrong because there's no directional bet to score.",
  step_aside:
    "🟠 STEP ASIDE — cautious. Not actively short, but explicitly not chasing. 'Take some risk off, don't add new longs, wait for better entry.' Graded RIGHT if SPX is flat or down (i.e., you didn't miss meaningful upside by stepping aside).",
  bearish:
    "🔴 BEARISH — actively negative. The analyst expects SPX down. Often paired with a specific short, hedge, or inverse-ETF idea. Graded RIGHT if SPX is down at the +1d/+5d/+20d marks.",
};

export function getVerdictExplanation(code: string): string {
  return (
    VERDICT_EXPLANATIONS[code] ??
    `Verdict code "${code}". Hover the labels on the dashboard or About page for an explanation.`
  );
}

export function verdictColor(code: string): {
  bg: string;
  text: string;
  ring: string;
} {
  switch (code) {
    case "buy":
      return { bg: "bg-emerald-500/10", text: "text-emerald-400", ring: "ring-emerald-500/30" };
    case "hold":
      return { bg: "bg-amber-500/10", text: "text-amber-400", ring: "ring-amber-500/30" };
    case "step_aside":
    case "aside":
      return { bg: "bg-orange-500/10", text: "text-orange-400", ring: "ring-orange-500/30" };
    case "bearish":
      return { bg: "bg-red-500/10", text: "text-red-400", ring: "ring-red-500/30" };
    default:
      return { bg: "bg-zinc-500/10", text: "text-zinc-400", ring: "ring-zinc-500/30" };
  }
}

/**
 * Honest read-time in minutes from the actual text (~200 wpm). The homepage
 * used to estimate from the verdict summary alone, promising "5 min" over a
 * 5,000-word briefing — always compute from the words the reader will face.
 */
export function readMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
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
