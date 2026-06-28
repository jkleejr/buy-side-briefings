import { getTradeQuotes } from "@/lib/markets";
import {
  getAllMarketsVerdicts,
  getCalendarEvents,
  type MarketsVerdict,
} from "@/lib/data";
import { getAssetDailySeries, type AssetId } from "@/lib/asset-daily";

// ---------------------------------------------------------------------------
// Home terminal data assembly.
//
// One server-side gather that feeds the redesigned homepage (a Bloomberg-style
// two-column reader: a left rail of live markets + status, and a main column
// that renders the latest morning / evening markets brief with a sentiment bar,
// key points, key signal, tickers to watch, sector performance, a wire-headline
// feed, and the week-ahead calendar). Everything maps to REAL data we already
// produce — the layout mirrors the Figma redesign; the content is ours.
// ---------------------------------------------------------------------------

export type MarketRow = {
  code: string;
  name: string;
  level: string;
  pct: number | null;
};

export type StatusRow = { label: string; state: "open" | "closed" };

export type TickerCard = {
  symbol: string;
  label: string;
  price: string;
  pct: number | null;
};

export type KeyPoint = { label: string; text: string };

export type BriefView = {
  window: "morning" | "evening";
  dateLabel: string;
  timeLabel: string;
  readMin: number;
  sentiment: { label: string; pct: number };
  code: string;
  headline: string;
  lede: string;
  keyPoints: KeyPoint[];
  keySignal: string;
  tickers: TickerCard[];
  href: string;
  isSeed: boolean;
};

export type SectorRow = { code: string; name: string; pct: number | null };

export type WireRow = {
  source: string;
  tag: string;
  headline: string;
  tone: "pos" | "neg" | "neutral";
  url?: string;
};

export type CalRow = {
  day: string;
  dateLabel: string;
  label: string;
  kind: string;
  note?: string;
  timeET?: string;
};

export type HomeData = {
  markets: MarketRow[];
  status: StatusRow[];
  nextBrief: { kind: string; when: string; note: string };
  morning: BriefView | null;
  evening: BriefView | null;
  defaultView: "morning" | "evening";
  sectors: SectorRow[];
  wire: WireRow[];
  calendar: CalRow[];
};

// --- left-rail markets list ------------------------------------------------

const MARKET_LIST: Array<{ symbol: string; code: string; name: string }> = [
  { symbol: "^GSPC", code: "SPX", name: "S&P 500" },
  { symbol: "^NDX", code: "NDX", name: "Nasdaq 100" },
  { symbol: "^DJI", code: "INDU", name: "Dow Jones" },
  { symbol: "^VIX", code: "VIX", name: "CBOE VIX" },
  { symbol: "^TNX", code: "TNX", name: "10Y Yield" },
  { symbol: "GC=F", code: "GC", name: "Gold" },
  { symbol: "CL=F", code: "CL", name: "Crude Oil" },
  { symbol: "BTC-USD", code: "BTC", name: "Bitcoin" },
];

const SECTOR_LIST: Array<{ symbol: string; code: string; name: string }> = [
  { symbol: "XLK", code: "XLK", name: "Technology" },
  { symbol: "XLY", code: "XLY", name: "Consumer Disc." },
  { symbol: "XLF", code: "XLF", name: "Financials" },
  { symbol: "XLC", code: "XLC", name: "Comm. Services" },
  { symbol: "XLV", code: "XLV", name: "Healthcare" },
  { symbol: "XLI", code: "XLI", name: "Industrials" },
  { symbol: "XLP", code: "XLP", name: "Consumer Staples" },
  { symbol: "XLB", code: "XLB", name: "Materials" },
  { symbol: "XLE", code: "XLE", name: "Energy" },
  { symbol: "XLRE", code: "XLRE", name: "Real Estate" },
  { symbol: "XLU", code: "XLU", name: "Utilities" },
];

const ASSET_IDS: AssetId[] = [
  "nvda",
  "btc",
  "skhynix",
  "spcx",
  "mu",
  "nbis",
  "be",
  "crwv",
];

// Map a verdict watchlist ticker to a Yahoo symbol the quote API understands.
const TICKER_SYMBOL: Record<string, string> = {
  SKHYNIX: "000660.KS",
  "BTC-USD": "BTC-USD",
  BTC: "BTC-USD",
};

function tickerDisplay(t: string): string {
  if (t === "BTC-USD") return "BTC";
  if (t === "SKHYNIX" || t === "000660.KS") return "SKHX";
  return t;
}

function fmtLevel(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toFixed(2);
}

function sentimentFor(code: string): { label: string; pct: number } {
  switch (code) {
    case "buy":
      return { label: "BULLISH", pct: 84 };
    case "hold":
      return { label: "CONSTRUCTIVE", pct: 60 };
    case "step_aside":
      return { label: "MIXED", pct: 46 };
    case "bearish":
      return { label: "BEARISH", pct: 18 };
    default:
      return { label: "NEUTRAL", pct: 50 };
  }
}

