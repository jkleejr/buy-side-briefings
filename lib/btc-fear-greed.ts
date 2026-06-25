// ---------------------------------------------------------------------------
// Crypto Fear & Greed Index — a 0–100 sentiment gauge for the Bitcoin / crypto
// market. 0 = "Extreme Fear" (the crowd is capitulating; historically a
// contrarian buy zone), 100 = "Extreme Greed" (euphoria; historically a zone to
// trim into). It blends volatility, momentum/volume, social media, dominance and
// trends into one number, refreshed daily.
//
// Source: alternative.me /fng — free, no key required. We pull a year of history
// so we can show today's reading next to yesterday, a week ago and a month ago,
// plus a 30-day sparkline. Every field is null-safe; a dead source degrades to
// "—" rather than crashing the page.
//   https://api.alternative.me/fng/?limit=365
// ---------------------------------------------------------------------------

export type FngReading = {
  value: number;
  classification: string; // e.g. "Fear", "Extreme Greed"
  date: string; // ISO yyyy-mm-dd (UTC)
};

export type BtcFearGreed = {
  asOf: string;
  current: FngReading | null;
  yesterday: FngReading | null;
  weekAgo: FngReading | null;
  monthAgo: FngReading | null;
  /** Oldest → newest, last 30 days, for the sparkline. */
  history30: FngReading[];
  /** Min / max over the last year, for context. */
  yearLow: FngReading | null;
  yearHigh: FngReading | null;
};

type FngApiPoint = {
  value?: string;
  value_classification?: string;
  timestamp?: string; // unix seconds (UTC)
};

type FngApiResponse = {
  data?: FngApiPoint[];
};

/** Canonical label + band from the raw 0–100 value (alternative.me's bands). */
export function classify(value: number): string {
  if (value <= 24) return "Extreme Fear";
  if (value <= 44) return "Fear";
  if (value <= 54) return "Neutral";
  if (value <= 74) return "Greed";
  return "Extreme Greed";
}

function toReading(p: FngApiPoint | undefined): FngReading | null {
  if (!p) return null;
  const value = p.value != null ? parseInt(p.value, 10) : NaN;
  if (!Number.isFinite(value)) return null;
  const ts = p.timestamp != null ? parseInt(p.timestamp, 10) : NaN;
  const date = Number.isFinite(ts)
    ? new Date(ts * 1000).toISOString().slice(0, 10)
    : "";
  return {
    value,
    classification: p.value_classification?.trim() || classify(value),
    date,
  };
}

export async function getBtcFearGreed(): Promise<BtcFearGreed> {
  const empty: BtcFearGreed = {
    asOf: new Date().toISOString().slice(0, 10),
    current: null,
    yesterday: null,
    weekAgo: null,
    monthAgo: null,
    history30: [],
    yearLow: null,
    yearHigh: null,
  };

  let json: FngApiResponse | null = null;
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=365", {
      headers: { accept: "application/json", "user-agent": "buy-side-briefings/1.0" },
      next: { revalidate: 300 },
    });
    if (res.ok) json = (await res.json()) as FngApiResponse;
  } catch (err) {
    console.error("[btc-fear-greed] fetch failed", err);
  }

  // data[0] is the most recent; index grows into the past.
  const data = json?.data ?? [];
  if (data.length === 0) return empty;

  const readings = data.map(toReading).filter((r): r is FngReading => r !== null);
  if (readings.length === 0) return empty;

  const at = (i: number) => (i < data.length ? toReading(data[i]) : null);

  // 30-day sparkline, oldest → newest.
  const history30 = readings.slice(0, 30).reverse();

  let yearLow = readings[0];
  let yearHigh = readings[0];
  for (const r of readings) {
    if (r.value < yearLow.value) yearLow = r;
    if (r.value > yearHigh.value) yearHigh = r;
  }

  return {
    asOf: new Date().toISOString().slice(0, 10),
    current: at(0),
    yesterday: at(1),
    weekAgo: at(7),
    monthAgo: at(30),
    history30,
    yearLow,
    yearHigh,
  };
}
