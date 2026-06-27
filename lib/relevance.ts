import {
  getLatestAssetDaily,
  type AssetDaily,
  type AssetId,
  type TradeAction,
  type Conviction,
  type DayWinner,
} from "@/lib/asset-daily";

// ---------------------------------------------------------------------------
// The "so what for me?" layer (Phase 1).
//
// The dashboard already writes a rich daily dossier per covered name. This
// module distills each one into a single holder-facing relevance object: the
// one-line "why this matters to your book," the standing call, and the single
// most load-bearing bull / bear line. It is computed at BUILD time from data we
// already have — the personalization (which subset to show) happens in the
// browser against the user's localStorage holdings. No backend, no runtime LLM.
//
// Phase 2 adds the macro -> holdings factor mapping; Phase 3 widens this beyond
// the covered desks. Here we only cover the eight names that have a dossier.
// ---------------------------------------------------------------------------

/** The eight names with a daily desk, in display priority order. */
const COVERED: AssetId[] = [
  "nvda",
  "btc",
  "mu",
  "skhynix",
  "nbis",
  "crwv",
  "be",
  "spcx",
];

/** Dossier page for each covered asset (kept in sync with the app/ routes). */
const HREF: Record<AssetId, string> = {
  nvda: "/nvidia",
  btc: "/bitcoin",
  mu: "/micron",
  skhynix: "/skhynix",
  nbis: "/nebius",
  crwv: "/coreweave",
  be: "/bloom-energy",
  spcx: "/spacex",
};

// What a user might type for each covered name. Matched case-insensitively
// against the holding's symbol so "BTC", "BTC-USD" and "000660" all resolve.
const ALIASES: Record<AssetId, string[]> = {
  nvda: ["NVDA", "NVDA.US"],
  btc: ["BTC", "BTC-USD", "BTCUSD", "XBT"],
  mu: ["MU"],
  skhynix: ["000660.KS", "000660", "SKHYNIX", "HXSCL"],
  nbis: ["NBIS"],
  crwv: ["CRWV"],
  be: ["BE"],
  spcx: ["SPCX", "SPACEX"],
};

/** One covered holding's distilled relevance — everything a feed card needs. */
export type HolderRelevance = {
  asset: AssetId;
  /** Canonical display symbol from the dossier (e.g. "NVDA", "000660.KS"). */
  symbol: string;
  name: string;
  href: string;
  /** Symbols a user-entered ticker can match on (uppercased). */
  aliases: string[];

  action: TradeAction;
  conviction: Conviction;
  dayWinner: DayWinner;

  price: number;
  changePct: number;
  currencySymbol: string;

  /** First sentence(s) of the desk's rationale — the "so what" in plain terms. */
  holderLine: string;
  /** The single strongest line for each side. */
  topBull: string;
  topBear: string;

  /** Dossier date (YYYY-MM-DD) so the card can be honest about vintage. */
  date: string;
};

/** Take the first 1–2 sentences of a blob, capped, for a scannable summary. */
function firstSentences(text: string, maxSentences = 2, cap = 240): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return "";
  // Split on sentence boundaries, keeping em-dash clauses intact.
  const parts = clean.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
  let out = parts.slice(0, maxSentences).join(" ");
  if (out.length > cap) out = out.slice(0, cap - 1).trimEnd() + "…";
  return out;
}

function toRelevance(d: AssetDaily): HolderRelevance {
  return {
    asset: d.asset,
    symbol: d.symbol,
    name: d.name,
    href: HREF[d.asset],
    aliases: ALIASES[d.asset].map((a) => a.toUpperCase()),
    action: d.decision.action,
    conviction: d.decision.conviction,
    dayWinner: d.day_winner,
    price: d.snapshot.price,
    changePct: d.snapshot.change_pct,
    currencySymbol: d.currency_symbol ?? "$",
    holderLine: firstSentences(d.decision.rationale),
    topBull: d.bull_case[0] ?? "",
    topBear: d.bear_case[0] ?? "",
    date: d.date,
  };
}

/** Relevance for every covered name that has a dossier on file. */
export function getCoveredRelevance(): HolderRelevance[] {
  return COVERED.map(getLatestAssetDaily)
    .filter((d): d is AssetDaily => d !== null)
    .map(toRelevance);
}
