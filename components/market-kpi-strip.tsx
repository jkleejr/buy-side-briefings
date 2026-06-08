import type { MarketsVerdict, CryptoVerdict } from "@/lib/data";
import { cn, formatLevel, formatPct } from "@/lib/utils";

type Kpi = {
  label: string;
  level?: number;
  /** Pre-formatted suffix on the value, e.g. "%". */
  unit?: string;
  /** Pre-formatted prefix on the value, e.g. "$". */
  prefix?: string;
  change_pct?: number;
  change_bps?: number;
};

function changeText(k: Kpi): { text: string; tone: string } {
  const move = k.change_pct ?? k.change_bps ?? null;
  const tone =
    move === null
      ? "text-[var(--dim)]"
      : move > 0
        ? "text-[var(--up)]"
        : move < 0
          ? "text-[var(--down)]"
          : "text-[var(--dim)]";
  if (k.change_pct !== undefined) {
    return { text: `${k.change_pct > 0 ? "▲" : k.change_pct < 0 ? "▼" : ""} ${formatPct(k.change_pct)}`, tone };
  }
  if (k.change_bps !== undefined) {
    return { text: `${k.change_bps > 0 ? "+" : ""}${k.change_bps}bp`, tone };
  }
  return { text: "—", tone };
}

/**
 * At-a-glance market header: a single row of compact KPI tiles (equities,
 * vol, rates, dollar, crypto) built from the latest briefing snapshots.
 * Evenly fills the width on desktop; scrolls horizontally on mobile.
 */
export default function MarketKpiStrip({
  verdict,
  crypto,
}: {
  verdict: MarketsVerdict | null;
  crypto: CryptoVerdict | null;
}) {
  const s = verdict?.snapshot;
  const c = crypto?.snapshot;
  const kpis: Kpi[] = [
    { label: "S&P 500", level: s?.sp500?.level, change_pct: s?.sp500?.change_pct },
    { label: "Nasdaq", level: s?.nasdaq?.level, change_pct: s?.nasdaq?.change_pct },
    { label: "VIX", level: s?.vix?.level, change_pct: s?.vix?.change_pct },
    { label: "10Y UST", level: s?.ust10y?.level, unit: "%", change_bps: s?.ust10y?.change_bps },
    { label: "DXY", level: s?.dxy?.level, change_pct: s?.dxy?.change_pct },
    { label: "BTC", level: c?.btc?.level, prefix: "$", change_pct: c?.btc?.change_pct },
    { label: "ETH", level: c?.eth?.level, prefix: "$", change_pct: c?.eth?.change_pct },
  ].filter((k) => k.level !== undefined);

  if (kpis.length === 0) return null;

  return (
    <div className="border border-[var(--border)] bg-[var(--panel)]">
      <div className="panel-scroll flex items-stretch divide-x divide-[var(--border)] overflow-x-auto font-mono">
        {kpis.map((k) => {
          const ch = changeText(k);
          return (
            <div
              key={k.label}
              className="flex min-w-[112px] flex-1 shrink-0 flex-col justify-between gap-0.5 px-3 py-1.5"
            >
              <span className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                {k.label}
              </span>
              <span className="text-[15px] font-bold tabular-nums leading-none text-[var(--foreground)]">
                {k.prefix ?? ""}
                {formatLevel(k.level as number)}
                {k.unit ?? ""}
              </span>
              <span className={cn("text-[10px] tabular-nums leading-none", ch.tone)}>{ch.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
