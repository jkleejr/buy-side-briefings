import YahooFinance from "yahoo-finance2";
import { getWatchlist } from "./data";

// ---------------------------------------------------------------------------
// Upcoming-earnings schedule for the names the user actually tracks (the
// watchlist). Live from Yahoo's quoteSummary `calendarEvents` module — next
// earnings date, whether it's confirmed or still an estimate, and the Street's
// EPS / revenue consensus. Powers the /earnings section. Null-safe throughout:
// a dead symbol drops out rather than crashing the page.
// ---------------------------------------------------------------------------

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

export type EarningsEntry = {
  symbol: string;
  /** Friendly label from the watchlist. */
  label: string;
  /** Yahoo's company name, if available. */
  name: string | null;
  price: number | null;
  /** Next earnings date, YYYY-MM-DD. */
  date: string;
  /** True when the date is a Yahoo estimate (or our own quarter projection). */
  isEstimate: boolean;
  /** Whole days from today (UTC). Can be 0 (today). */
  daysUntil: number;
  epsEstimate: number | null;
  epsLow: number | null;
  epsHigh: number | null;
  revenueEstimate: number | null;
};

export type EarningsSchedule = {
  asOf: string;
  /** Names with a resolvable upcoming date, soonest first. */
  entries: EarningsEntry[];
  /** Tracked names Yahoo had no date for at all. */
  noDate: { symbol: string; label: string }[];
};

function toDate(d: unknown): Date | null {
  if (d instanceof Date) return d;
  if (typeof d === "string" || typeof d === "number") {
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function daysFromToday(iso: string): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const d = new Date(`${iso}T00:00:00Z`);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

type CalEvents = {
  calendarEvents?: {
    earnings?: {
      earningsDate?: unknown[];
      isEarningsDateEstimate?: boolean;
      earningsAverage?: number;
      earningsLow?: number;
      earningsHigh?: number;
      revenueAverage?: number;
    };
  };
  price?: { shortName?: string; longName?: string; regularMarketPrice?: number };
};

type SettledEarnings =
  | { kind: "dated"; entry: EarningsEntry }
  | { kind: "none"; symbol: string; label: string };

// Fetch + normalize the next-earnings read for an arbitrary set of names. Shared
// by the watchlist schedule (/earnings) and the per-desk lookup (/stocks).
async function fetchEarningsItems(
  items: { symbol: string; label: string }[],
): Promise<SettledEarnings[]> {
  const now = Date.now();
  return Promise.all(
    items.map(async ({ symbol, label }) => {
      try {
        const sum = (await yahooFinance.quoteSummary(symbol, {
          modules: ["calendarEvents", "price"],
        })) as CalEvents;
        const e = sum?.calendarEvents?.earnings;
        const p = sum?.price;
        const dates = (e?.earningsDate ?? [])
          .map(toDate)
          .filter((d): d is Date => d !== null)
          .sort((a, b) => a.getTime() - b.getTime());

        const future = dates.filter((d) => d.getTime() >= now - 86_400_000);
        let date: string | null = null;
        let isEstimate = e?.isEarningsDateEstimate ?? false;

        if (future.length > 0) {
          date = future[0].toISOString().slice(0, 10);
        } else if (dates.length > 0) {
          // Only stale dates on file — project the next quarter (~91 days out
          // from the last known report) and flag it honestly as an estimate.
          const next = new Date(dates[dates.length - 1].getTime() + 91 * 86_400_000);
          date = next.toISOString().slice(0, 10);
          isEstimate = true;
        }

        const common = {
          symbol,
          label,
          name: p?.longName ?? p?.shortName ?? null,
          price: p?.regularMarketPrice ?? null,
        };

        if (!date) return { kind: "none" as const, symbol, label };

        return {
          kind: "dated" as const,
          entry: {
            ...common,
            date,
            isEstimate,
            daysUntil: daysFromToday(date),
            epsEstimate: e?.earningsAverage ?? null,
            epsLow: e?.earningsLow ?? null,
            epsHigh: e?.earningsHigh ?? null,
            revenueEstimate: e?.revenueAverage ?? null,
          } satisfies EarningsEntry,
        };
      } catch (err) {
        console.error(`[earnings] fetch failed for ${symbol}:`, err);
        return { kind: "none" as const, symbol, label };
      }
    }),
  );
}

/**
 * Companies report earnings; indices, currencies, futures and coins do not.
 *
 * The watchlist carries benchmarks alongside the single names — the S&P, the
 * VIX, DXY, USD/JPY, gold, crude, bitcoin, the KOSPI — and asking Yahoo for
 * their next earnings date put "No upcoming earnings date for: ^GSPC, ^VIX,
 * DX-Y.NYB…" on the earnings page. Not a bug in the answer, a bad question.
 * Suffix and prefix are enough to tell them apart: ^index, =X currency pair,
 * =F futures contract, -USD crypto pair.
 */
function reportsEarnings(symbol: string): boolean {
  return !(
    symbol.startsWith("^") ||
    symbol.endsWith("=X") ||
    symbol.endsWith("=F") ||
    symbol.endsWith("-USD")
  );
}

export async function getEarningsSchedule(): Promise<EarningsSchedule> {
  const settled = await fetchEarningsItems(
    getWatchlist().filter((w) => reportsEarnings(w.symbol)),
  );

  const entries = settled
    .filter((r): r is { kind: "dated"; entry: EarningsEntry } => r.kind === "dated")
    .map((r) => r.entry)
    .sort((a, b) => a.date.localeCompare(b.date));

  const noDate = settled
    .filter((r): r is { kind: "none"; symbol: string; label: string } => r.kind === "none")
    .map(({ symbol, label }) => ({ symbol, label }));

  return { asOf: new Date().toISOString(), entries, noDate };
}

/**
 * Next-earnings entry keyed by symbol, for an arbitrary set of names (e.g. the
 * single-name desks on /stocks). Symbols Yahoo can't date simply drop out, so
 * the caller renders a date only when one is actually known.
 */
export async function getNextEarnings(
  items: { symbol: string; label: string }[],
): Promise<Map<string, EarningsEntry>> {
  const settled = await fetchEarningsItems(items);
  const map = new Map<string, EarningsEntry>();
  for (const r of settled) if (r.kind === "dated") map.set(r.entry.symbol, r.entry);
  return map;
}

/** Compact revenue formatter: $91.7B, $815M. */
export function fmtRevenue(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v}`;
}

/** T-countdown badge text from days-until. */
export function countdownBadge(days: number): string {
  if (days === 0) return "TODAY";
  if (days === 1) return "TMRW";
  if (days < 0) return `${days}d`;
  return `T−${days}d`;
}
