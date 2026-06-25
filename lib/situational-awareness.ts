import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Situational Awareness LP — Leopold Aschenbrenner's AI-buildout hedge fund.
// We track the fund off its public SEC 13F filings (the only disclosed window
// into the book) so the user can shadow / copy-trade the directional longs.
//
// Data lives at data/situational-awareness/portfolio.json — one snapshot per
// quarter, refreshed when a new 13F is filed (~45 days after quarter-end).
// Every field is null-safe; a missing file degrades to a "no data" state rather
// than crashing the page. See [[project_daily_asset_dossiers]] for the sibling
// daily-dossier pattern.
// ---------------------------------------------------------------------------

export type PositionSide = "long" | "call" | "put";

/** "What is the AI buildout's binding constraint?" — the fund's answer, by bucket. */
export type Theme = "power" | "compute" | "miners" | "memory" | "semis";

export type Position = {
  ticker: string | null;
  name: string;
  side: PositionSide;
  /** USD. For options this is the NOTIONAL value of the underlying, not premium. */
  value: number;
  shares: number;
  theme: Theme;
  /** True if this is part of the clean directional long book worth shadowing. */
  copy: boolean;
};

export type Filing = {
  report: string;
  as_of: string;
  filed: string;
  positions: number;
  value: number;
};

export type Portfolio = {
  fund: string;
  manager: string;
  as_of: string;
  filed: string;
  source: string;
  source_url: string;
  total_value: number;
  long_count: number;
  caveats: string[];
  positions: Position[];
  filings: Filing[];
};

/** One line in a derived view: a ticker with its share of the book + weight. */
export type Holding = {
  ticker: string | null;
  name: string;
  theme: Theme;
  /** Combined long + call notional (the copy book) or put notional (short book). */
  value: number;
  /** % of total 13F value. */
  weight: number;
  /** Which instrument types make up this line, e.g. ["long","call"]. */
  sides: PositionSide[];
};

export type ThemeSlice = { theme: Theme; label: string; value: number; weight: number };

export const THEME_LABELS: Record<Theme, string> = {
  power: "Power & energy",
  compute: "AI compute / datacenter",
  miners: "Bitcoin miners → AI",
  memory: "Memory & storage",
  semis: "Semiconductors",
};

const DATA_FILE = path.resolve(
  process.cwd(),
  "data/situational-awareness/portfolio.json",
);

export function getSituationalAwarenessPortfolio(): Portfolio | null {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as Portfolio;
  } catch {
    return null;
  }
}

// Collapse multiple instrument lines on the same name into one holding, summing
// notional and recording which sides contributed. Used so e.g. Bloom Energy's
// common stock + calls show as a single "BE" line in the copy book.
function collapse(positions: Position[], total: number): Holding[] {
  const byKey = new Map<string, Holding>();
  for (const p of positions) {
    const key = p.ticker ?? p.name;
    const existing = byKey.get(key);
    if (existing) {
      existing.value += p.value;
      if (!existing.sides.includes(p.side)) existing.sides.push(p.side);
    } else {
      byKey.set(key, {
        ticker: p.ticker,
        name: p.name,
        theme: p.theme,
        value: p.value,
        weight: 0,
        sides: [p.side],
      });
    }
  }
  const out = [...byKey.values()];
  for (const h of out) h.weight = total ? (h.value / total) * 100 : 0;
  return out.sort((a, b) => b.value - a.value);
}

/**
 * The "copy book": the clean directional longs (common + calls) on the
 * picks-and-shovels names — power, miners, compute, memory. This is the part a
 * shadow-trader can actually replicate; the put lines are excluded because their
 * 13F notional overstates real exposure and several are spread against longs.
 */
export function getCopyBook(p: Portfolio): Holding[] {
  return collapse(
    p.positions.filter((x) => x.copy && (x.side === "long" || x.side === "call")),
    p.total_value,
  );
}

/** The bearish put book (notional), largest first — context, not a copy target. */
export function getPutBook(p: Portfolio): Holding[] {
  return collapse(
    p.positions.filter((x) => x.side === "put"),
    p.total_value,
  );
}

/** Theme allocation of the copy book, largest first. */
export function getThemeBreakdown(p: Portfolio): ThemeSlice[] {
  const book = getCopyBook(p);
  const totalCopy = book.reduce((s, h) => s + h.value, 0);
  const byTheme = new Map<Theme, number>();
  for (const h of book) byTheme.set(h.theme, (byTheme.get(h.theme) ?? 0) + h.value);
  return [...byTheme.entries()]
    .map(([theme, value]) => ({
      theme,
      label: THEME_LABELS[theme],
      value,
      weight: totalCopy ? (value / totalCopy) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

/** Compact USD formatter: $1.57B, $878M, $13.1M. */
export function fmtUsd(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
}