function headlineFromLabel(label: string): string {
  const idx = label.indexOf("—");
  const h = idx >= 0 ? label.slice(idx + 1) : label;
  return h.trim();
}

function clampText(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  const cut = t.slice(0, maxChars);
  const lastDot = cut.lastIndexOf(". ");
  if (lastDot > maxChars * 0.5) return cut.slice(0, lastDot + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, lastSpace > 0 ? lastSpace : maxChars).trim() + "…";
}

function firstClause(s: string): string {
  const m = s.split(/\s+[—-]\s+|\.\s/)[0];
  return clampText(m, 90);
}

function readMinutes(v: MarketsVerdict): number {
  const parts: string[] = [v.verdict.rationale_short];
  for (const s of v.verdict.supporting_data ?? []) parts.push(s.label);
  for (const r of v.regime_risk ?? []) if (r.status) parts.push(r.status);
  const words = parts.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 200));
}

function dateLabelOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// --- market session status -------------------------------------------------

function etParts(): { day: number; hm: number } {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  return { day: et.getDay(), hm: et.getHours() * 60 + et.getMinutes() };
}

function marketStatus(): StatusRow[] {
  const { day, hm } = etParts();
  const weekday = day >= 1 && day <= 5;
  const nyse = weekday && hm >= 570 && hm < 960; // 9:30–16:00 ET
  // CME equity futures: Sun 18:00 → Fri 17:00 ET, daily halt 17:00–18:00.
  const futClosed =
    day === 6 ||
    (day === 0 && hm < 18 * 60) ||
    (day === 5 && hm >= 17 * 60) ||
    (weekday && hm >= 17 * 60 && hm < 18 * 60);
  // Spot FX: Sun 17:00 → Fri 17:00 ET.
  const fxClosed =
    day === 6 || (day === 0 && hm < 17 * 60) || (day === 5 && hm >= 17 * 60);
  return [
    { label: "NYSE / NASDAQ", state: nyse ? "open" : "closed" },
    { label: "CME Futures", state: futClosed ? "closed" : "open" },
    { label: "Forex", state: fxClosed ? "closed" : "open" },
    { label: "Crypto", state: "open" },
  ];
}

function nextBrief(): { kind: string; when: string; note: string } {
  const { day, hm } = etParts();
  // Briefs land 06:00 ET (morning) and 20:00 ET (evening).
  const slots = [
    { min: 6 * 60, kind: "Morning Brief" },
    { min: 20 * 60, kind: "Evening Brief" },
  ];
  let addDays = 0;
  let chosen = slots.find((s) => s.min > hm);
  if (!chosen) {
    chosen = slots[0];
    addDays = 1;
  }
  const base = new Date();
  const et = new Date(base.toLocaleString("en-US", { timeZone: "America/New_York" }));
  et.setDate(et.getDate() + addDays);
  const when = `${et.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  })} · ${chosen.kind === "Morning Brief" ? "06:00" : "20:00"} ET`;
  // Note: the soonest upcoming catalyst from the curated calendar.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const upcoming = getCalendarEvents().filter((e) => e.date >= today);
  const note = upcoming[0]?.label ?? "Markets verdict + week-ahead";
  return { kind: chosen.kind, when, note };
}

// --- wire headlines (from the freshest dossier news per desk) ---------------

const SOURCE_TAG: Record<string, string> = {
  "yahoo finance": "YHOO",
  cnbc: "CNBC",
  techtimes: "TECH",
  stocktitan: "STKT",
  reuters: "RTRS",
  bloomberg: "BBG",
  "crypto.com mcp": "CRYP",
  "korea herald": "KHLD",
  "motley fool": "FOOL",
  fortune: "FRTN",
  "sec edgar": "SEC",
  tradingkey: "TKEY",
};

function sourceTag(source: string | undefined): string {
  if (!source) return "WIRE";
  const key = source.toLowerCase();
  for (const [k, v] of Object.entries(SOURCE_TAG)) {
    if (key.includes(k)) return v;
  }
  return source.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "WIRE";
}

function buildWire(): WireRow[] {
  const out: WireRow[] = [];
  const seen = new Set<string>();
  for (const id of ASSET_IDS) {
    const latest = getAssetDailySeries(id)[0];
    if (!latest) continue;
    for (const n of latest.news ?? []) {
      const clean = n.label.replace(/^★\s*/, "").trim();
      const key = clean.slice(0, 60).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        source: n.source ?? "Wire",
        tag: sourceTag(n.source),
        headline: clampText(clean, 130),
        tone:
          n.sentiment === "positive"
            ? "pos"
            : n.sentiment === "negative"
              ? "neg"
              : "neutral",
        url: n.url,
      });
      if (out.length >= 8) return out;
    }
  }
  return out;
}

