// Central-bank decision dates the /earnings page lists beside watchlist
// earnings. Published years ahead and rarely moved, so static tables are
// honest here — FRED exposes data releases, not Fed meetings.

import type { CalendarEvent } from "@/lib/data";

/**
 * FOMC decision dates. Published years ahead and rarely moved, so a table is
 * honest here — FRED exposes data releases, not Fed meetings. Verified against
 * federalreserve.gov; the Jul 28–29 entry cross-checks against the one the
 * routine had already written by hand.
 */
const FOMC_2026: Array<{ date: string; through: string }> = [
  { date: "2026-01-27", through: "28" },
  { date: "2026-03-17", through: "18" },
  { date: "2026-04-28", through: "29" },
  { date: "2026-06-16", through: "17" },
  { date: "2026-07-28", through: "29" },
  { date: "2026-09-15", through: "16" },
  { date: "2026-10-27", through: "28" },
  { date: "2026-12-08", through: "09" },
];

/**
 * Bank of Japan Monetary Policy Meetings, from boj.or.jp's own published
 * schedule. Eight a year, like the FOMC, and equally rarely moved.
 *
 * Dated on the SECOND day, not the first the way FOMC_2026 is, because that is
 * the day the statement lands and the day the yen actually moves. `from` is the
 * opening day, so the label can still show the full span.
 *
 * The decision is announced during the Tokyo lunch hour, which is the previous
 * evening in New York — so the row carries no `time_et`. Putting a clock on it
 * would either be wrong (a Tokyo time on an ET strip) or read as an intraday US
 * event, when in practice you wake up to it.
 */
const BOJ_2026: Array<{ from: string; date: string }> = [
  { from: "2026-01-22", date: "2026-01-23" },
  { from: "2026-03-18", date: "2026-03-19" },
  { from: "2026-04-27", date: "2026-04-28" },
  { from: "2026-06-15", date: "2026-06-16" },
  { from: "2026-07-30", date: "2026-07-31" },
  { from: "2026-09-17", date: "2026-09-18" },
  { from: "2026-10-29", date: "2026-10-30" },
  { from: "2026-12-17", date: "2026-12-18" },
];

/**
 * How far back the fixed central-bank tables still report. The schedule is a
 * record of the week, not only a countdown: a Fed decision that landed three
 * days ago is the most useful thing on the strip for reading what just moved,
 * and dropping it the morning after left a fortnight of blank days behind
 * today. The tables are static, so looking back costs nothing.
 */
export const CENTRAL_BANK_LOOKBACK_DAYS = 45;

function lookbackFrom(from: string, days = CENTRAL_BANK_LOOKBACK_DAYS): string {
  const d = new Date(`${from}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** FOMC decisions from the table above. Pass 0 for upcoming-only. */
export function getFomcEvents(
  from: string,
  lookbackDays = CENTRAL_BANK_LOOKBACK_DAYS,
): CalendarEvent[] {
  const since = lookbackFrom(from, lookbackDays);
  return FOMC_2026.filter((m) => m.date >= since).map((m) => {
    const d = new Date(`${m.date}T12:00:00Z`);
    const day = d.getUTCDate();
    return {
      date: m.date,
      // Number() strips the table's leading zero: December is 8–9, not 8–09.
      label: `FOMC decision (${day}–${Number(m.through)})`,
      kind: "FOMC",
      time_et: "2:00 PM",
      source: "fomc",
    };
  });
}

/** BoJ policy decisions from the table above. Pass 0 for upcoming-only. */
export function getBojEvents(
  from: string,
  lookbackDays = CENTRAL_BANK_LOOKBACK_DAYS,
): CalendarEvent[] {
  const since = lookbackFrom(from, lookbackDays);
  return BOJ_2026.filter((m) => m.date >= since).map((m) => {
    const open = new Date(`${m.from}T12:00:00Z`).getUTCDate();
    const close = new Date(`${m.date}T12:00:00Z`).getUTCDate();
    return {
      date: m.date,
      label: `Bank of Japan (BoJ) decision (${open}–${close})`,
      kind: "BOJ",
      note: "Bank of Japan policy statement — lands overnight ET",
      source: "boj",
    };
  });
}
