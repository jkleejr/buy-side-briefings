import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { verdictHeadline as headlineFor } from "@/lib/verdict-headline";

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
  /** Free-form narrative read of where this indicator sits vs. its trigger. */
  status?: string;
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
    /**
     * Retired 2026-09-04: the routines no longer write it. Kept optional so the
     * verdicts on disk that still carry one keep parsing. Nothing reads it —
     * the homepage's dead `sentiment`/`code` view fields went with it.
     */
    code?: VerdictCode;
    emoji: string;
    label: string;
    /** Plain-English news headline (no prices/percentages/jargon) for the home
     *  page title. Optional on older verdicts — the UI derives one from label. */
    headline?: string;
    conviction: "low" | "medium" | "high";
    /** How long the call is meant to hold, e.g. "1-2 weeks". Optional on older
     *  verdicts — use verdictHorizon() for a display string with a fallback. */
    horizon?: string;
    rationale_short: string;
    /**
     * The phone lede: 2-3 sentences that carry the report's actual insight and
     * stand on their own. Not a shorter `rationale_short` — it is written to be
     * the whole read for someone who sees only these sentences.
     *
     * Optional. Verdicts written before 2026-09-03 don't have it, and the
     * homepage falls back to slicing `rationale_short` on a sentence boundary
     * (see mobileLedeFrom in lib/home-terminal.ts), which produces an accurate
     * opening but not a summary.
     */
    lede_short?: string;
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
  /** Retired 2026-09-03: routines no longer write it; never rendered. */
  bear_case?: string;
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
  /**
   * The verdict's plain-English headline — the one-line "what you need to know"
   * the routines write for the home page. Surfaced in the archive so a row
   * says what the briefing is about, not just when it was published.
   */
  verdict_headline?: string;
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

// Some generator runs write supporting_data at the file's top level instead of
// inside verdict — accept both so key points/wire don't silently vanish.
function normalizeMarketsVerdict(v: MarketsVerdict): MarketsVerdict {
  const top = (v as { supporting_data?: SupportingPoint[] }).supporting_data;
  if (!v.verdict.supporting_data?.length && top?.length) {
    v.verdict.supporting_data = top;
  }
  return v;
}

export function getAllMarketsVerdicts(): MarketsVerdict[] {
  const dir = path.join(DATA_DIR, "verdicts");
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("markets-") && f.endsWith(".json"));
  const verdicts = files
    .map((f) => readJson<MarketsVerdict>(path.join(dir, f)))
    .filter((v): v is MarketsVerdict => v !== null)
    .map(normalizeMarketsVerdict);
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
  /** Retired 2026-09-03: routines no longer write it; never rendered. */
  bear_case?: string;
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
  /** Retired 2026-09-03: routines no longer write it; never rendered. */
  bear_case?: string;
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
  const verdictsDir = path.join(DATA_DIR, "verdicts");
  const byKey = new Map<string, BriefingMeta>();

  // 1. Authored .mdx briefings — the richest editions, source of truth for
  //    title/window when both a file and its verdict exist.
  const briefingsDir = path.join(DATA_DIR, "briefings");
  if (fs.existsSync(briefingsDir)) {
    const routines = fs
      .readdirSync(briefingsDir)
      .filter((d) => fs.statSync(path.join(briefingsDir, d)).isDirectory());
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
        let verdictHeadline: string | undefined;
        if (verdictRef) {
          const v = readJson<{
            generated_at?: string;
            verdict?: {
              code?: VerdictCode;
              rationale_short?: string;
              headline?: string;
              label?: string;
            };
          }>(path.join(verdictsDir, `${verdictRef}.json`));
          if (v?.generated_at) generatedAt = v.generated_at;
          if (v?.verdict?.code) verdictCode = v.verdict.code;
          if (v?.verdict?.rationale_short) verdictRationale = v.verdict.rationale_short;
          verdictHeadline = headlineFor(v?.verdict);
        }
        byKey.set(`${routine}/${slug}`, {
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
          verdict_headline: verdictHeadline,
        });
      }
    }
  }

  // 2. Verdict-only days — the automation ships a verdict JSON but no .mdx.
  //    Surface them as briefings too (the page synthesizes a body from the
  //    verdict) so the homepage links resolve and the archive stays complete.
  const verdicts = [
    ...getAllMarketsVerdicts(),
    ...getAllCryptoVerdicts(),
    ...getAllKospiVerdicts(),
  ];
  for (const v of verdicts) {
    const slug = `${v.date}-${v.window}`;
    const key = `${v.routine}/${slug}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      slug,
      routine: v.routine,
      date: v.date,
      window: v.window,
      title: `${v.routine} ${slug}`,
      verdict_ref: `${v.routine}-${slug}`,
      is_seed: v.is_seed,
      generated_at: v.generated_at,
      verdict_code: v.verdict.code,
      verdict_rationale: v.verdict.rationale_short,
      verdict_headline: headlineFor(v.verdict),
    });
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const aKey = `${a.date}-${a.window ?? ""}`;
    const bKey = `${b.date}-${b.window ?? ""}`;
    return bKey.localeCompare(aKey);
  });
}

/**
 * Sections retired from the briefings, matched by the name that opens their
 * `##` heading (the leading emoji is optional, the trailing parenthetical
 * varies edition to edition):
 *
 *   - Regime Risk Indicators / Regime Status — the trigger table, retired
 *     2026-08-03.
 *   - The Other Side / Bear Case — the counter-argument writeup, retired
 *     2026-08-03. Both names are the same section; it was renamed mid-2026.
 *
 * Requiring the name to OPEN the heading is what keeps the near-misses in:
 * "## 🎯 Verdict — … Regime Unresolved" and "## 🪞 Morning Call Grade — …
 * Exceeded Bear Case" are ordinary sections that merely mention the words.
 */
