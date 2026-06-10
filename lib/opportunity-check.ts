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
