import fs from "node:fs";
import path from "node:path";
import { todayET } from "@/lib/utils";

const DATA_DIR = path.resolve(process.cwd(), "data");
const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";
const FRED_RELEASE_DATES_URL = "https://api.stlouisfed.org/fred/release/dates";

export type MacroSnapshot = {
  as_of: string;
  source: "fred" | "manual" | "hybrid";
  fed: {
    funds_target_low: number;
    funds_target_high: number;
    funds_effective: number | null;
    last_change_date?: string;
    last_change_action?: string;
    /** Net move this cycle, e.g. "−75bp" — update by hand when the Fed moves. */
    cycle_label?: string;
    cycle_hint?: string;
    next_fomc_date: string;
    next_fomc_label: string;
    balance_sheet_trillions: number | null;
    balance_sheet_direction: "growing" | "shrinking" | "flat" | null;
    fed_watch_url: string;
  };
  inflation: {
    cpi_yoy_pct: number | null;
    cpi_mom_pct?: number | null;
    cpi_release_date: string;
    core_cpi_yoy_pct: number | null;
    pce_yoy_pct?: number | null;
    core_pce_yoy_pct: number | null;
    core_pce_release_date: string;
    /** CUUR0000SA0R — what a 1982-84 dollar buys today, in cents. */
    purchasing_power_cents?: number | null;
    purchasing_power_yoy_pct?: number | null;
  };
  labor: {
    unemployment_rate_pct: number | null;
    unemployment_release_date: string;
    nonfarm_payrolls_thousands: number | null;
    nonfarm_release_date: string;
    participation_rate_pct?: number | null;
    wage_growth_yoy_pct?: number | null;
  };
  growth: {
    ism_manufacturing: number | null;
    ism_manufacturing_release_date: string;
    ism_services: number | null;
    ism_services_release_date: string;
    gdp_qoq_annualized_pct: number | null;
    gdp_release_date: string;
    gdp_quarter_label?: string;
    retail_sales_yoy_pct?: number | null;
    retail_sales_release_date?: string;
    industrial_production_yoy_pct?: number | null;
    industrial_production_release_date?: string;
  };
  sentiment: {
    aaii_bull_pct: number | null;
    aaii_bear_pct: number | null;
    aaii_release_date: string;
    fear_greed_value: number | null;
    fear_greed_label: string;
  };
  valuation: {
    sp500_forward_pe: number | null;
    shiller_cape: number | null;
  };
  crypto_cycle: {
    last_btc_halving_date: string;
    next_btc_halving_date: string;
    cycle_position_label: string;
  };
  yields?: {
    ust2y: number | null;
    ust10y: number | null;
    spread_2s10s_bps: number | null;
    real_10y_pct: number | null;
    as_of: string | null;
  };
};

function readManualMacro(): MacroSnapshot {
  const file = path.join(DATA_DIR, "macro.json");
  const raw = fs.readFileSync(file, "utf-8");
  const parsed = JSON.parse(raw) as Omit<MacroSnapshot, "source">;
  return { ...parsed, source: "manual" };
}

type FredObservation = { date: string; value: string };
type FredResponse = { observations?: FredObservation[] };

async function fredLatest(seriesId: string, apiKey: string): Promise<{ value: number | null; date: string | null }> {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return { value: null, date: null };
    const json = (await res.json()) as FredResponse;
    const obs = json.observations?.[0];
    if (!obs) return { value: null, date: null };
    const v = parseFloat(obs.value);
    return Number.isFinite(v) ? { value: v, date: obs.date } : { value: null, date: obs.date };
  } catch {
    return { value: null, date: null };
  }
}