// --- brief views -----------------------------------------------------------

function buildBrief(
  v: MarketsVerdict,
  window: "morning" | "evening",
  tickerQuotes: Map<string, { price: number | null; pct: number | null }>,
): BriefView {
  const keyPoints: KeyPoint[] = (v.regime_risk ?? []).slice(0, 6).map((r) => ({
    label: r.name,
    text: clampText(r.status ?? "", 150),
  }));
  const tickers: TickerCard[] = (v.watchlist_mentions ?? [])
    .slice(0, 4)
    .map((m) => {
      const sym = TICKER_SYMBOL[m.ticker] ?? m.ticker;
      const q = tickerQuotes.get(sym);
      return {
        symbol: sym,
        label: tickerDisplay(m.ticker),
        price: fmtLevel(q?.price ?? null),
        pct: q?.pct ?? null,
      };
    });
  return {
    window,
    dateLabel: dateLabelOf(v.date),
    timeLabel: window === "morning" ? "06:00 ET" : "20:00 ET",
    readMin: readMinutes(v),
    sentiment: sentimentFor(v.verdict.code),
    code: v.verdict.code,
    headline: headlineFromLabel(v.verdict.label),
    lede: clampText(v.verdict.rationale_short, 360),
    keyPoints,
    keySignal: v.verdict.supporting_data?.[0]
      ? firstClause(v.verdict.supporting_data[0].label.replace(/^★\s*/, ""))
      : v.verdict.label,
    tickers,
    href: `/briefings/${v.routine}/${v.date}-${v.window}`,
    isSeed: !!v.is_seed,
  };
}

// --- top-level gather ------------------------------------------------------

export async function getHomeData(): Promise<HomeData> {
  const verdicts = getAllMarketsVerdicts();
  const morningV = verdicts.find((v) => v.window === "morning") ?? null;
  const eveningV = verdicts.find((v) => v.window === "night") ?? null;

  // Tickers needed across both briefs (live quotes fetched once).
  const watchTickers = new Set<string>();
  for (const v of [morningV, eveningV]) {
    for (const m of v?.watchlist_mentions?.slice(0, 4) ?? []) {
      watchTickers.add(TICKER_SYMBOL[m.ticker] ?? m.ticker);
    }
  }

  const [marketQuotes, sectorQuotes, tickerQuotesArr] = await Promise.all([
    getTradeQuotes(MARKET_LIST.map((m) => m.symbol)),
    getTradeQuotes(SECTOR_LIST.map((s) => s.symbol)),
    watchTickers.size
      ? getTradeQuotes(Array.from(watchTickers))
      : Promise.resolve([]),
  ]);

  const markets: MarketRow[] = MARKET_LIST.map((m) => {
    const q = marketQuotes.find((x) => x.symbol === m.symbol);
    return { code: m.code, name: m.name, level: fmtLevel(q?.price ?? null), pct: q?.changePct ?? null };
  });

  const sectors: SectorRow[] = SECTOR_LIST.map((s) => {
    const q = sectorQuotes.find((x) => x.symbol === s.symbol);
    return { code: s.code, name: s.name, pct: q?.changePct ?? null };
  }).sort((a, b) => (b.pct ?? -Infinity) - (a.pct ?? -Infinity));

  const tickerMap = new Map<string, { price: number | null; pct: number | null }>();
  for (const q of tickerQuotesArr) tickerMap.set(q.symbol, { price: q.price, pct: q.changePct });

  const morning = morningV ? buildBrief(morningV, "morning", tickerMap) : null;
  const evening = eveningV ? buildBrief(eveningV, "evening", tickerMap) : null;

  // Default to whichever brief is newer (by date+window ordering).
  let defaultView: "morning" | "evening" = "morning";
  if (morningV && eveningV) {
    const mk = `${morningV.date}-1`;
    const ek = `${eveningV.date}-2`;
    defaultView = ek.localeCompare(mk) > 0 ? "evening" : "morning";
  } else if (eveningV && !morningV) {
    defaultView = "evening";
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const calendar: CalRow[] = getCalendarEvents()
    .filter((e) => e.date >= today)
    .slice(0, 6)
    .map((e) => {
      const d = new Date(`${e.date}T12:00:00Z`);
      return {
        day: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
        dateLabel: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
        label: e.label,
        kind: e.kind,
        note: e.note,
        timeET: e.time_et,
      };
    });

  return {
    markets,
    status: marketStatus(),
    nextBrief: nextBrief(),
    morning,
    evening,
    defaultView,
    sectors,
    wire: buildWire(),
    calendar,
  };
}
