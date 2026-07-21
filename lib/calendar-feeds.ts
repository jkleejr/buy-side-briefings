// Scheduled events the briefing routine doesn't write by hand.
//
// data/calendar.json is maintained by the daily routine and is deliberately
// narrative: Kimi K3's weights dropping, an IPO lock-up expiring, AMD's AI Day.
// prompts/markets-website.md tells it to cover "events the Yahoo-earnings and
// FRED-macro feeds can't know about" — but nothing was ever merging those two
// feeds in, so the homepage strip showed only what the routine typed. Twelve of
// eighteen scheduled watchlist earnings and every macro print after the next one
// were simply absent.
//
// This module supplies the mechanical half. The routine's catalysts stay the
// headline act — see CATALYST_RANK in lib/home-terminal.ts, which keeps them on
// the timeline node when they share a date with an earnings row.

import { getEarningsSchedule } from "@/lib/earnings";
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
 * FRED release IDs for the prints that actually move a session. Deliberately
 * short: every extra release is another row competing with the catalysts.
 */
const FRED_RELEASES: Array<{ id: number; label: string; kind: string }> = [
  { id: 10, label: "CPI", kind: "MACRO" },
  { id: 50, label: "Jobs report", kind: "MACRO" },
  { id: 46, label: "PPI", kind: "MACRO" },
  { id: 54, label: "PCE / personal income", kind: "MACRO" },
];

type FredDates = { release_dates?: Array<{ date: string }> };

/**
 * Forward-dated macro releases straight from FRED, which publishes the actual
 * schedule rather than a rule of thumb. Beats deriving "first Friday" or
 * "second Wednesday": the routine's hand-written entry had July CPI on Aug 13,
 * and the real date is Aug 12.
 */
export async function getMacroReleases(
  from: string,
  monthsAhead = 6,
): Promise<CalendarEvent[]> {
  const key = process.env.FRED_API_KEY;
  if (!key) return [];

  const end = new Date(`${from}T12:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + monthsAhead);
  const endStr = end.toISOString().slice(0, 10);

  const per = await Promise.all(
    FRED_RELEASES.map(async ({ id, label, kind }) => {
      try {
        const url =
          `https://api.stlouisfed.org/fred/release/dates?release_id=${id}` +
          `&api_key=${key}&file_type=json&include_release_dates_with_no_data=true` +
          `&realtime_start=${from}&realtime_end=${endStr}&sort_order=asc`;
        const res = await fetch(url, { next: { revalidate: 21_600 } });
        if (!res.ok) return [];
        const json = (await res.json()) as FredDates;
        return (json.release_dates ?? [])
          .filter((r) => r.date >= from)
          .map<CalendarEvent>((r) => ({
            date: r.date,
            label,
            kind,
            time_et: "8:30 AM",
            source: "macro",
          }));
      } catch {
        // A macro feed hiccup should thin the calendar, never break the page.
        return [];
      }
    }),
  );

  return per.flat();
}

/** FOMC decisions from the table above, forward of `from`. */
export function getFomcEvents(from: string): CalendarEvent[] {
  return FOMC_2026.filter((m) => m.date >= from).map((m) => {
    const d = new Date(`${m.date}T12:00:00Z`);
    const day = d.getUTCDate();
    return {
      date: m.date,
      label: `FOMC decision (${day}–${m.through})`,
      kind: "FOMC",
      time_et: "2:00 PM",
      source: "fomc",
    };
  });
}

/**
 * Next earnings date for every watchlist name, from the same Yahoo-backed
 * helper /earnings already renders. Estimated dates are marked, because Yahoo
 * projects a quarter forward when a company hasn't confirmed.
 */
export async function getEarningsEvents(from: string): Promise<CalendarEvent[]> {
  try {
    const { entries } = await getEarningsSchedule();
    return entries
      .filter((e) => e.date >= from)
      .map<CalendarEvent>((e) => ({
        date: e.date,
        label: `${e.symbol} earnings${e.isEstimate ? " (est.)" : ""}`,
        kind: "EARNINGS",
        tickers: [e.symbol],
        note: e.name ?? undefined,
        source: "earnings",
      }));
  } catch {
    return [];
  }
}
