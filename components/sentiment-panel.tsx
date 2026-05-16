import { getMacroSnapshot } from "@/lib/macro";
import Panel from "./panel";
import Tooltip from "./tooltip";

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
      tip: "American Association of Individual Investors weekly survey — % of retail investors who say they're bullish on the next 6 months. Bears% shown below. >55% bulls is historically a contrarian sell signal (everyone's already in).",
      value: m.sentiment.aaii_bull_pct === null ? "—" : `${m.sentiment.aaii_bull_pct}%`,
      hint: `Bears ${m.sentiment.aaii_bear_pct === null ? "—" : `${m.sentiment.aaii_bear_pct}%`}`,
      cls: "text-[var(--foreground)]",
    },
    {
      label: "Fear & Greed",
      tip: "CNN's 0–100 composite of 7 market-mood indicators (put/call ratio, momentum, breadth, safe-haven demand, etc.). >75 = extreme greed (vulnerable to shocks). <25 = extreme fear (often a contrarian buy zone).",
      value: fear ?? "—",
      hint: m.sentiment.fear_greed_label,
      cls: fearColor,
    },
    {
      label: "S&P Fwd P/E",
      tip: "S&P 500 index level ÷ next-12-month consensus earnings per share. The most common quick valuation gauge. Long-run avg is ~16–18x. >22x = priced for perfection and exposed to multiple compression.",
      value: fwdPe ?? "—",
      hint: peFlag ?? "",
      cls: "text-[var(--foreground)]",
    },
    {
      label: "Shiller CAPE",
      tip: "Cyclically Adjusted P/E — price divided by the 10-year average inflation-adjusted earnings. Smooths out the earnings cycle so peaks and troughs don't fool you. 100-year average ≈ 17. Currently elevated = long-term forward returns likely lower than history.",
      value: m.valuation.shiller_cape ?? "—",
      hint: "100yr avg ~17",
      cls: "text-[var(--foreground)]",
    },
  ];

  return (
    <Panel
      code="SENT"
      title="Positioning & Valuation"
      learn="How positioned and how expensive the market is. Sentiment surveys say how bullish/bearish investors already are (a contrarian signal — extremes tend to reverse). Valuation metrics say what you're paying for $1 of S&P earnings."
    >
      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label} className="px-2 py-1.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--amber-dim)]">
              <Tooltip text={r.tip}>{r.label}</Tooltip>
            </div>
            <div className={`mt-0.5 font-mono text-[16px] ${r.cls}`}>{r.value}</div>
            <div className="font-mono text-[10px] text-[var(--dim)]">{r.hint}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
