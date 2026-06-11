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

// ---- Crypto briefings (data/verdicts/crypto-*.json) -----------------------
// A parallel routine to markets, focused on BTC/ETH. Once-daily cadence
// (window "daily"). Shares the verdict/conviction vocabulary but carries a
// crypto-specific snapshot (BTC, ETH, total market cap, BTC dominance,
// Fear & Greed) instead of the equities snapshot.

export type CryptoSnapshotEntry = {
  level: number;
  change_pct?: number;
  as_of?: string;
};

export type CryptoSnapshot = {
  btc?: CryptoSnapshotEntry;
  eth?: CryptoSnapshotEntry;
  /** Total crypto market cap, in USD trillions. */
  total_mcap?: CryptoSnapshotEntry;
  /** BTC dominance, as a percentage. */
  btc_dominance?: CryptoSnapshotEntry;
  /** Crypto Fear & Greed Index, 0-100. */
  fear_greed?: { value: number; label?: string; as_of?: string };
};

export type CryptoVerdict = {
  routine: "crypto";
  date: string;
  window: "daily";
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
  snapshot: CryptoSnapshot;
  regime_risk: RegimeIndicator[];
  watchlist_mentions: WatchlistMention[];
  dont_buy: DontBuy[];
  trade_setups: TradeSetup[];
  bear_case: string;
  body_mdx: string;
};

export function getAllCryptoVerdicts(): CryptoVerdict[] {
  const dir = path.join(DATA_DIR, "verdicts");
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("crypto-") && f.endsWith(".json"));
  const verdicts = files
    .map((f) => readJson<CryptoVerdict>(path.join(dir, f)))
    .filter((v): v is CryptoVerdict => v !== null);
  return verdicts.sort((a, b) => {
    const t1 = `${b.date}-${b.window}`;
    const t2 = `${a.date}-${a.window}`;
    return t1.localeCompare(t2);
  });
}

export function getLatestCryptoVerdict(): CryptoVerdict | null {
  return getAllCryptoVerdicts()[0] ?? null;
}

// ---- KOSPI briefings (data/verdicts/kospi-*.json) -------------------------
// Korean equity-market routine, daily cadence (window "daily"). Shares the
// verdict/conviction vocabulary with markets and crypto, but carries a
// Korea-specific snapshot: the KOSPI and KOSDAQ indices, USD/KRW, net foreign
// flows, and the large-cap memory leaders (Samsung, SK Hynix) that drive the
// index.

export type KospiSnapshotEntry = {
  level: number;
  change_pct?: number;
  as_of?: string;
};

export type KospiSnapshot = {
  /** KOSPI composite index level. */
  kospi?: KospiSnapshotEntry;
  /** KOSDAQ index level. */
  kosdaq?: KospiSnapshotEntry;
  /** USD/KRW exchange rate (won per dollar). */
  usdkrw?: KospiSnapshotEntry;
  /** Net foreign flow into KOSPI, in KRW trillions (negative = net selling). */
  foreign_net?: { value: number; unit?: string; as_of?: string };
  /** Samsung Electronics (005930), in KRW. */
  samsung?: KospiSnapshotEntry;
  /** SK Hynix (000660), in KRW. */
  sk_hynix?: KospiSnapshotEntry;
};

export type KospiVerdict = {
  routine: "kospi";
  date: string;
  window: "daily";
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
  snapshot: KospiSnapshot;
  regime_risk: RegimeIndicator[];
  watchlist_mentions: WatchlistMention[];
  dont_buy: DontBuy[];
  trade_setups: TradeSetup[];
  bear_case: string;
  body_mdx: string;
};

export function getAllKospiVerdicts(): KospiVerdict[] {
  const dir = path.join(DATA_DIR, "verdicts");
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("kospi-") && f.endsWith(".json"));
  const verdicts = files
    .map((f) => readJson<KospiVerdict>(path.join(dir, f)))
    .filter((v): v is KospiVerdict => v !== null);
  return verdicts.sort((a, b) => {
    const t1 = `${b.date}-${b.window}`;
    const t2 = `${a.date}-${a.window}`;
    return t1.localeCompare(t2);
  });
}

export function getLatestKospiVerdict(): KospiVerdict | null {
  return getAllKospiVerdicts()[0] ?? null;
}

/**
 * Resolve the verdict a briefing's `verdict_ref` points to, dispatching on the
 * routine prefix (e.g. "markets-..." vs "crypto-..." vs "kospi-..."). Lets the
 * generic briefing-detail page show the verdict header for any routine.
 */
export function getVerdictByRef(
  ref: string,
): MarketsVerdict | CryptoVerdict | KospiVerdict | null {
  if (ref.startsWith("crypto-")) {
    return (
      getAllCryptoVerdicts().find(
        (v) => `${v.routine}-${v.date}-${v.window}` === ref,
      ) ?? null
    );
  }
  if (ref.startsWith("kospi-")) {
    return (
      getAllKospiVerdicts().find(
        (v) => `${v.routine}-${v.date}-${v.window}` === ref,
      ) ?? null
    );
  }
  return (
    getAllMarketsVerdicts().find(
      (v) => `${v.routine}-${v.date}-${v.window}` === ref,
    ) ?? null
  );
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

/**
 * Machine-readable price levels alongside the prose entry/stop/targets —
 * lets the site auto-check live prices against the plan (stop breached,
 * target hit, in entry zone) instead of waiting for a manual close.
 */
export type OpportunityLevels = {
  entry_low?: number;
  entry_high?: number;
  stop?: number;
  targets?: number[];
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
  levels?: OpportunityLevels;
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

// ---------------------------------------------------------------------------
// Curated catalyst calendar — one-off dated events the Yahoo earnings and
// FRED macro feeds can't know about (IPO pricings, geopolitical deadlines,
// product launches). Maintained by the daily markets routine alongside the
// briefings; the website cross-links each event to open opportunities by
// ticker.
// ---------------------------------------------------------------------------

export type CalendarEvent = {
  date: string; // YYYY-MM-DD
  label: string;
  /** Short code chip, e.g. "IPO", "FOMC", "GEO", "HOLIDAY". */
  kind: string;
  /** Eastern-time clock string when one exists, e.g. "8:30 AM". */
  time_et?: string;
  /** Tickers whose open opportunities hinge on this event. */
  tickers?: string[];
  note?: string;
};

export function getCalendarEvents(): CalendarEvent[] {
  const file = path.join(DATA_DIR, "calendar.json");
  const parsed = readJson<{ events: CalendarEvent[] }>(file);
  if (!parsed?.events) return [];
  return [...parsed.events].sort((a, b) => a.date.localeCompare(b.date));
}
