import { getMacroSnapshot } from "@/lib/macro";
import Panel from "./panel";

export const revalidate = 3600;

function fmtPct(n: number | null | undefined, digits = 2): string {
  return n === null || n === undefined ? "—" : `${n.toFixed(digits)}%`;
}

export default async function FedPanel() {
  const m = await getMacroSnapshot();

  const items: {
    label: string;
    value: string;
    hint?: string;
    flag?: "ok" | "warn" | "alert";
  }[] = [
    {
      label: "Fed Funds",
      value: `${m.fed.funds_target_low.toFixed(2)}–${m.fed.funds_target_high.toFixed(2)}%`,
      hint: m.fed.funds_effective !== null ? `Eff ${fmtPct(m.fed.funds_effective)}` : undefined,
    },
    {
      label: "Next FOMC",
      value: m.fed.next_fomc_label,
      hint: m.fed.next_fomc_date,
    },
    {
      label: "10Y Yield",
      value: fmtPct(m.yields?.ust10y, 2),
      hint: m.yields?.as_of ? `as of ${m.yields.as_of}` : undefined,
    },
    {
      label: "2s10s",
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
      value: fmtPct(m.yields?.real_10y_pct, 2),
      hint: "TIPS",
    },
    {
      label: "Balance Sheet",
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
      value: fmtPct(m.inflation.cpi_yoy_pct, 1),
      hint: `Core ${fmtPct(m.inflation.core_cpi_yoy_pct, 1)}`,
    },
    {
      label: "Core PCE",
      value: fmtPct(m.inflation.core_pce_yoy_pct, 1),
      hint: m.inflation.core_pce_release_date,
    },
    {
      label: "Unemployment",
      value: fmtPct(m.labor.unemployment_rate_pct, 1),
      hint: `NFP ${m.labor.nonfarm_payrolls_thousands !== null ? `+${m.labor.nonfarm_payrolls_thousands}k` : "—"}`,
    },
  ];

  return (
    <Panel
      code="MACRO"
      title="Fed & Macro"
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
    </Panel>
  );
}
