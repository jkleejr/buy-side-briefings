import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DATA_DIR = path.resolve(process.cwd(), "data");

export type VerdictCode = "buy" | "hold" | "step_aside" | "bearish";

export type SupportingPoint = { label: string; url?: string };

export type SnapshotEntry = {
  level: number;
  change_pct?: number;
  change_bps?: number;
  as_of?: string;
};

export type RegimeIndicator = {
  name: string;
  value: number;
  trigger_above?: number;
  trigger_below?: number;
  unit?: string;
};

export type WatchlistMention = {
  ticker: string;
  note: string;
  sentiment: "positive" | "neutral" | "negative";
};

export type DontBuy = {
  ticker: string;
  reason: string;
  better_entry: string;
};

export type TradeSetup = {
  asset: string;
  direction: "long" | "short" | "pair" | "hedge";
  thesis: string;
  entry: string;
  invalidation: string;
  conviction: "low" | "medium" | "high";
  horizon: string;
};

export type MarketsVerdict = {
  routine: "markets";
  date: string;
  window: "morning" | "afternoon" | "night";
  generated_at: string;
  is_seed?: boolean;
  verdict: {
    code: VerdictCode;
    emoji: string;
    label: string;
    conviction: "low" | "medium" | "high";
    rationale_short: string;
    supporting_data: SupportingPoint[];
  };
  snapshot: {
    sp500?: SnapshotEntry;
    nasdaq?: SnapshotEntry;
    vix?: SnapshotEntry;
    ust10y?: SnapshotEntry;
    dxy?: SnapshotEntry;
  };
  regime_risk: RegimeIndicator[];
  watchlist_mentions: WatchlistMention[];
  dont_buy: DontBuy[];
  trade_setups: TradeSetup[];
  bear_case: string;
  body_mdx: string;
};

export type BriefingMeta = {
  slug: string;
  routine: string;
  date: string;
  window?: string;
  title: string;
  verdict_ref?: string;
  is_seed?: boolean;
  /** ISO timestamp the linked verdict was generated, if known. */
  generated_at?: string;
  /** Verdict code from the linked verdict JSON, if any. */
  verdict_code?: VerdictCode;
  /** Short rationale from the linked verdict — useful for client-side search. */
  verdict_rationale?: string;
};

export type Briefing = BriefingMeta & {
  body: string;
};

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

export function getAllMarketsVerdicts(): MarketsVerdict[] {
  const dir = path.join(DATA_DIR, "verdicts");
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("markets-") && f.endsWith(".json"));
  const verdicts = files
    .map((f) => readJson<MarketsVerdict>(path.join(dir, f)))
    .filter((v): v is MarketsVerdict => v !== null);
  return verdicts.sort((a, b) => {
    const t1 = `${b.date}-${b.window}`;
    const t2 = `${a.date}-${a.window}`;
    return t1.localeCompare(t2);
  });
}

export function getLatestMarketsVerdict(): MarketsVerdict | null {
  const all = getAllMarketsVerdicts();
  return all[0] ?? null;
}

export function getAllBriefings(): BriefingMeta[] {
  const briefingsDir = path.join(DATA_DIR, "briefings");
  if (!fs.existsSync(briefingsDir)) return [];
  const routines = fs.readdirSync(briefingsDir).filter((d) => {
    return fs.statSync(path.join(briefingsDir, d)).isDirectory();
  });
  const verdictsDir = path.join(DATA_DIR, "verdicts");
  const all: BriefingMeta[] = [];
  for (const routine of routines) {
    const dir = path.join(briefingsDir, routine);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));
    for (const file of files) {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data } = matter(raw);
      const verdictRef: string | undefined = data.verdict_ref;
      let generatedAt: string | undefined;
      let verdictCode: VerdictCode | undefined;
      let verdictRationale: string | undefined;
      if (verdictRef) {
        const verdictPath = path.join(verdictsDir, `${verdictRef}.json`);
        const v = readJson<{
          generated_at?: string;
          verdict?: { code?: VerdictCode; rationale_short?: string };
        }>(verdictPath);
        if (v?.generated_at) generatedAt = v.generated_at;
        if (v?.verdict?.code) verdictCode = v.verdict.code;
        if (v?.verdict?.rationale_short) verdictRationale = v.verdict.rationale_short;
      }
      all.push({
        slug,
        routine,
        date: normalizeDate(data.date),
        window: data.window,
        title: data.title ?? `${routine} ${slug}`,
        verdict_ref: verdictRef,
        is_seed: data.is_seed,
        generated_at: generatedAt,
        verdict_code: verdictCode,
        verdict_rationale: verdictRationale,
      });
    }
  }
  return all.sort((a, b) => {
    const aKey = `${a.date}-${a.window ?? ""}`;
    const bKey = `${b.date}-${b.window ?? ""}`;
    return bKey.localeCompare(aKey);
  });
}

