import { getMacroSnapshot, type MacroSnapshot } from "@/lib/macro";
import Panel from "./panel";

export const revalidate = 3600;

type Tile = {
  label: string;
  value: string;
  hint?: string;
  flag?: "ok" | "warn" | "alert";
};

function fmtPct(n: number | null | undefined, digits = 1, signed = false): string {
  if (n === null || n === undefined) return "—";
  const sign = signed && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

// "2026-06-01" -> "Jun 2026" — FRED observation dates are the data month.
function fmtMonth(date: string | null | undefined): string | undefined {
  if (!date) return undefined;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = parseInt(date.slice(5, 7), 10);
  return m >= 1 && m <= 12 ? `${months[m - 1]} ${date.slice(0, 4)}` : date;
}

function TileGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-3 divide-x divide-y divide-[var(--border)]">
      {tiles.map((it) => {
        const flagBg =
          it.flag === "alert"
            ? "bg-[rgba(239,68,68,0.06)]"
            : it.flag === "warn"
              ? "bg-[rgba(255,165,0,0.06)]"
              : "";
        const flagText =
          it.flag === "alert"
            ? "text-[var(--down)]"
            : it.flag === "warn"
              ? "text-[var(--amber)]"
              : "text-[var(--foreground)]";
        return (
          <div key={it.label} className={`px-2 py-1.5 ${flagBg}`}>
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--amber-dim)]">
              {it.label}
            </div>
            <div className={`mt-0.5 font-mono text-[13px] ${flagText}`}>{it.value}</div>
            {it.hint && (
              <div className="font-mono text-[10px] text-[var(--dim)]">{it.hint}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function policyTiles(m: MacroSnapshot): Tile[] {
  const eff = m.fed.funds_effective;
  const ust2y = m.yields?.ust2y ?? null;
  // 2Y vs effective funds is the market's verdict on where policy goes next.
  const gap = eff !== null && ust2y !== null ? Math.round((ust2y - eff) * 100) : null;
  const spread = m.yields?.spread_2s10s_bps ?? null;
  return [
    {
      label: "Target Range",
      value: `${m.fed.funds_target_low.toFixed(2)}–${m.fed.funds_target_high.toFixed(2)}%`,
      hint: eff !== null ? `Eff ${fmtPct(eff, 2)}` : undefined,
    },
    {
      label: "Last Move",
      value: m.fed.last_change_action ?? "—",
      hint: m.fed.last_change_date,
    },
    {
      label: "Next FOMC",
      value: m.fed.next_fomc_label,
      hint: m.fed.next_fomc_date,
    },
    {
      label: "2Y Yield",
      value: fmtPct(ust2y, 2),
      hint:
        gap === null
          ? "market's policy path"
          : gap > 25
            ? `${gap}bps over funds — pricing hikes`
            : gap < -25
              ? `${-gap}bps under funds — pricing cuts`
              : "in line with funds rate",
      flag: gap !== null && Math.abs(gap) > 25 ? "warn" : undefined,
    },
    {
      label: "10Y Yield",
      value: fmtPct(m.yields?.ust10y, 2),
      hint: m.yields?.as_of ? `as of ${m.yields.as_of}` : undefined,
    },
    {
      label: "2s10s",
      value: spread !== null ? `${spread > 0 ? "+" : ""}${spread}bps` : "—",
      hint:
        spread !== null
          ? spread < 0
            ? "Inverted"
            : spread < 25
              ? "Flat"
              : "Steep"
          : undefined,
      flag:
        spread !== null ? (spread < 0 ? "alert" : spread < 25 ? "warn" : "ok") : undefined,
    },
    {
      label: "10Y Real",
      value: fmtPct(m.yields?.real_10y_pct, 2),
      hint: "TIPS yield, after inflation",
    },
    {
      label: "Balance Sheet",
      value:
        m.fed.balance_sheet_trillions !== null
          ? `$${m.fed.balance_sheet_trillions.toFixed(2)}T`
          : "—",
      hint: m.fed.balance_sheet_direction ?? undefined,
    },
    {
      label: "This Cycle",
      value: m.fed.cycle_label ?? "—",
      hint: m.fed.cycle_hint,
    },
  ];
}

function inflationTiles(m: MacroSnapshot): Tile[] {
  const corePce = m.inflation.core_pce_yoy_pct;
  const realWage =
    m.labor.wage_growth_yoy_pct !== null &&
    m.labor.wage_growth_yoy_pct !== undefined &&
    m.inflation.cpi_yoy_pct !== null
      ? m.labor.wage_growth_yoy_pct - m.inflation.cpi_yoy_pct
      : null;
  return [
    {
      label: "CPI YoY",
      value: fmtPct(m.inflation.cpi_yoy_pct, 1),
      hint: `${fmtMonth(m.inflation.cpi_release_date)} · MoM ${fmtPct(m.inflation.cpi_mom_pct, 1, true)}`,
      flag:
        m.inflation.cpi_yoy_pct !== null && m.inflation.cpi_yoy_pct > 3 ? "warn" : undefined,
    },
    {
      label: "Core CPI YoY",
      value: fmtPct(m.inflation.core_cpi_yoy_pct, 1),
      hint: "ex food & energy",
    },
    {
      label: "PCE YoY",
      value: fmtPct(m.inflation.pce_yoy_pct, 1),
      hint: "broader basket than CPI",
    },
    {
      label: "Core PCE YoY",
      value: fmtPct(corePce, 1),
      hint: "the Fed's gauge · 2% goal",
      flag:
        corePce !== null && corePce !== undefined
          ? corePce > 3.5
            ? "alert"
            : corePce > 2.5
              ? "warn"
              : "ok"
          : undefined,
    },
    {
      label: "Dollar Buys",
      value:
        m.inflation.purchasing_power_cents !== null &&
        m.inflation.purchasing_power_cents !== undefined
          ? `${m.inflation.purchasing_power_cents.toFixed(1)}¢`
          : "—",
      hint: `of a 1982-84 dollar · ${fmtPct(m.inflation.purchasing_power_yoy_pct, 1, true)} YoY`,
    },
    {
      label: "Real Wages",
      value: fmtPct(realWage, 1, true),
      hint: "wage growth minus CPI",
      flag: realWage !== null && realWage < 0 ? "warn" : undefined,
    },
  ];
}

function growthTiles(m: MacroSnapshot): Tile[] {
  const ismFlag = (v: number | null): Tile["flag"] =>
    v === null ? undefined : v >= 50 ? "ok" : v >= 45 ? "warn" : "alert";
  const gdp = m.growth.gdp_qoq_annualized_pct;
  return [
    {
      label: "GDP",
      value: fmtPct(gdp, 1, true),
      hint: `${m.growth.gdp_quarter_label ?? ""} · QoQ annualized`.trim(),
      flag: gdp !== null ? (gdp < 0 ? "alert" : gdp < 1 ? "warn" : "ok") : undefined,
    },
    {
      label: "ISM Mfg",
      value: m.growth.ism_manufacturing?.toFixed(1) ?? "—",
      hint: "above 50 = expansion",
      flag: ismFlag(m.growth.ism_manufacturing),
    },
    {
      label: "ISM Services",
      value: m.growth.ism_services?.toFixed(1) ?? "—",
      hint: "above 50 = expansion",
      flag: ismFlag(m.growth.ism_services),
    },
    {
      label: "Retail Sales",
      value: fmtPct(m.growth.retail_sales_yoy_pct, 1, true),
      hint: `YoY · ${fmtMonth(m.growth.retail_sales_release_date) ?? ""}`.trim(),
    },
    {
      label: "Industrial Prod",
      value: fmtPct(m.growth.industrial_production_yoy_pct, 1, true),
      hint: `YoY · ${fmtMonth(m.growth.industrial_production_release_date) ?? ""}`.trim(),
    },
  ];
}

function laborTiles(m: MacroSnapshot): Tile[] {
  const nfp = m.labor.nonfarm_payrolls_thousands;
  return [
    {
      label: "Unemployment",
      value: fmtPct(m.labor.unemployment_rate_pct, 1),
      hint: fmtMonth(m.labor.unemployment_release_date),
      flag:
        m.labor.unemployment_rate_pct !== null && m.labor.unemployment_rate_pct >= 4.5
          ? "warn"
          : undefined,
    },
    {
      label: "Payrolls (NFP)",
      value: nfp !== null ? `${nfp > 0 ? "+" : ""}${nfp}k` : "—",
      hint: `${fmtMonth(m.labor.nonfarm_release_date) ?? ""} · jobs added`.trim(),
      flag: nfp !== null ? (nfp < 0 ? "alert" : nfp < 100 ? "warn" : "ok") : undefined,
    },
    {
      label: "Participation",
      value: fmtPct(m.labor.participation_rate_pct, 1),
      hint: "share of adults working or looking",
    },
    {
      label: "Wage Growth",
      value: fmtPct(m.labor.wage_growth_yoy_pct, 1, true),
      hint: "avg hourly earnings YoY",
    },
  ];
}

export default async function MacroSections() {
  const m = await getMacroSnapshot();
  return (
    <>
      <Panel
        title="Interest rates & monetary policy"
        meta={
          <a
            href={m.fed.fed_watch_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--cyan-term)] hover:underline"
          >
            FEDWATCH ▸
          </a>
        }
      >
        <TileGrid tiles={policyTiles(m)} />
      </Panel>
      <Panel title="Inflation & purchasing power">
        <TileGrid tiles={inflationTiles(m)} />
      </Panel>
      <Panel title="Economic growth & activity">
        <TileGrid tiles={growthTiles(m)} />
      </Panel>
      <Panel title="Unemployment & labor">
        <TileGrid tiles={laborTiles(m)} />
      </Panel>
    </>
  );
}
