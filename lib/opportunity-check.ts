import type { Opportunity } from "@/lib/data";
import { getLivePrices } from "@/lib/markets";

// ---------------------------------------------------------------------------
// Live plan-vs-price check for open opportunities. The journal's `status`
// field stays owner-managed (a stop is judged on the daily close, with
// context); these badges are the always-on tripwire that says "look at this
// one NOW" the moment the live price crosses a published level.
// ---------------------------------------------------------------------------

export type LiveBadge = {
  label: string;
  tone: "up" | "down" | "amber" | "dim";
};

export type LiveCheck = {
  price: number;
  badges: LiveBadge[];
};

/** Journal tickers that aren't valid Yahoo symbols as-is. */
const SYMBOL_MAP: Record<string, string> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
};

export function yahooSymbolFor(ticker: string): string {
  return SYMBOL_MAP[ticker] ?? ticker;
}

function isShort(o: Opportunity): boolean {
  return o.direction === "short" || o.direction === "short_vol";
}

export function gradeOpportunity(
  o: Opportunity,
  price: number,
  todayIso: string,
): LiveCheck {
  const badges: LiveBadge[] = [];
  const lv = o.levels;
  const short = isShort(o);

  if (lv?.stop !== undefined) {
    const breached = short ? price >= lv.stop : price <= lv.stop;
    if (breached) badges.push({ label: "⚠ STOP BREACHED (live)", tone: "down" });
  }

  if (lv?.targets && lv.targets.length > 0) {
    let hit = 0;
    for (const t of lv.targets) {
      if (short ? price <= t : price >= t) hit += 1;
    }
    if (hit > 0) badges.push({ label: `◎ TARGET ${hit} HIT (live)`, tone: "up" });
  }

  if (
    badges.length === 0 &&
    lv?.entry_low !== undefined &&
    lv?.entry_high !== undefined &&
    price >= lv.entry_low &&
    price <= lv.entry_high
  ) {
    badges.push({ label: "IN ENTRY ZONE", tone: "amber" });
  }

  if (o.expires_at) {
    const daysLeft = Math.ceil(
      (Date.parse(`${o.expires_at}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) /
        86_400_000,
    );
    if (daysLeft <= 0) badges.push({ label: "EXPIRED — close it", tone: "down" });
    else if (daysLeft <= 5) badges.push({ label: `EXPIRES IN ${daysLeft}D`, tone: "dim" });
  }

  return { price, badges };
}

// ---------------------------------------------------------------------------
// Structured plan-state classification — powers the morning playbook panel.
// Badges (above) are display strings; this is the machine-readable version
// with distances, so callers can rank "what needs attention first".
// ---------------------------------------------------------------------------

export type PlanState =
  | "stop_breached"
  | "target_hit"
  | "near_stop"
  | "in_entry_zone"
  | "tracking";

export type PlanCheck = {
  opportunity: Opportunity;
  price: number;
  state: PlanState;
  /** % move from live price to the stop in the adverse direction (positive = cushion left). */
  to_stop_pct: number | null;
};

/** Within this % of the stop (on the safe side) counts as "near stop". */
const NEAR_STOP_PCT = 2;

export function classifyOpportunity(o: Opportunity, price: number): PlanCheck {
  const lv = o.levels;
  const short = isShort(o);

  let toStop: number | null = null;
  if (lv?.stop !== undefined && price > 0) {
    // Positive while the stop hasn't been hit; crosses zero at breach.
    toStop = short
      ? ((lv.stop - price) / price) * 100
      : ((price - lv.stop) / price) * 100;
  }

  let state: PlanState = "tracking";
  if (toStop !== null && toStop <= 0) {
    state = "stop_breached";
  } else if (
    lv?.targets?.some((t) => (short ? price <= t : price >= t))
  ) {
    state = "target_hit";
  } else if (toStop !== null && toStop <= NEAR_STOP_PCT) {
    state = "near_stop";
  } else if (
    lv?.entry_low !== undefined &&
    lv?.entry_high !== undefined &&
    price >= lv.entry_low &&
    price <= lv.entry_high
  ) {
    state = "in_entry_zone";
  }

  return { opportunity: o, price, state, to_stop_pct: toStop };
}

/** Classify every open opportunity against live prices, most urgent first. */
export async function classifyOpenOpportunities(
  opportunities: Opportunity[],
): Promise<PlanCheck[]> {
  const open = opportunities.filter(
    (o) => o.status === "active" || o.status === "triggered",
  );
  const symbols = [...new Set(open.map((o) => yahooSymbolFor(o.ticker)))];
  const prices = await getLivePrices(symbols);

  const ORDER: Record<PlanState, number> = {
    stop_breached: 0,
    target_hit: 1,
    near_stop: 2,
    in_entry_zone: 3,
    tracking: 4,
  };

  return open
    .flatMap((o) => {
      const price = prices[yahooSymbolFor(o.ticker)];
      return price === undefined ? [] : [classifyOpportunity(o, price)];
    })
    .sort((a, b) => ORDER[a.state] - ORDER[b.state]);
}

/**
 * Fetch live prices for every open opportunity and grade each against its
 * published levels. Returns a map keyed by opportunity id.
 */
export async function checkOpenOpportunities(
  opportunities: Opportunity[],
): Promise<Record<string, LiveCheck>> {
  const open = opportunities.filter(
    (o) => o.status === "active" || o.status === "triggered",
  );
  const symbols = [...new Set(open.map((o) => yahooSymbolFor(o.ticker)))];
  const prices = await getLivePrices(symbols);
  const today = new Date().toISOString().slice(0, 10);

  const out: Record<string, LiveCheck> = {};
  for (const o of open) {
    const price = prices[yahooSymbolFor(o.ticker)];
    if (price === undefined) continue;
    out[o.id] = gradeOpportunity(o, price, today);
  }
  return out;
}
