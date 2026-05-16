import { getMacroSnapshot } from "@/lib/macro";
import Panel from "./panel";
import Tooltip from "./tooltip";

export const revalidate = 3600;

function fmtPct(n: number | null | undefined, digits = 2): string {
  return n === null || n === undefined ? "—" : `${n.toFixed(digits)}%`;
}

export default async function FedPanel() {
  const m = await getMacroSnapshot();

  const items: {
    label: string;
    tip: string;
    value: string;
    hint?: string;
    flag?: "ok" | "warn" | "alert";
  }[] = [
    {
      label: "Fed Funds",
      tip: "The Federal Reserve's target overnight lending rate — the benchmark for every short-term rate in the US. Shown as the target range (e.g., 4.25–4.50%) with the effective rate (where transactions actually clear) underneath.",
      value: `${m.fed.funds_target_low.toFixed(2)}–${m.fed.funds_target_high.toFixed(2)}%`,
      hint: m.fed.funds_effective !== null ? `Eff ${fmtPct(m.fed.funds_effective)}` : undefined,
    },
    {
      label: "Next FOMC",
      tip: "Federal Open Market Committee meeting — the Fed's policy committee meets 8 times a year. This is when rate decisions are announced. Markets often whipsaw around these dates, especially on the Powell press conference.",
      value: m.fed.next_fomc_label,
      hint: m.fed.next_fomc_date,
    },
    {
      label: "10Y Yield",
      tip: "Yield on the 10-year US Treasury note — the most-watched 'risk-free' rate in the world. Used to discount future cash flows. Rising 10Y = bond prices down, mortgages up, growth stocks pressured. Falling 10Y = the opposite (and often a recession signal if it falls fast).",
      value: fmtPct(m.yields?.ust10y, 2),
      hint: m.yields?.as_of ? `as of ${m.yields.as_of}` : undefined,
    },
    {
      label: "2s10s",
      tip: "10Y yield minus 2Y yield in basis points (1bp = 0.01%). When this is negative ('inverted'), the bond market is pricing slower growth ahead — historically preceded recessions by 6–18 months. Positive and steep = normal expansion.",
      value:
        m.yields?.spread_2s10s_bps !== null && m.yields?.spread_2s10s_bps !== undefined
          ? `${m.yields.spread_2s10s_bps > 0 ? "+" : ""}${m.yields.spread_2s10s_bps}bps`
          : "—",
      hint:
        m.yields?.spread_2s10s_bps !== null && m.yields?.spread_2s10s_bps !== undefined
          ? m.yields.spread_2s10s_bps < 0
            ? "Inverted"
            : m.yields.spread_2s10s_bps < 25
              ? "Flat"
              : "Steep"
          : undefined,
      flag:
        m.yields?.spread_2s10s_bps !== null && m.yields?.spread_2s10s_bps !== undefined
          ? m.yields.spread_2s10s_bps < 0
            ? "alert"
            : m.yields.spread_2s10s_bps < 25
              ? "warn"
              : "ok"
          : undefined,
    },
    {
      label: "10Y Real",
      tip: "10-year nominal yield minus market-implied inflation expectations, derived from TIPS (Treasury Inflation-Protected Securities). The 'real' cost of money. Rising real yields tighten financial conditions even if nominal yields are flat — risk-on assets feel it first.",
      value: fmtPct(m.yields?.real_10y_pct, 2),
      hint: "TIPS",
    },
    {
      label: "Balance Sheet",
      tip: "Total assets on the Fed's balance sheet. Growing = quantitative easing (QE), adds liquidity to markets. Shrinking = quantitative tightening (QT), drains liquidity. Big regime variable for risk assets.",
      value:
        m.fed.balance_sheet_trillions !== null
          ? `$${m.fed.balance_sheet_trillions.toFixed(2)}T`
          : "—",
      hint: m.fed.balance_sheet_direction
        ? `${m.fed.balance_sheet_direction} (QT)`
        : undefined,
    },
    {
      label: "CPI YoY",
      tip: "Consumer Price Index, year-over-year percent change. The headline inflation number people quote. 'Core' below strips out volatile food and energy for a cleaner trend signal. Both matter to the Fed.",
      value: fmtPct(m.inflation.cpi_yoy_pct, 1),
      hint: `Core ${fmtPct(m.inflation.core_cpi_yoy_pct, 1)}`,
    },
    {
      label: "Core PCE",
      tip: "Personal Consumption Expenditures price index, excluding food and energy. The Fed's preferred inflation gauge — 2% is the official target. Tends to run slightly below Core CPI because of methodology differences.",
      value: fmtPct(m.inflation.core_pce_yoy_pct, 1),
      hint: m.inflation.core_pce_release_date,
    },
    {
      label: "Unemployment",
      tip: "US unemployment rate (% of the labor force without work and actively looking). Rising = labor market loosening — can mean recession or just cooling of overheating. NFP below = nonfarm payrolls jobs added that month (the headline jobs print).",
      value: fmtPct(m.labor.unemployment_rate_pct, 1),
      hint: `NFP ${m.labor.nonfarm_payrolls_thousands !== null ? `+${m.labor.nonfarm_payrolls_thousands}k` : "—"}`,
    },
  ];

  return (
    <Panel
      code="MACRO"
      title="Fed & Macro"
      learn="The macro backdrop — Fed policy, yields, inflation, jobs. These move slowly but they're the gravity behind every market regime. Mix of live FRED (Federal Reserve Economic Data) and manually maintained values. Click the title for the full Fed & Macro detail page."
      href="/macro"
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
      <div className="grid grid-cols-3 divide-x divide-y divide-[var(--border)]">
        {items.map((it) => {
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
                <Tooltip text={it.tip}>{it.label}</Tooltip>
              </div>
              <div className={`mt-0.5 font-mono text-[13px] ${flagText}`}>{it.value}</div>
              {it.hint && (
                <div className="font-mono text-[10px] text-[var(--dim)]">{it.hint}</div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
