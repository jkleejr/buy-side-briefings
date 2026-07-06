// ---------------------------------------------------------------------------
// Factor exposure model (Phase 2 of the "so what for me?" layer).
//
// Each macro signal we read from the regime (rates, volatility, the dollar,
// crypto, oil) drives a FACTOR. Each ticker carries a small set of factor
// exposures. The cross-product is the personalization: a live rate move only
// matters to the names that are actually rate-sensitive. This is the cheap,
// auditable alternative to parsing macro prose — pure data, no fs, so it can be
// imported on the client.
//
// Covered desks are tagged with conviction; a starter set of common names is
// included so uncovered holdings still get a macro read before they have a desk.
// Weights: 3 = primary driver, 2 = material, 1 = minor (ignored by default).
// ---------------------------------------------------------------------------

export type Factor = "rates" | "risk" | "dollar" | "crypto" | "oil";

export const FACTOR_META: Record<
  Factor,
  { chip: string; pressureHeadline: string; tailwindHeadline: string }
> = {
  rates: {
    chip: "RATES",
    pressureHeadline: "Rate pressure",
    tailwindHeadline: "Rate relief",
  },
  risk: {
    chip: "RISK-OFF",
    pressureHeadline: "Risk-off",
    tailwindHeadline: "Risk-on",
  },
  dollar: {
    chip: "USD",
    pressureHeadline: "Strong-dollar drag",
    tailwindHeadline: "Dollar tailwind",
  },
  crypto: {
    chip: "CRYPTO",
    pressureHeadline: "Crypto downdraft",
    tailwindHeadline: "Crypto bid",
  },
  oil: {
    chip: "OIL",
    pressureHeadline: "Oil spike",
    tailwindHeadline: "Cheap energy",
  },
};

// Normalize the many ways a user might enter the same asset to one key.
const CANONICAL: Record<string, string> = {
  "BTC-USD": "BTC",
  BTCUSD: "BTC",
  XBT: "BTC",
  "000660.KS": "SKHYNIX",
  "000660": "SKHYNIX",
  HXSCL: "SKHYNIX",
};

export function canonicalSymbol(symbol: string): string {
  const u = symbol.toUpperCase();
  return CANONICAL[u] ?? u;
}

type Exposure = Partial<Record<Factor, number>>;

const EXPOSURE: Record<string, Exposure> = {
  // --- covered desks ---
  NVDA: { rates: 3, risk: 3 },
  MU: { rates: 2, risk: 3, dollar: 2 },
  SKHYNIX: { risk: 3, dollar: 2, rates: 2 },
  NBIS: { rates: 3, risk: 3 },
  CRWV: { rates: 3, risk: 3 },
  BE: { rates: 3, risk: 3 },
  BTC: { crypto: 3, risk: 3, dollar: 2 },

  // --- common uncovered names (so a holding gets a macro read pre-desk) ---
  AAPL: { risk: 2, dollar: 2 },
  MSFT: { risk: 2, rates: 2 },
  GOOGL: { risk: 2, rates: 2 },
  GOOG: { risk: 2, rates: 2 },
  AMZN: { risk: 2, rates: 2 },
  META: { risk: 2, rates: 2 },
  TSLA: { risk: 3, rates: 3 },
  AMD: { risk: 3, rates: 3 },
  AVGO: { risk: 3, rates: 2 },
  TSM: { risk: 3, dollar: 2 },
  ARM: { risk: 3, rates: 3 },
  ASML: { risk: 3, dollar: 2 },
  SMCI: { risk: 3, rates: 3 },
  PLTR: { risk: 3, rates: 3 },
  COIN: { crypto: 3, risk: 3 },
  MSTR: { crypto: 3, risk: 3 },
  HOOD: { risk: 3, rates: 2, crypto: 2 },
  IONQ: { risk: 3, rates: 3 },
  RGTI: { risk: 3, rates: 3 },
  QBTS: { risk: 3, rates: 3 },
  ETH: { crypto: 3, risk: 3, dollar: 2 },
  "ETH-USD": { crypto: 3, risk: 3, dollar: 2 },

  // --- contrast: low-sensitivity names read as "macro-quiet" ---
  XOM: { oil: 3 },
  CVX: { oil: 3 },
  KO: { rates: 1 },
  PG: { rates: 1 },
  JNJ: { rates: 1 },
  WMT: { risk: 1 },
};

/** Raw exposure weights for a (possibly aliased) symbol. */
export function exposureFor(symbol: string): Exposure {
  return EXPOSURE[canonicalSymbol(symbol)] ?? {};
}

/** Factors that materially move this name (weight ≥ 2). */
export function materialFactors(symbol: string): Factor[] {
  const e = exposureFor(symbol);
  return (Object.keys(e) as Factor[]).filter((f) => (e[f] ?? 0) >= 2);
}

/** Whether we have any factor model for this symbol at all. */
export function hasFactorModel(symbol: string): boolean {
  return canonicalSymbol(symbol) in EXPOSURE;
}

// ---------------------------------------------------------------------------
// Generic fallback: derive factors from a name's sector + beta (via Yahoo) so
// ANY held ticker gets a real macro read, not just the curated names above.
// ---------------------------------------------------------------------------

const SECTOR_FACTORS: Record<string, Factor[]> = {
  Technology: ["risk", "rates"],
  "Communication Services": ["risk", "rates"],
  "Consumer Cyclical": ["risk", "rates"],
  "Real Estate": ["rates", "risk"],
  "Financial Services": ["rates", "risk"],
  Energy: ["oil", "risk"],
  "Basic Materials": ["oil", "dollar"],
  Industrials: ["risk"],
  Healthcare: ["risk"],
  Utilities: ["rates"],
  "Consumer Defensive": [], // defensive — low macro sensitivity
};

export type ProfileLike = {
  sector?: string | null;
  industry?: string | null;
  beta?: number | null;
};

/** Factor exposure inferred from a company's sector and beta. */
export function factorsFromProfile(p: ProfileLike): Factor[] {
  const base = p.sector && SECTOR_FACTORS[p.sector] ? [...SECTOR_FACTORS[p.sector]] : ["risk"];
  // A high-beta name is risk-on whatever its sector; make sure that shows.
  if (p.beta != null && p.beta >= 1.2 && !base.includes("risk")) base.push("risk");
  return Array.from(new Set(base)) as Factor[];
}