const RETIRED_SECTIONS =
  /^##\s+(?:\S+\s+)?(?:Regime\s+(?:Risk|Status)|The\s+Other\s+Side|Bear\s+Case)\b/u;

/**
 * Drop the retired sections from an authored body. The archive keeps the text
 * on disk; the site just stops rendering it.
 */
function stripRetiredSections(body: string): string {
  const isHead = (l: string) => /^##[^#]/.test(l);
  const out: string[] = [];
  let dropping = false;
  for (const line of body.split("\n")) {
    if (isHead(line)) dropping = RETIRED_SECTIONS.test(line);
    if (!dropping) out.push(line);
  }
  return out.join("\n");
}

export function getBriefing(routine: string, slug: string): Briefing | null {
  const file = path.join(DATA_DIR, "briefings", routine, `${slug}.mdx`);
  if (fs.existsSync(file)) {
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
      body: stripRetiredSections(content),
    };
  }
  // No hand-written .mdx on disk. Under verdict-only automation most days ship
  // just a verdict JSON, so synthesize a readable briefing from its structured
  // fields — otherwise the homepage "Full briefing" link 404s.
  const ref = `${routine}-${slug}`;
  const v = getVerdictByRef(ref);
  if (!v) return null;
  return {
    slug,
    routine,
    date: v.date,
    window: v.window,
    title: `${routine} ${slug}`,
    verdict_ref: ref,
    is_seed: v.is_seed,
    body: synthesizeBriefingBody(v),
  };
}

/** Fields the briefing synthesizer needs — the shared subset of every verdict. */
type SynthesizableVerdict = {
  date: string;
  window: string;
  verdict: {
    emoji?: string;
    label: string;
    rationale_short: string;
    supporting_data?: SupportingPoint[];
  };
  trade_setups?: TradeSetup[];
  dont_buy?: DontBuy[];
};

/**
 * Render a verdict's structured fields as briefing markdown. Used only as the
 * fallback body when a day has a verdict but no authored .mdx. Mirrors the shape
 * of a real briefing (the read → situations worth watching) so the page reads
 * consistently with hand-written editions.
 */