export function getBriefing(routine: string, slug: string): Briefing | null {
  const file = path.join(DATA_DIR, "briefings", routine, `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf-8");
  const { data, content } = matter(raw);
  return {
    slug,
    routine,
    date: normalizeDate(data.date),
    window: data.window,
    title: data.title ?? `${routine} ${slug}`,
    verdict_ref: data.verdict_ref,
    is_seed: data.is_seed,
    body: content,
  };
}

// ---- Watchlist (user-editable file at data/watchlist.json) ----------------

export type WatchlistEntry = {
  symbol: string;
  label: string;
  /** Optional free-form personal note shown beside the row. */
  note?: string;
};

/**
 * Read the user's watchlist from data/watchlist.json. Returns an empty array
 * if the file is missing or malformed (clean degradation, no crash).
 */
export function getWatchlist(): WatchlistEntry[] {
  const file = path.join(DATA_DIR, "watchlist.json");
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is WatchlistEntry =>
          typeof e === "object" &&
          e !== null &&
          typeof (e as WatchlistEntry).symbol === "string" &&
          typeof (e as WatchlistEntry).label === "string",
      )
      .map((e) => ({ symbol: e.symbol, label: e.label, note: e.note }));
  } catch {
    return [];
  }
}

export type RecentMention = {
  ticker: string;
  date: string;
  window?: string;
  routine: string;
  note: string;
  sentiment: "positive" | "neutral" | "negative";
  verdict_code: VerdictCode;
  verdict_label: string;
};

/**
 * For each ticker in the watchlist, find the most recent verdict that mentions
 * it (in either watchlist_mentions or dont_buy). Returns a map keyed by ticker
 * so the page can look up O(1).
 */
export function getRecentMentionsByTicker(
  tickers: string[],
): Map<string, RecentMention> {
  const map = new Map<string, RecentMention>();
  if (tickers.length === 0) return map;
  const wanted = new Set(tickers);
  // getAllMarketsVerdicts already returns newest-first.
  for (const v of getAllMarketsVerdicts()) {
    for (const m of v.watchlist_mentions ?? []) {
      if (!wanted.has(m.ticker) || map.has(m.ticker)) continue;
      map.set(m.ticker, {
        ticker: m.ticker,
        date: v.date,
        window: v.window,
        routine: v.routine,
        note: m.note,
        sentiment: m.sentiment,
        verdict_code: v.verdict.code,
        verdict_label: v.verdict.label,
      });
    }
    for (const d of v.dont_buy ?? []) {
      if (!wanted.has(d.ticker) || map.has(d.ticker)) continue;
      map.set(d.ticker, {
        ticker: d.ticker,
        date: v.date,
        window: v.window,
        routine: v.routine,
        note: `Don't buy — ${d.reason}. Better entry ${d.better_entry}.`,
        sentiment: "negative",
        verdict_code: v.verdict.code,
        verdict_label: v.verdict.label,
      });
    }
    if (map.size === wanted.size) break; // every ticker matched
  }
  return map;
}

// ---- Opportunities (data/opportunities/*.json) ----------------------------

export type OpportunityDirection = "long" | "short" | "long_vol" | "short_vol" | "pair";
export type OpportunityConviction = "low" | "medium" | "high";
export type OpportunityAssetClass =
  | "equity"
  | "etf"
  | "crypto"
  | "commodity"
  | "options"
  | "fx"
  | "fixed_income"
  | "pair";