async function fredYoY(
  seriesId: string,
  apiKey: string,
): Promise<{ value: number | null; mom: number | null; date: string | null }> {
  // Pull last 13 observations to compute YoY (and MoM) % change.
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=13&sort_order=desc`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return { value: null, mom: null, date: null };
    const json = (await res.json()) as FredResponse;
    const obs = json.observations ?? [];
    if (obs.length < 13) return { value: null, mom: null, date: obs[0]?.date ?? null };
    const latest = parseFloat(obs[0].value);
    const monthAgo = parseFloat(obs[1].value);
    const yearAgo = parseFloat(obs[12].value);
    if (!Number.isFinite(latest) || !Number.isFinite(yearAgo) || yearAgo === 0) {
      return { value: null, mom: null, date: obs[0].date };
    }
    const mom =
      Number.isFinite(monthAgo) && monthAgo !== 0
        ? ((latest - monthAgo) / monthAgo) * 100
        : null;
    return { value: ((latest - yearAgo) / yearAgo) * 100, mom, date: obs[0].date };
  } catch {
    return { value: null, mom: null, date: null };
  }
}

async function fredMoMChange(
  seriesId: string,
  apiKey: string,
): Promise<{ value: number | null; date: string | null }> {
  // Latest observation minus the prior one — for level series like payrolls.
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=2&sort_order=desc`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return { value: null, date: null };
    const json = (await res.json()) as FredResponse;
    const obs = json.observations ?? [];
    if (obs.length < 2) return { value: null, date: obs[0]?.date ?? null };
    const latest = parseFloat(obs[0].value);
    const prior = parseFloat(obs[1].value);
    if (!Number.isFinite(latest) || !Number.isFinite(prior)) {
      return { value: null, date: obs[0].date };
    }
    return { value: latest - prior, date: obs[0].date };
  } catch {
    return { value: null, date: null };
  }
}

export async function getMacroSnapshot(): Promise<MacroSnapshot> {
  const manual = readManualMacro();
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return manual;

  const [
    fedFunds,
    cpiYoY,
    coreCpiYoY,
    pceYoY,
    corePceYoY,
    purchasingPowerYoY,
    purchasingPowerLevel,
    unemployment,
    payrollsChange,
    participation,
    wagesYoY,
    balanceSheet,
    ust2y,
    ust10y,
    spread2s10s,
    real10y,
    gdp,
    retailYoY,
    indproYoY,
  ] = await Promise.all([
    fredLatest("DFF", apiKey),
    fredYoY("CPIAUCSL", apiKey),
    fredYoY("CPILFESL", apiKey),
    fredYoY("PCEPI", apiKey),
    fredYoY("PCEPILFE", apiKey),
    fredYoY("CUUR0000SA0R", apiKey),
    fredLatest("CUUR0000SA0R", apiKey),
    fredLatest("UNRATE", apiKey),
    fredMoMChange("PAYEMS", apiKey),
    fredLatest("CIVPART", apiKey),
    fredYoY("CES0500000003", apiKey),
    fredLatest("WALCL", apiKey),
    fredLatest("DGS2", apiKey),
    fredLatest("DGS10", apiKey),
    fredLatest("T10Y2Y", apiKey),
    fredLatest("DFII10", apiKey),
    fredLatest("A191RL1Q225SBEA", apiKey),
    fredYoY("RSAFS", apiKey),
    fredYoY("INDPRO", apiKey),
  ]);

  const balanceSheetTrillions =
    balanceSheet.value !== null ? balanceSheet.value / 1_000_000 : null;

  return {
    ...manual,
    source: "hybrid",
    as_of: new Date().toISOString().slice(0, 10),
    fed: {
      ...manual.fed,
      funds_effective: fedFunds.value ?? manual.fed.funds_effective,
      balance_sheet_trillions: balanceSheetTrillions ?? manual.fed.balance_sheet_trillions,
    },
    inflation: {
      ...manual.inflation,
      cpi_yoy_pct: cpiYoY.value ?? manual.inflation.cpi_yoy_pct,
      cpi_mom_pct: cpiYoY.mom ?? manual.inflation.cpi_mom_pct,
      cpi_release_date: cpiYoY.date ?? manual.inflation.cpi_release_date,
      core_cpi_yoy_pct: coreCpiYoY.value ?? manual.inflation.core_cpi_yoy_pct,
      pce_yoy_pct: pceYoY.value ?? manual.inflation.pce_yoy_pct,
      core_pce_yoy_pct: corePceYoY.value ?? manual.inflation.core_pce_yoy_pct,
      core_pce_release_date: corePceYoY.date ?? manual.inflation.core_pce_release_date,
      purchasing_power_cents:
        purchasingPowerLevel.value ?? manual.inflation.purchasing_power_cents,
      purchasing_power_yoy_pct:
        purchasingPowerYoY.value ?? manual.inflation.purchasing_power_yoy_pct,
    },
    labor: {
      ...manual.labor,
      unemployment_rate_pct: unemployment.value ?? manual.labor.unemployment_rate_pct,
      unemployment_release_date: unemployment.date ?? manual.labor.unemployment_release_date,
      nonfarm_payrolls_thousands:
        payrollsChange.value !== null
          ? Math.round(payrollsChange.value)
          : manual.labor.nonfarm_payrolls_thousands,
      nonfarm_release_date: payrollsChange.date ?? manual.labor.nonfarm_release_date,
      participation_rate_pct: participation.value ?? manual.labor.participation_rate_pct,
      wage_growth_yoy_pct: wagesYoY.value ?? manual.labor.wage_growth_yoy_pct,
    },
    growth: {
      ...manual.growth,
      gdp_qoq_annualized_pct: gdp.value ?? manual.growth.gdp_qoq_annualized_pct,
      gdp_quarter_label: gdp.date
        ? `Q${Math.floor(parseInt(gdp.date.slice(5, 7), 10) / 3) + 1} ${gdp.date.slice(0, 4)}`
        : manual.growth.gdp_quarter_label,
      retail_sales_yoy_pct: retailYoY.value ?? manual.growth.retail_sales_yoy_pct,
      retail_sales_release_date: retailYoY.date ?? manual.growth.retail_sales_release_date,
      industrial_production_yoy_pct:
        indproYoY.value ?? manual.growth.industrial_production_yoy_pct,
      industrial_production_release_date:
        indproYoY.date ?? manual.growth.industrial_production_release_date,
    },
    yields: {
      ust2y: ust2y.value,
      ust10y: ust10y.value,
      spread_2s10s_bps: spread2s10s.value !== null ? Math.round(spread2s10s.value * 100) : null,
      real_10y_pct: real10y.value,
      as_of: spread2s10s.date ?? ust10y.date,
    },
  };
}

