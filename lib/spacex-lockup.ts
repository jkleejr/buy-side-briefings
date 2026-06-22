// SpaceX (SPCX) post-IPO insider lockup schedule — the "supply overhang" that
// drives the bear / short thesis.
//
// SpaceX priced its IPO at $135/share on 2026-06-11 (~$1.77T market cap) and
// began trading 2026-06-12 under SPCX. Instead of one 180-day cliff, insiders
// are freed on an unusual *staggered* early-release schedule inside the 180-day
// window — so pre-IPO stock reaches the float in waves rather than all at once.
// Each wave is fresh sellable supply that can pressure the price; that rolling
// overhang, into a thin post-IPO float, is the core of the short case.
//
// Percentages are of insiders' pre-IPO shares and (on the scheduled path) sum
// to 100% by day 180. Day-count tranches are exact calendar dates off the
// 2026-06-11 pricing date; the two earnings cliffs are estimated windows
// (SpaceX has not set report dates). The +30%-price trigger is a conditional
// accelerator with no fixed date — it pulls shares forward but does not change
// the 100%-by-day-180 endpoint, so it is tracked separately from the curve.
//
// Sourced from CNBC, The Motley Fool and wealth-advisor breakdowns of the S-1
// lockup terms (May–Jun 2026). Founder Elon Musk (12.3% of Class A) is exempt
// from every early-release provision below.

export const SPCX_IPO_DATE = "2026-06-11"; // pricing date — anchor for day counts
export const SPCX_FIRST_TRADE = "2026-06-12";
export const SPCX_IPO_PRICE = 135;
export const SPCX_LOCKUP_DAYS = 180;
export const SPCX_TRIGGER_PRICE = 175.5; // +30% from IPO; holds 5 of any 10 trading days
export const SPCX_TRIGGER_PCT = 10; // extra % freed if the price condition is met

export type UnlockStatus = "released" | "upcoming";

export interface UnlockEvent {
  id: string;
  /** ISO yyyy-mm-dd. Estimated for the earnings cliffs. */
  date: string;
  /** Days after pricing; null for earnings-driven cliffs. */
  dayOffset: number | null;
  label: string;
  detail: string;
  /** % of insiders' pre-IPO shares freed at this step. */
  pct: number;
  /** Running % freed on the scheduled (non-conditional) path. */
  cumulative: number;
  /** True when the date is an estimate rather than a hard day-count. */
  estimated: boolean;
}

// Ordered by date. Cumulative reflects the scheduled path only (the price
// trigger is handled separately). Reaches 100% at the day-180 full release.
export const SPCX_UNLOCKS: UnlockEvent[] = [
  {
    id: "q2",
    date: "2026-08-04",
    dayOffset: null,
    label: "Q2 earnings cliff",
    detail: "First and largest scheduled release — 20% of pre-IPO shares free once SpaceX reports its first quarter as a public company (est. window mid-July–Sept).",
    pct: 20,
    cumulative: 20,
    estimated: true,
  },
  {
    id: "d70",
    date: "2026-08-20",
    dayOffset: 70,
    label: "Day 70 tranche",
    detail: "First of five rolling 7% tranches.",
    pct: 7,
    cumulative: 27,
    estimated: false,
  },
  {
    id: "d90",
    date: "2026-09-09",
    dayOffset: 90,
    label: "Day 90 tranche",
    detail: "Second 7% tranche.",
    pct: 7,
    cumulative: 34,
    estimated: false,
  },
  {
    id: "d105",
    date: "2026-09-24",
    dayOffset: 105,
    label: "Day 105 tranche",
    detail: "Third 7% tranche.",
    pct: 7,
    cumulative: 41,
    estimated: false,
  },
  {
    id: "d120",
    date: "2026-10-09",
    dayOffset: 120,
    label: "Day 120 tranche",
    detail: "Fourth 7% tranche.",
    pct: 7,
    cumulative: 48,
    estimated: false,
  },
  {
    id: "d135",
    date: "2026-10-24",
    dayOffset: 135,
    label: "Day 135 tranche",
    detail: "Fifth and final 7% rolling tranche.",
    pct: 7,
    cumulative: 55,
    estimated: false,
  },
  {
    id: "q3",
    date: "2026-11-03",
    dayOffset: null,
    label: "Q3 earnings cliff",
    detail: "A 28% block frees after SpaceX reports the quarter ending Sept 30 (est. late Oct–early Nov) — the second-largest wave of supply.",
    pct: 28,
    cumulative: 83,
    estimated: true,
  },
  {
    id: "d180",
    date: "2026-12-08",
    dayOffset: 180,
    label: "Day 180 — full release",
    detail: "Standard lockup expiry. Every remaining pre-IPO share becomes sellable; insiders are fully unlocked.",
    pct: 17,
    cumulative: 100,
    estimated: false,
  },
];

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

export interface LockupSnapshot {
  events: (UnlockEvent & { status: UnlockStatus })[];
  /** % of pre-IPO shares already free on the scheduled path as of `refIso`. */
  freedPct: number;
  /** The next scheduled unlock after `refIso`, or null if fully unlocked. */
  next: (UnlockEvent & { status: UnlockStatus }) | null;
  /** Calendar days from `refIso` to the next unlock (0 if none). */
  daysToNext: number;
  /** Calendar days from `refIso` to the day-180 full release (clamped ≥0). */
  daysToFull: number;
}

export interface TriggerStatus {
  /** Most recent close passed in, or null if no data. */
  price: number | null;
  /** Is price currently at/above the +30% trigger? */
  aboveNow: boolean;
  /** Days at/above the trigger within the lookback window. */
  daysAbove: number;
  /** Size of the lookback window actually evaluated (≤10). */
  lookback: number;
  /** The condition is met once 5 of any 10 trading days close ≥ trigger. */
  armed: boolean;
}

/**
 * Evaluate the +30%-price accelerator against recent daily closes (most-recent
 * first). The S-1 condition: Class A ≥ $175.50 on 5 of any 10 trading days frees
 * an extra 10% of insider shares early. We approximate "trading days" with the
 * dossier's daily closes — a live read on whether that supply is arming.
 */
export function getTriggerStatus(recentCloses: number[]): TriggerStatus {
  const window = recentCloses.slice(0, 10);
  const daysAbove = window.filter((p) => p >= SPCX_TRIGGER_PRICE).length;
  return {
    price: recentCloses[0] ?? null,
    aboveNow: (recentCloses[0] ?? 0) >= SPCX_TRIGGER_PRICE,
    daysAbove,
    lookback: window.length,
    armed: daysAbove >= 5,
  };
}

/**
 * Annotate the lockup schedule against a reference date. `refIso` should be the
 * current day (yyyy-mm-dd); everything on or before it is "released".
 */
export function getSpacexLockup(refIso: string): LockupSnapshot {
  const events = SPCX_UNLOCKS.map((e) => ({
    ...e,
    status: (daysBetween(e.date, refIso) >= 0 ? "released" : "upcoming") as UnlockStatus,
  }));

  const released = events.filter((e) => e.status === "released");
  const freedPct = released.length ? released[released.length - 1].cumulative : 0;
  const next = events.find((e) => e.status === "upcoming") ?? null;
  const daysToNext = next ? Math.max(0, daysBetween(refIso, next.date)) : 0;
  const daysToFull = Math.max(0, daysBetween(refIso, "2026-12-08"));

  return { events, freedPct, next, daysToNext, daysToFull };
}
