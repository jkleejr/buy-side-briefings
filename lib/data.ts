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
      if (verdictRef) {
        const verdictPath = path.join(verdictsDir, `${verdictRef}.json`);
        const v = readJson<{ generated_at?: string }>(verdictPath);
        if (v?.generated_at) generatedAt = v.generated_at;
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
