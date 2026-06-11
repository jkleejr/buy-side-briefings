import type { RegimeIndicator } from "@/lib/data";
import { getLivePrices } from "@/lib/markets";

// ---------------------------------------------------------------------------
// Live regime check: the briefings publish named triggers (DXY above 100,
// SPX below 7,460, …) in `regime_risk`, but those values freeze at publish
// time. This evaluates the same triggers against live prices so the dashboard
// answers "how many are in breach RIGHT NOW", not "as of last night".
// ---------------------------------------------------------------------------

export type RegimeStatus = "breached" | "near" | "holding";

export type LiveRegimeRow = {
  indicator: RegimeIndicator;
  /** Live price for the mapped symbol; null when no symbol matched or the fetch failed. */
  live: number | null;
  /** Status judged on the live value, falling back to the briefing value. */
  status: RegimeStatus;
  /** True when `status` was judged on live data rather than the briefing print. */
  isLive: boolean;
};

/**
 * Keyword → Yahoo symbol. Indicator names are free-form prose ("SPX vs 7,460",
 * "30Y Yield"), so match on substrings, most specific first.
 */
const SYMBOL_RULES: Array<{ match: string[]; symbol: string }> = [
  { match: ["vix"], symbol: "^VIX" },
  { match: ["30y", "30-y", "30 y"], symbol: "^TYX" },
  { match: ["10y", "10-y", "10 y"], symbol: "^TNX" },
  { match: ["dxy", "dollar"], symbol: "DX-Y.NYB" },
  { match: ["spx", "s&p"], symbol: "^GSPC" },
  { match: ["nasdaq", "ndx"], symbol: "^NDX" },
  { match: ["brent"], symbol: "BZ=F" },
  { match: ["wti", "crude"], symbol: "CL=F" },
  { match: ["gold"], symbol: "GC=F" },
  { match: ["silver"], symbol: "SI=F" },
  { match: ["copper"], symbol: "HG=F" },
  { match: ["btc", "bitcoin"], symbol: "BTC-USD" },
  { match: ["hyg", "credit"], symbol: "HYG" },
];

export function symbolForIndicator(name: string): string | null {
  const n = name.toLowerCase();
  for (const rule of SYMBOL_RULES) {
    if (rule.match.some((m) => n.includes(m))) return rule.symbol;
  }
  return null;
}

function judge(value: number, ind: RegimeIndicator): RegimeStatus {
  // "Near" = within 2% of the trigger on the safe side.
  const NEAR = 0.02;
  if (ind.trigger_above !== undefined) {
    if (value >= ind.trigger_above) return "breached";
    if (value >= ind.trigger_above * (1 - NEAR)) return "near";
    return "holding";
  }
  if (ind.trigger_below !== undefined) {
    if (value <= ind.trigger_below) return "breached";
    if (value <= ind.trigger_below * (1 + NEAR)) return "near";
    return "holding";
  }
  return "holding";
}

/** Evaluate every indicator against live prices (best-effort, briefing fallback). */
export async function evaluateRegime(
  indicators: RegimeIndicator[],
): Promise<{ rows: LiveRegimeRow[]; breached: number }> {
  const symbols = Array.from(
    new Set(
      indicators
        .map((i) => symbolForIndicator(i.name))
        .filter((s): s is string => s !== null),
    ),
  );
  const prices = await getLivePrices(symbols);

  const rows: LiveRegimeRow[] = indicators.map((indicator) => {
    const symbol = symbolForIndicator(indicator.name);
    const live = symbol !== null && prices[symbol] !== undefined ? prices[symbol] : null;
    const judged = live ?? indicator.value;
    return {
      indicator,
      live,
      status: judge(judged, indicator),
      isLive: live !== null,
    };
  });

  return { rows, breached: rows.filter((r) => r.status === "breached").length };
}
