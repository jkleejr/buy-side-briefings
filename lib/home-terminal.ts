import { getTradeQuotes } from "@/lib/markets";
import {
  getAllMarketsVerdicts,
  getBriefing,
  getCalendarArchive,
  getMergedTimeline,
  type CalendarEvent,
  type MarketsVerdict,
} from "@/lib/data";
import { readMinutes as readMinutesOfText } from "@/lib/utils";
import { clampText, verdictHeadline } from "@/lib/verdict-headline";

// ---------------------------------------------------------------------------
// Home terminal data assembly.
//
// One server-side gather that feeds the redesigned homepage (a Bloomberg-style
// two-column reader: a left rail of brief archive + live market pulse + status,
// and a main column that renders the latest morning / evening markets brief as
// a metric strip, an outlook bar, an editorial headline, clickable key points
// that link to their source article, a key signal, tickers to watch, sector
// performance, a wire-headline feed, and the week-ahead calendar). Everything
// maps to REAL data we already produce — the layout mirrors the Figma redesign;
// the content is ours.
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

export type MetricCard = {
  label: string;
  value: string;
  sub: string;
  dir: "up" | "down" | "flat";
};

export type KeyPoint = { label: string; text: string; url?: string };

export type ArchiveRow = {
  window: "morning" | "evening";
  dayLabel: string;
  headline: string;
  href: string;
};

export type BriefView = {
  window: "morning" | "evening";
  dateLabel: string;
  timeLabel: string;
  readMin: number;
  metrics: MetricCard[];
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
  /** ISO date (YYYY-MM-DD) — the timeline needs it to spot week boundaries,
   *  which the display labels alone can't give it when days are skipped. */
  date: string;
  day: string;
  dateLabel: string;
  label: string;
  kind: string;
  note?: string;
  timeET?: string;
  /** The week's binary event — the one the timeline marks hot. */
  hot?: boolean;
  /** Whole days until the event — negative once it's behind us (0 = today). */
  tMinus?: number;
  /** True for events already past; the timeline dims them. */
  past?: boolean;
  /** Where it came from — "catalyst" is the routine's hand-written material. */
  source?: "catalyst" | "fomc" | "boj" | "macro" | "earnings";
};

export type HomeData = {
  todayLabel: string;
  pulse: MarketRow[];
  status: StatusRow[];
  archive: ArchiveRow[];
  morning: BriefView | null;
  evening: BriefView | null;
  defaultView: "morning" | "evening";
  sectors: SectorRow[];
  wire: WireRow[];
  calendar: CalRow[];
  /** Full catalyst run — archived past through everything known ahead. */
  timeline: CalRow[];
};

// --- left-rail market pulse (2-col grid) ------------------------------------

