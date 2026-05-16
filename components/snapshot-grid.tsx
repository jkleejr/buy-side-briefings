import type { MarketsVerdict } from "@/lib/data";
import { formatLevel, formatPct } from "@/lib/utils";
import { TICKER_TIPS } from "@/lib/glossary";
import Panel from "./panel";
import Tooltip from "./tooltip";

type Row = {
  label: string;
  level?: number;
  change_pct?: number;
  change_bps?: number;
  unit?: string;
};

export default function SnapshotGrid({ verdict }: { verdict: MarketsVerdict }) {
  const s = verdict.snapshot;
  const rows: Row[] = [
    { label: "S&P 500", level: s.sp500?.level, change_pct: s.sp500?.change_pct },
    { label: "NDX", level: s.nasdaq?.level, change_pct: s.nasdaq?.change_pct },
    { label: "VIX", level: s.vix?.level, change_pct: s.vix?.change_pct },
    { label: "10Y", level: s.ust10y?.level, change_bps: s.ust10y?.change_bps, unit: "%" },
    { label: "DXY", level: s.dxy?.level, change_pct: s.dxy?.change_pct },
  ];

  return (
    <Panel
      code="SNAP"
      title="Market Snapshot · Briefing Time"
      learn="The major index and rate levels captured at the moment the briefing was written — what the analyst was actually looking at. Differs from the live ticker at the top of the page, which is real-time."
    >
      <table className="w-full font-mono text-[11px]">
        <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
          <tr>
            <th className="px-2 py-1 text-left font-normal">Asset</th>
            <th className="px-2 py-1 text-right font-normal">Level</th>
            <th className="px-2 py-1 text-right font-normal">Chg</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isPct = r.change_pct !== undefined;
            const move = r.change_pct ?? r.change_bps ?? 0;
            const up = move > 0;
            const down = move < 0;
            const cls = up
              ? "text-[var(--up)]"
              : down
                ? "text-[var(--down)]"
                : "text-[var(--dim)]";
            const tip = TICKER_TIPS[r.label] ?? "";
            return (
              <tr key={r.label} className="border-t border-[var(--border)]">
                <td className="px-2 py-1 text-[var(--amber-dim)]">
                  {tip ? <Tooltip text={tip}>{r.label}</Tooltip> : r.label}
                </td>
                <td className="px-2 py-1 text-right text-[var(--foreground)]">
                  {r.level !== undefined ? formatLevel(r.level) : "—"}
                  {r.unit ?? ""}
                </td>
                <td className={`px-2 py-1 text-right ${cls}`}>
                  {isPct
                    ? r.change_pct !== undefined
                      ? formatPct(r.change_pct)
                      : "—"
                    : r.change_bps !== undefined
                      ? `${r.change_bps > 0 ? "+" : ""}${r.change_bps}bps`
                      : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
