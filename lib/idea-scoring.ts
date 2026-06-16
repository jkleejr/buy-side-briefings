import { getAllShortTermIdeaSets, type ShortTermIdea } from "./short-term-ideas";
import { getAllLongTermIdeaSets, type LongTermIdea } from "./long-term-ideas";
import { getDailyCloses, type DailyClose } from "./markets";
import { monthsBackFor } from "./verdict-scoring";

// ---------------------------------------------------------------------------
// Idea track record. Every dated short/long-term idea set is a snapshot; this
// scores each idea against the price move since it was posted. Direction-
// adjusted: a BUY is right when price rose, a SELL (avoid) when it fell, WATCH
// is informational (not graded). Prices from the same Yahoo daily feed as the
// charts — so the record updates itself as days pass and new snapshots land.
// ---------------------------------------------------------------------------

export type IdeaKind = "short" | "long";
export type AnyIdea = ShortTermIdea | LongTermIdea;

// Map an idea ticker to a Yahoo symbol (most are already valid; a few aren't).
const YF: Record<string, string> = {
  "SK HYNIX": "000660.KS",
  BTC: "BTC-USD",
  ETH: "ETH-USD",
};
function yf(ticker: string): string {
  return YF[ticker] ?? ticker;
}

export type ScoredIdea = {
  kind: IdeaKind;
  /** Date the idea was posted (its set's date). */
  date: string;
  ticker: string;
  name: string;
  category: AnyIdea["category"];
  lean: AnyIdea["lean"];
  conviction: AnyIdea["conviction"];
  timeframe: string;
  base_close: number | null;
  last_close: number | null;
  /** Raw price return since posting, percent. */
  return_pct: number | null;
  /** Direction-adjusted return: BUY as-is, SELL negated, WATCH null. */
  adj_return_pct: number | null;
  /** Calendar days the idea has been live. */
  days_held: number;
  /** Right/wrong by direction-adjusted return. Null for WATCH or still-pending. */
  right: boolean | null;
  /** True until there's at least one day of price action to grade. */
  pending: boolean;
};

function closeAtOrAfter(series: DailyClose[], date: string): { close: number; date: string } | null {
  for (const row of series) {
    if (row.date >= date) return { close: row.close, date: row.date };
  }
  return null;
}

function daysBetween(a: string, b: string): number {
  return Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000));
}

type RawIdea = { kind: IdeaKind; date: string; idea: AnyIdea };

function scoreOne(raw: RawIdea, series: DailyClose[]): ScoredIdea {
  const base = closeAtOrAfter(series, raw.date);
  const last = series.length ? series[series.length - 1] : null;
  const return_pct =
    base && last && base.close > 0 ? ((last.close - base.close) / base.close) * 100 : null;
  const adj_return_pct =
    return_pct === null
      ? null
      : raw.idea.lean === "buy"
        ? return_pct
        : raw.idea.lean === "sell"
          ? -return_pct
          : null; // watch
  const days_held = base && last ? daysBetween(base.date, last.date) : 0;
  const pending = base === null || last === null || days_held < 1;
  const right = pending || adj_return_pct === null ? null : adj_return_pct > 0;
  return {
    kind: raw.kind,
    date: raw.date,
    ticker: raw.idea.ticker,
    name: raw.idea.name,
    category: raw.idea.category,
    lean: raw.idea.lean,
    conviction: raw.idea.conviction,
    timeframe: raw.idea.timeframe,
    base_close: base?.close ?? null,
    last_close: last?.close ?? null,
    return_pct,
    adj_return_pct,
    days_held,
    right,
    pending,
  };
}

/**
 * Score every short- and long-term idea ever posted against the price move
 * since. One Yahoo daily-close fetch per unique symbol. Newest idea first.
 */
export async function scoreIdeas(): Promise<{ short: ScoredIdea[]; long: ScoredIdea[] }> {
  const raws: RawIdea[] = [
    ...getAllShortTermIdeaSets().flatMap((s) =>
      s.ideas.map((idea) => ({ kind: "short" as const, date: s.date, idea })),
    ),
    ...getAllLongTermIdeaSets().flatMap((s) =>
      s.ideas.map((idea) => ({ kind: "long" as const, date: s.date, idea })),
    ),
  ];
  if (raws.length === 0) return { short: [], long: [] };

  const earliest = raws.reduce((min, r) => (r.date < min ? r.date : min), raws[0].date);
  const monthsBack = monthsBackFor(earliest);
  const symbols = [...new Set(raws.map((r) => yf(r.idea.ticker)))];
  const seriesBySym: Record<string, DailyClose[]> = {};
  await Promise.all(
    symbols.map(async (sym) => {
      seriesBySym[sym] = await getDailyCloses(sym, monthsBack);
    }),
  );

  const scored = raws.map((r) => scoreOne(r, seriesBySym[yf(r.idea.ticker)] ?? []));
  const byDateDesc = (a: ScoredIdea, b: ScoredIdea) =>
    b.date.localeCompare(a.date) || a.ticker.localeCompare(b.ticker);
  return {
    short: scored.filter((s) => s.kind === "short").sort(byDateDesc),
    long: scored.filter((s) => s.kind === "long").sort(byDateDesc),
  };
}

export type IdeaRecordStats = {
  total: number;
  /** Directional ideas (buy/sell) with a graded outcome. */
  graded: number;
  wins: number;
  losses: number;
  hit_pct: number | null;
  /** Average direction-adjusted return over graded ideas. */
  avg_adj_return_pct: number | null;
  watching: number;
  pending: number;
  best: ScoredIdea | null;
  worst: ScoredIdea | null;
};

export function aggregateIdeaRecord(scored: ScoredIdea[]): IdeaRecordStats {
  let wins = 0;
  let losses = 0;
  let watching = 0;
  let pending = 0;
  let sumAdj = 0;
  let gradedN = 0;
  let best: ScoredIdea | null = null;
  let worst: ScoredIdea | null = null;

  for (const s of scored) {
    if (s.lean === "watch") watching += 1;
    if (s.right === null) {
      if (s.lean !== "watch") pending += 1;
      continue;
    }
    gradedN += 1;
    if (s.right) wins += 1;
    else losses += 1;
    if (s.adj_return_pct !== null) {
      sumAdj += s.adj_return_pct;
      if (best === null || s.adj_return_pct > (best.adj_return_pct ?? -Infinity)) best = s;
      if (worst === null || s.adj_return_pct < (worst.adj_return_pct ?? Infinity)) worst = s;
    }
  }

  return {
    total: scored.length,
    graded: gradedN,
    wins,
    losses,
    hit_pct: gradedN > 0 ? (wins / gradedN) * 100 : null,
    avg_adj_return_pct: gradedN > 0 ? sumAdj / gradedN : null,
    watching,
    pending,
    best,
    worst,
  };
}