// ---- Upcoming macro releases (FRED /release/dates) -------------------------
//
// FRED publishes release calendars per "release" (each release covers one or
// more series). We hard-map the most-watched releases here. Returns the next
// scheduled release date for each, in date-ascending order.

export type UpcomingRelease = {
  id: number;
  name: string;
  abbrev: string;
  date: string; // YYYY-MM-DD
  /** Lower = more important — used for sort tie-breaking only. */
  priority: number;
};

// Curated list — only the releases that materially move risk-asset pricing.
// IDs come from https://fred.stlouisfed.org/releases — keep this list short.
const TRACKED_RELEASES: Array<{ id: number; name: string; abbrev: string; priority: number }> = [
  { id: 10,  name: "Consumer Price Index",                  abbrev: "CPI",  priority: 1 },
  { id: 21,  name: "Personal Income & Outlays (Core PCE)",   abbrev: "PCE",  priority: 1 },
  { id: 50,  name: "Employment Situation (NFP & Unemployment)", abbrev: "NFP",  priority: 1 },
  { id: 53,  name: "Gross Domestic Product",                abbrev: "GDP",  priority: 2 },
  { id: 14,  name: "Retail Sales",                          abbrev: "RTL",  priority: 2 },
  { id: 175, name: "FOMC Decision",                          abbrev: "FOMC", priority: 1 },
];

type FredReleaseDatesResp = {
  release_dates?: Array<{ release_id: number; date: string }>;
};

async function fredReleaseNext(
  id: number,
  apiKey: string,
): Promise<string | null> {
  const today = todayET();
  const url = `${FRED_RELEASE_DATES_URL}?release_id=${id}&api_key=${apiKey}&file_type=json&include_release_dates_with_no_data=true&realtime_start=${today}&sort_order=asc&limit=1`;
  try {
    const res = await fetch(url, { next: { revalidate: 21600 } }); // 6h cache
    if (!res.ok) return null;
    const json = (await res.json()) as FredReleaseDatesResp;
    return json.release_dates?.[0]?.date ?? null;
  } catch {
    return null;
  }
}

/**
 * Return upcoming key macro releases, sorted by date ascending. Limited to
 * those within `daysAhead` from today. Drops entries with no scheduled date.
 */
export async function getUpcomingReleases(daysAhead = 14): Promise<UpcomingRelease[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return [];
  const cutoffMs = Date.now() + daysAhead * 86_400_000;

  const results = await Promise.all(
    TRACKED_RELEASES.map(async (r) => {
      const date = await fredReleaseNext(r.id, apiKey);
      if (!date) return null;
      const ts = new Date(`${date}T00:00:00Z`).getTime();
      if (isNaN(ts) || ts > cutoffMs) return null;
      return { id: r.id, name: r.name, abbrev: r.abbrev, date, priority: r.priority };
    }),
  );

  return results
    .filter((r): r is UpcomingRelease => r !== null)
    .sort((a, b) => (a.date.localeCompare(b.date) || a.priority - b.priority));
}
