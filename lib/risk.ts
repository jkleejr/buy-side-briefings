import type { Opportunity } from "@/lib/data";

// ---------------------------------------------------------------------------
// Open-book risk: if every open idea's stop hits, how much does the account
// bleed? Pure plan math — risk per idea is position size × distance from the
// entry midpoint to the stop, exactly as published. No live data needed, so
// the numbers are stable and auditable against the journal.
// ---------------------------------------------------------------------------

export type RiskRow = {
  id: string;
  ticker: string;
  direction: Opportunity["direction"];
  weight_pct: number;
  /** % loss on the position if stopped from the entry midpoint. */
  stop_distance_pct: number | null;
  /** Contribution to the account if stopped: weight × distance (%). */
  risk_pct: number | null;
};

export type ThemeWeight = { tag: string; weight_pct: number; count: number };

export type OpenRisk = {
  rows: RiskRow[];
  /** Sum of risk_pct across sized ideas — the "max bleed" if every stop hits. */
  max_bleed_pct: number;
  /** Ideas with no computable stop distance (missing levels). */
  unsized: number;
  gross_long_pct: number;
  gross_short_pct: number;
  net_pct: number;
  /** Largest combined position weights by tag — concentration check. */
  themes: ThemeWeight[];
};

function isLongish(d: Opportunity["direction"]): boolean {
  return d === "long" || d === "long_vol";
}

function isShortish(d: Opportunity["direction"]): boolean {
  return d === "short" || d === "short_vol";
}

export function computeOpenRisk(opportunities: Opportunity[]): OpenRisk {
  const open = opportunities.filter(
    (o) => o.status === "active" || o.status === "triggered",
  );

  const rows: RiskRow[] = open.map((o) => {
    const lv = o.levels;
    let dist: number | null = null;
    if (
      lv?.stop !== undefined &&
      lv.entry_low !== undefined &&
      lv.entry_high !== undefined
    ) {
      const mid = (lv.entry_low + lv.entry_high) / 2;
      if (mid > 0) dist = (Math.abs(mid - lv.stop) / mid) * 100;
    }
    return {
      id: o.id,
      ticker: o.ticker,
      direction: o.direction,
      weight_pct: o.position_size_pct,
      stop_distance_pct: dist,
      risk_pct: dist === null ? null : (o.position_size_pct * dist) / 100,
    };
  });

  const maxBleed = rows.reduce((sum, r) => sum + (r.risk_pct ?? 0), 0);
  const grossLong = open
    .filter((o) => isLongish(o.direction))
    .reduce((s, o) => s + o.position_size_pct, 0);
  const grossShort = open
    .filter((o) => isShortish(o.direction))
    .reduce((s, o) => s + o.position_size_pct, 0);

  const themeMap = new Map<string, ThemeWeight>();
  for (const o of open) {
    for (const tag of o.tags) {
      const t = themeMap.get(tag) ?? { tag, weight_pct: 0, count: 0 };
      t.weight_pct += o.position_size_pct;
      t.count += 1;
      themeMap.set(tag, t);
    }
  }
  // Concentration only matters where a theme spans multiple ideas.
  const themes = [...themeMap.values()]
    .filter((t) => t.count >= 2)
    .sort((a, b) => b.weight_pct - a.weight_pct)
    .slice(0, 5);

  return {
    rows: rows.sort((a, b) => (b.risk_pct ?? 0) - (a.risk_pct ?? 0)),
    max_bleed_pct: maxBleed,
    unsized: rows.filter((r) => r.risk_pct === null).length,
    gross_long_pct: grossLong,
    gross_short_pct: grossShort,
    net_pct: grossLong - grossShort,
    themes,
  };
}