function synthesizeBriefingBody(v: SynthesizableVerdict): string {
  const out: string[] = [];
  // The page header now carries the stance, standfirst and regime chips, so the
  // body opens straight into the reasoning — no repeated run-on verdict label.
  out.push(
    `> Auto-generated from the ${v.date} ${v.window} market verdict.`,
    "",
    `## The read`,
    "",
    v.verdict.rationale_short,
  );

  // Supporting points are NOT synthesized into the body — the briefing page's
  // evidence tier renders them (with sources) above the full read, so writing
  // them here would print every point twice.

  // Situations, not positions. The JSON still carries direction/conviction/entry
  // because other parts of the site read the shape, but the page describes what
  // is happening and the levels that define it — the reader decides whether to
  // act on it. See the house rule in prompts/markets-website.md.
  const setups = v.trade_setups ?? [];
  if (setups.length) {
    out.push("", "## Situations worth watching");
    for (const s of setups) {
      out.push(
        "",
        `### ${s.asset} — ${s.horizon}`,
        "",
        s.thesis,
        "",
        `**Levels in play:** ${s.entry}`,
        "",
        `**What would break it:** ${s.invalidation}`,
      );
    }
  }

  // No bear-case section — retired 2026-08-03, same as in the authored bodies.
  // `bear_case` stopped being written on 2026-09-03; older files still carry it.

  return out.join("\n");
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
// briefings.
// ---------------------------------------------------------------------------

export type CalendarEvent = {
  date: string; // YYYY-MM-DD
  label: string;
  /** Short code chip, e.g. "IPO", "FOMC", "GEO", "HOLIDAY". */
  kind: string;
  /** Eastern-time clock string when one exists, e.g. "8:30 AM". */
  time_et?: string;
  /** Tickers the event bears directly on, for cross-linking. */
  tickers?: string[];
  note?: string;
  /**
   * Where the event came from. "catalyst" is the routine's hand-written
   * calendar — the Kimi K3 / AI Day / lock-up material that is the point of the
   * strip. The rest are mechanical feeds merged in to fill the gaps.
   */
  source?: "catalyst" | "fomc" | "boj" | "macro" | "earnings";
};

export function getCalendarEvents(): CalendarEvent[] {
  const file = path.join(DATA_DIR, "calendar.json");
  const parsed = readJson<{ events: CalendarEvent[] }>(file);
  if (!parsed?.events) return [];
  return [...parsed.events].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Past catalysts. calendar.json is rewritten daily and pruned of anything
 * before today, so history only survives here — backfilled from that file's
 * git revisions and appended to as events age out. Lets the homepage timeline
 * scroll backwards instead of starting abruptly at today.
 */
export function getCalendarArchive(): CalendarEvent[] {
  const file = path.join(DATA_DIR, "calendar-archive.json");
  const parsed = readJson<{ events: CalendarEvent[] }>(file);
  if (!parsed?.events) return [];
  return [...parsed.events].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * The full catalyst timeline — archived past plus upcoming, de-duped on the
 * boundary (an event can sit in both files the day it ages out).
 */
export function getCalendarTimeline(): CalendarEvent[] {
  const seen = new Set<string>();
  const out: CalendarEvent[] = [];
  for (const e of [...getCalendarArchive(), ...getCalendarEvents()]) {
    const sig = `${e.date}|${e.kind}|${e.label.slice(0, 24)}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({ source: "catalyst", ...e });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Everything the strip should know about: the routine's catalysts, plus the
 * scheduled earnings and macro prints it was never meant to write by hand.
 *
 * The routine describes the same releases in its own words, and not always on
 * the right day — its "July CPI release" sat on Aug 13 where the actual BLS
 * date is Aug 12. Matching on date alone missed that and showed the print
 * twice, so releases are paired on their keyword within a few days: the
 * authored label survives (it carries the framing) on the feed's date (which is
 * authoritative).
 */
export type TimelineWindow = {
  /** How far behind `from` the mechanical feeds still report. */
  lookbackDays?: number;
  /** How far ahead of `from` the FRED release schedule is pulled. */
  monthsAhead?: number;
};

export async function getMergedTimeline(
  from: string,
  window: TimelineWindow = {},
): Promise<CalendarEvent[]> {
  const { getEarningsEvents, getFomcEvents, getBojEvents, getMacroReleases, CENTRAL_BANK_LOOKBACK_DAYS } =
    await import("@/lib/calendar-feeds");

  const lookbackDays = window.lookbackDays ?? CENTRAL_BANK_LOOKBACK_DAYS;
  const monthsAhead = window.monthsAhead ?? 6;
  // The floor for everything, not just the central-bank tables. `from` is the
  // present; `since` is how far into the past this call is willing to look.
  const since = new Date(`${from}T12:00:00Z`);
  since.setUTCDate(since.getUTCDate() - lookbackDays);
  const sinceStr = since.toISOString().slice(0, 10);

  const authored = getCalendarTimeline().map((e) => ({ ...e }));
  const [earnings, macro] = await Promise.all([
    getEarningsEvents(sinceStr),
    getMacroReleases(from, monthsAhead, lookbackDays),
  ]);
  const fomc = getFomcEvents(from, lookbackDays);
  const boj = getBojEvents(from, lookbackDays);

  // "boj" is here so a hand-written "BoJ meeting" catalyst absorbs the feed row
  // rather than printing beside it, the same way the FOMC pair already works.
  const RELEASE_WORDS = ["cpi", "ppi", "pce", "jobs", "payroll", "fomc", "boj"];
  const wordOf = (label: string) =>
    RELEASE_WORDS.find((w) => label.toLowerCase().includes(w));
  const daysApart = (a: string, b: string) =>
    Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

  const swallowed = new Set<CalendarEvent>();
  for (const feed of [...fomc, ...boj, ...macro]) {
    const w = wordOf(feed.label);
    if (!w) continue;
    // Matched from `sinceStr`, not `from`: on the month calendar a CPI print
    // that has already happened is still a row, and pairing has to keep working
    // behind the present or the authored copy and the FRED copy both render.
    const twin = authored.find(
      (a) => a.date >= sinceStr && wordOf(a.label) === w && daysApart(a.date, feed.date) <= 4,
    );
    if (twin) {
      // The feed's date is the authoritative one — but only for an event that
      // hasn't happened yet. Re-dating an *archived* catalyst would march a
      // print that already landed onto a nearby feed date and file it under the
      // wrong day, which on a month calendar is a visible lie.
      if (twin.date >= from) twin.date = feed.date;
      twin.time_et = twin.time_et ?? feed.time_et;
      swallowed.add(feed);
    }
  }

  /**
   * The leading ticker of an authored earnings label. The routine writes them
   * ticker-first — "AMD Q2 2026 earnings AH — data-center >$6B" — which is the
   * only part that can be matched against a feed row.
   */
  const leadTicker = (label: string): string | null => {
    const t = label.trim().split(/[\s,]+/)[0].replace(/[^A-Z0-9.]/gi, "").toUpperCase();
    return /^[A-Z][A-Z0-9.]{0,5}$/.test(t) ? t : null;
  };

  // Earnings pair on the ticker rather than a release keyword. The routine
  // writes "AMD Q2 2026 earnings AH — <framing>" and the Yahoo feed writes a
  // bare "AMD earnings" for the same print. The old homepage strip collapsed a
  // date to a single node and hid the collision; a month grid prints both rows
  // side by side, so the pair has to be resolved here. The authored label wins
  // (it carries the framing), on the feed's date when the print is still ahead.
  for (const feed of earnings) {
    const sym = feed.tickers?.[0]?.toUpperCase();
    if (!sym) continue;
    const twin = authored.find(
      (a) =>
        a.kind.toUpperCase() === "EARNINGS" &&
        leadTicker(a.label) === sym &&
        daysApart(a.date, feed.date) <= 4,
    );
    if (twin) {
      if (twin.date >= from) twin.date = feed.date;
      swallowed.add(feed);
    }
  }

  const authoredDates = new Set(authored.map((e) => e.date));

  // Central-bank decisions are never dropped for sharing a date. They used to
  // be: any authored catalyst on the same day removed them, so the Bank of
  // Japan's July 31 decision vanished the moment the night routine wrote a
  // catalyst for the 31st. A rate decision is a fixed, scheduled fact — it does
  // not stop happening because something else also happens that day.
  //
  // Genuine duplicates are still caught upstream by the keyword pass: an
  // authored row that actually says "BoJ" or "FOMC" absorbs the feed row and
  // keeps the authored wording. What the date rule was removing was the
  // *unrelated* collision, which is exactly the case worth keeping.
  const merged = [
    ...authored,
    ...fomc.filter((e) => !swallowed.has(e)),
    ...boj.filter((e) => !swallowed.has(e)),
    ...macro.filter((e) => !swallowed.has(e) && !authoredDates.has(e.date)),
    ...earnings.filter((e) => !swallowed.has(e)),
  ];

  const seen = new Set<string>();
  return merged
    .filter((e) => {
      const sig = `${e.date}|${e.source}|${e.label.slice(0, 24)}`;
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