const PULSE_LIST: Array<{ symbol: string; code: string; name: string }> = [
  { symbol: "SPY", code: "SPY", name: "S&P 500 ETF" },
  { symbol: "BTC-USD", code: "BTC", name: "Bitcoin" },
  { symbol: "GC=F", code: "GC", name: "Gold" },
  { symbol: "NVDA", code: "NVDA", name: "NVIDIA" },
  { symbol: "^VIX", code: "VIX", name: "Volatility Index" },
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

function fmtLevel(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toFixed(2);
}

function pctStr(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function dirOf(n: number | null | undefined): "up" | "down" | "flat" {
  if (n === null || n === undefined || !Number.isFinite(n) || n === 0) return "flat";
  return n > 0 ? "up" : "down";
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

function headlineOf(v: MarketsVerdict): string {
  return verdictHeadline(v.verdict, 110) ?? v.verdict.label;
}

function firstClause(s: string): string {
  const m = s.split(/\s+[—-]\s+|\.\s/)[0];
  return clampText(m, 90);
}

// Derive a short, topical label for a key point from its source sentence.
// Ticker-led points ("NVDA Stop Day 1…") collapse to the ticker; prose points
// ("Regime gates — all three…") take the first two words.
function shortLabel(s: string): string {
  const clean = s.replace(/^★\s*/, "").replace(/^[—–-]\s*/, "").trim();
  const words = clean.split(/\s+/);
  const first = (words[0] ?? "").replace(/[^A-Za-z0-9]/g, "");
  const isTicker = /^[A-Z0-9]{3,6}$/.test(first);
  let label = isTicker ? first : words.slice(0, 2).join(" ");
  label = label.replace(/[—–\-:,.]+$/, "");
  return label.toUpperCase().slice(0, 18);
}

// Honest read-time: count the words the briefing page will actually show —
// the full body (authored .mdx or synthesized) plus the verdict summary and
// sourced points. The old estimate counted only the summary and promised
// "5 min" over a 5,000-word night brief.
function readMinutes(v: MarketsVerdict): number {
  const body = getBriefing(v.routine, `${v.date}-${v.window}`)?.body ?? "";
  const parts: string[] = [body, v.verdict.rationale_short];
  for (const s of v.verdict.supporting_data ?? []) parts.push(s.label);
  return Math.max(2, readMinutesOfText(parts.join(" ")));
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

function dayLabelOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return d
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })
    .replace(",", "")
    .toUpperCase();
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
  const futClosed =
    day === 6 ||
    (day === 0 && hm < 18 * 60) ||
    (day === 5 && hm >= 17 * 60) ||
    (weekday && hm >= 17 * 60 && hm < 18 * 60);
  const fxClosed =
    day === 6 || (day === 0 && hm < 17 * 60) || (day === 5 && hm >= 17 * 60);
  return [
    { label: "NYSE / NASDAQ", state: nyse ? "open" : "closed" },
    { label: "CME Futures", state: futClosed ? "closed" : "open" },
    { label: "Forex", state: fxClosed ? "closed" : "open" },
    { label: "Crypto", state: "open" },
  ];
}

// --- wire headlines (from recent markets-verdict source links) --------------

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

function urlHost(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".")[0];
  } catch {
    return undefined;
  }
}

// Key a supporting-data point the same way in both the wire and the exclude
// set, so "what matters today" and "on the wire" can't surface the same item.
function wireKey(label: string): string {
  return label.replace(/^★\s*/, "").trim().slice(0, 60).toLowerCase();
}

function buildWire(verdicts: MarketsVerdict[], exclude?: Set<string>): WireRow[] {
  const out: WireRow[] = [];
  const seen = new Set<string>(exclude ?? []);
  for (const v of verdicts) {
    for (const s of v.verdict.supporting_data ?? []) {
      const clean = s.label.replace(/^★\s*/, "").trim();
      const key = wireKey(s.label);
      if (seen.has(key)) continue;
      seen.add(key);
      const host = urlHost(s.url);
      out.push({
        source: host ?? "Wire",
        tag: sourceTag(host),
        headline: clampText(clean, 130),
        tone: "neutral",
        url: s.url,
      });
      if (out.length >= 8) return out;
    }
  }
  return out;
}

// --- metric strip ----------------------------------------------------------

function buildMetrics(v: MarketsVerdict): MetricCard[] {
  const s = v.snapshot ?? {};
  const out: MetricCard[] = [];
  if (s.sp500)
    out.push({
      label: "S&P 500",
      value: fmtLevel(s.sp500.level),
      sub: pctStr(s.sp500.change_pct),
      dir: dirOf(s.sp500.change_pct),
    });
  if (s.vix)
    out.push({
      label: "VIX",
      value: s.vix.level != null ? s.vix.level.toFixed(2) : "—",
      sub: pctStr(s.vix.change_pct),
      dir: dirOf(s.vix.change_pct),
    });
  if (s.ust10y)
    out.push({
      label: "10Y UST",
      value: s.ust10y.level != null ? `${s.ust10y.level.toFixed(2)}%` : "—",
      sub:
        s.ust10y.change_bps != null
          ? `${s.ust10y.change_bps > 0 ? "+" : ""}${s.ust10y.change_bps} bps`
          : pctStr(s.ust10y.change_pct),
      dir: dirOf(s.ust10y.change_bps ?? s.ust10y.change_pct),
    });
  if (s.dxy)
    out.push({
      label: "DXY",
      value: s.dxy.level != null ? s.dxy.level.toFixed(2) : "—",
      sub: pctStr(s.dxy.change_pct),
      dir: dirOf(s.dxy.change_pct),
    });
  return out.slice(0, 4);
}