export type OpportunityCategory =
  | "momentum"
  | "value"
  | "catalyst"
  | "contrarian"
  | "options"
  | "pair_trade"
  | "macro"
  | "sector"
  | "event"
  | "thematic";
export type OpportunityStatus =
  | "active"
  | "triggered"
  | "stopped_out"
  | "target_hit"
  | "expired"
  | "thesis_broken";

export type OpportunityOutcome = {
  closed_at: string;
  final_price: number;
  return_pct: number;
  outcome_label: string;
  note?: string;
};

export type Opportunity = {
  id: string;
  title: string;
  ticker: string;
  asset_class: OpportunityAssetClass;
  category: OpportunityCategory;
  direction: OpportunityDirection;
  conviction: OpportunityConviction;
  time_horizon: string;
  current_price?: number;
  entry: string;
  stop_loss: string;
  targets: string[];
  risk_reward: string;
  position_size_pct: number;
  catalyst: string;
  thesis: string;
  bull_case: string;
  bear_case: string;
  invalidation: string;
  sources: { label: string; url: string }[];
  created_at: string;
  expires_at?: string;
  status: OpportunityStatus;
  tags: string[];
  outcome?: OpportunityOutcome;
};

// Daily snapshot of the opportunities slate — written by the morning routine.
export type OpportunitySnapshot = {
  date: string;
  generated_at: string;
  summary: string;
  active_ids: string[];
  new_today_ids: string[];
  closed_today: Array<{
    id: string;
    status: OpportunityStatus;
    final_price?: number;
    return_pct?: number;
    note?: string;
  }>;
  current_prices?: Record<string, number>;
};

export function getAllOpportunities(): Opportunity[] {
  const dir = path.join(DATA_DIR, "opportunities");
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const list = files
    .map((f) => readJson<Opportunity>(path.join(dir, f)))
    .filter((o): o is Opportunity => o !== null);
  return list.sort((a, b) => {
    // Active first, then by conviction (high > med > low), then by created_at desc
    const statusRank = (s: OpportunityStatus) => (s === "active" ? 0 : 1);
    const sa = statusRank(a.status) - statusRank(b.status);
    if (sa !== 0) return sa;
    const convRank = (c: OpportunityConviction) =>
      c === "high" ? 0 : c === "medium" ? 1 : 2;
    const cb = convRank(a.conviction) - convRank(b.conviction);
    if (cb !== 0) return cb;
    return b.created_at.localeCompare(a.created_at);
  });
}

export function getOpportunity(id: string): Opportunity | null {
  const file = path.join(DATA_DIR, "opportunities", `${id}.json`);
  return readJson<Opportunity>(file);
}

export function getAllOpportunitySnapshots(): OpportunitySnapshot[] {
  const dir = path.join(DATA_DIR, "opportunities-snapshots");
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const list = files
    .map((f) => readJson<OpportunitySnapshot>(path.join(dir, f)))
    .filter((s): s is OpportunitySnapshot => s !== null);
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

export function getOpportunitySnapshot(date: string): OpportunitySnapshot | null {
  const file = path.join(DATA_DIR, "opportunities-snapshots", `${date}.json`);
  return readJson<OpportunitySnapshot>(file);
}

// Aggregate opportunity stats — win rate, average return, counts.
export function getOpportunityStats() {
  const all = getAllOpportunities();
  const active = all.filter((o) => o.status === "active").length;
  const closed = all.filter((o) =>
    ["target_hit", "stopped_out", "expired", "thesis_broken"].includes(o.status),
  );
  const wins = closed.filter((o) => o.status === "target_hit").length;
  const losses = closed.filter(
    (o) => o.status === "stopped_out" || o.status === "thesis_broken",
  ).length;
  const expired = closed.filter((o) => o.status === "expired").length;
  const returns = closed
    .map((o) => o.outcome?.return_pct)
    .filter((r): r is number => typeof r === "number");
  const avgReturn =
    returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : null;
  const hitRate =
    wins + losses > 0 ? (wins / (wins + losses)) * 100 : null;
  return {
    total: all.length,
    active,
    closed: closed.length,
    wins,
    losses,
    expired,
    hit_rate_pct: hitRate,
    avg_return_pct: avgReturn,
  };
}

function normalizeDate(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "string") return value;
  return "";
}
