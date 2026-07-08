import { getMacroSnapshot } from "@/lib/macro";
import Panel from "./panel";

export const revalidate = 3600;

export default async function SentimentPanel() {
  const m = await getMacroSnapshot();
  const fear = m.sentiment.fear_greed_value;
  const fearColor =
    fear === null
      ? "text-[var(--foreground)]"
      : fear >= 80
        ? "text-[var(--down)]"
        : fear >= 60
          ? "text-[var(--amber)]"
          : fear >= 40
            ? "text-[var(--foreground)]"
            : fear >= 20
              ? "text-[var(--up)]"
              : "text-[var(--up)]";

  const fwdPe = m.valuation.sp500_forward_pe;
  const peFlag =
    fwdPe === null ? null : fwdPe >= 22 ? "rich" : fwdPe <= 17 ? "cheap" : "neutral";

  const rows = [
    {
      label: "AAII Bulls",
      value: m.sentiment.aaii_bull_pct === null ? "—" : `${m.sentiment.aaii_bull_pct}%`,
      hint: `Bears ${m.sentiment.aaii_bear_pct === null ? "—" : `${m.sentiment.aaii_bear_pct}%`}`,
      cls: "text-[var(--foreground)]",
    },
    {
      label: "Fear & Greed",
      value: fear ?? "—",
      hint: m.sentiment.fear_greed_label,
      cls: fearColor,
    },
    {
      label: "S&P Fwd P/E",
      value: fwdPe ?? "—",
      hint: peFlag ?? "",
      cls: "text-[var(--foreground)]",
    },
    {
      label: "Shiller CAPE",
      value: m.valuation.shiller_cape ?? "—",
      hint: "100yr avg ~17",
      cls: "text-[var(--foreground)]",
    },
  ];

  return (
    <Panel
      code="SENT"
      title="Positioning & Valuation"
    >
      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label} className="px-2 py-1.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--amber-dim)]">
              {r.label}
            </div>
            <div className={`mt-0.5 font-mono text-[16px] ${r.cls}`}>{r.value}</div>
            <div className="font-mono text-[10px] text-[var(--dim)]">{r.hint}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