// --- brief views -----------------------------------------------------------

/**
 * The briefing body's own inline citations, as a stand-in for a verdict that
 * shipped without `supporting_data`.
 *
 * The routine writes the read as prose with `[label](url)` markdown links, so
 * the articles behind the day are already there — just in the MDX rather than
 * the JSON. Pulled in document order, deduped by URL, and skipping the
 * one-word anchors ("Reuters", "here") that carry no claim on their own.
 */
function citedLinksFromBody(v: MarketsVerdict): Array<{ label: string; url?: string }> {
  const body = getBriefing(v.routine, `${v.date}-${v.window}`)?.body ?? "";
  const out: Array<{ label: string; url?: string }> = [];
  const seen = new Set<string>();
  for (const m of body.matchAll(/\[([^\]]{12,200})\]\((https?:\/\/[^)\s]+)\)/g)) {
    const label = m[1].replace(/[*_`]/g, "").trim();
    const url = m[2];
    if (seen.has(url) || label.split(/\s+/).length < 3) continue;
    seen.add(url);
    out.push({ label, url });
  }
  return out;
}

function buildBrief(
  v: MarketsVerdict,
  window: "morning" | "evening",
  tickerQuotes: Map<string, { price: number | null; pct: number | null }>,
): BriefView {
  // Key points come from the verdict's supporting_data — each carries a source
  // URL so the reader can open the underlying article / research.
  //
  // With a fallback, because one missing field used to blank the whole column:
  // the 2026-07-30 night verdict shipped with no `supporting_data` at all, and
  // "What matters today" rendered null, which collapsed the two-column grid and
  // slid the catalyst list into its place. The briefing body carries the same
  // sourced links inline, so it can stand in rather than leaving a hole.
  const sourced = (v.verdict.supporting_data ?? []).filter((sd) => sd?.label);
  const keyPoints: KeyPoint[] = (
    sourced.length ? sourced : citedLinksFromBody(v)
  )
    .slice(0, 6)
    .map((sd) => ({
      label: shortLabel(sd.label),
      text: clampText(sd.label.replace(/^★\s*/, ""), 150),
      url: sd.url,
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
    metrics: buildMetrics(v),
    sentiment: sentimentFor(v.verdict.code),
    code: v.verdict.code,
    headline: headlineOf(v),
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

  // Both editions must come from the same day. Picking each window
  // independently pairs whatever the newest morning is with whatever the
  // newest night is — which drift apart the moment one run is missed, and the
  // AM/PM toggle then presents two different days as one day's two editions.
  // An edition missing for the latest day stays null (the toggle hides it) and
  // the older one still surfaces under "Previous editions".
  const latestDate = verdicts[0]?.date ?? null;
  const latest = latestDate ? verdicts.filter((v) => v.date === latestDate) : [];
  const morningV = latest.find((v) => v.window === "morning") ?? null;
  const eveningV = latest.find((v) => v.window === "night") ?? null;

  const watchTickers = new Set<string>();
  for (const v of [morningV, eveningV]) {
    for (const m of v?.watchlist_mentions?.slice(0, 4) ?? []) {
      watchTickers.add(TICKER_SYMBOL[m.ticker] ?? m.ticker);
    }
  }

  const [pulseQuotes, sectorQuotes, tickerQuotesArr] = await Promise.all([
    getTradeQuotes(PULSE_LIST.map((m) => m.symbol)),
    getTradeQuotes(SECTOR_LIST.map((s) => s.symbol)),
    watchTickers.size
      ? getTradeQuotes(Array.from(watchTickers))
      : Promise.resolve([]),
  ]);

  const pulse: MarketRow[] = PULSE_LIST.map((m) => {
    const q = pulseQuotes.find((x) => x.symbol === m.symbol);
    return {
      code: m.code,
      name: m.name,
      level: fmtLevel(q?.price ?? null),
      pct: q?.changePct ?? null,
    };
  });

  const sectors: SectorRow[] = SECTOR_LIST.map((s) => {
    const q = sectorQuotes.find((x) => x.symbol === s.symbol);
    return { code: s.code, name: s.name, pct: q?.changePct ?? null };
  }).sort((a, b) => (b.pct ?? -Infinity) - (a.pct ?? -Infinity));

  const tickerMap = new Map<string, { price: number | null; pct: number | null }>();
  for (const q of tickerQuotesArr)
    tickerMap.set(q.symbol, { price: q.price, pct: q.changePct });

  const morning = morningV ? buildBrief(morningV, "morning", tickerMap) : null;
  const evening = eveningV ? buildBrief(eveningV, "evening", tickerMap) : null;

  let defaultView: "morning" | "evening" = "morning";
  if (morningV && eveningV) {
    defaultView =
      `${eveningV.date}-2`.localeCompare(`${morningV.date}-1`) > 0
        ? "evening"
        : "morning";
  } else if (eveningV && !morningV) {
    defaultView = "evening";
  }

  // Archive — recent verdicts beyond the two shown in the toggle.
  const archive: ArchiveRow[] = verdicts
    .filter((v) => v !== morningV && v !== eveningV)
    .slice(0, 5)
    .map((v) => ({
      window: v.window === "morning" ? "morning" : "evening",
      dayLabel: dayLabelOf(v.date),
      headline: clampText(headlineOf(v), 70),
      href: `/briefings/${v.routine}/${v.date}-${v.window}`,
    }));

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

  // Authored catalysts plus the scheduled earnings and macro prints the routine
  // was never meant to type by hand.
  const merged = await getMergedTimeline(today);
  const upcoming = merged.filter((e) => e.date >= today);
  // The week's binary — the first macro-regime event ahead. Marked hot on the
  // timeline so the countdown is legible at a glance.
  const BINARY_KINDS = new Set(["MACRO", "FOMC", "CPI", "NFP", "PCE"]);
  const hotDate = upcoming.find((e) => BINARY_KINDS.has(e.kind.toUpperCase()))?.date;

  const toRow = (e: CalendarEvent): CalRow => {
    const d = new Date(`${e.date}T12:00:00Z`);
    return {
      date: e.date,
      day: d
        .toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
        .toUpperCase(),
      dateLabel: d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      label: e.label,
      kind: e.kind,
      note: e.note,
      timeET: e.time_et,
      hot: BINARY_KINDS.has(e.kind.toUpperCase()) && e.date === hotDate,
      tMinus: Math.round((Date.parse(e.date) - Date.parse(today)) / 86_400_000),
      past: e.date < today,
      source: e.source,
    };
  };

  // The detail list is the reading layer, so it guarantees the routine's
  // catalysts a place rather than letting a busy earnings week crowd them out —
  // eighteen names report in six weeks and would otherwise fill it entirely.
  // Chronological within the selection, so it still reads as a calendar.
  const nextCatalysts = upcoming.filter((e) => e.source === "catalyst").slice(0, 4);
  const nextOther = upcoming.filter((e) => e.source !== "catalyst").slice(0, 4);
  const calendar: CalRow[] = [...nextCatalysts, ...nextOther]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 7)
    .map(toRow);

  // The timeline is the scrubbing layer: everything we know of, behind and
  // ahead, so it can be scrolled in both directions rather than starting flat
  // at today.
  const timeline: CalRow[] = [
    ...getCalendarArchive().map((e) => ({ ...e, source: "catalyst" as const })),
    ...upcoming,
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(toRow);

  const todayLabel = new Date()
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/New_York",
    })
    .toUpperCase();

  // The wire is "everything else recent" — exclude the points already shown as
  // key points in the two featured briefings so the homepage never repeats.
  const featuredKeys = new Set<string>();
  for (const v of [morningV, eveningV])
    for (const s of v?.verdict.supporting_data ?? [])
      featuredKeys.add(wireKey(s.label));

  return {
    todayLabel,
    pulse,
    status: marketStatus(),
    archive,
    morning,
    evening,
    defaultView,
    sectors,
    wire: buildWire(verdicts, featuredKeys),
    calendar,
    timeline,
  };
}
