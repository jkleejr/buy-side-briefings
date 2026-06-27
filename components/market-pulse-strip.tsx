import type { MarketsVerdict, CryptoVerdict } from "@/lib/data";
import { cn, formatLevel, formatPct } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Market Pulse — the chart-free tape that gates every call on the page.
// A clean strip of the numbers that matter (equities, vol, rates, the dollar,
// crypto), each as label · value · signed delta. No sparklines, no live fetch:
// values come straight from the latest briefing snapshot, so it renders
// instantly and reads at a glance.
// ---------------------------------------------------------------------------

type Tile = {
  label: string;
  level?: number;
  prefix?: string;
  unit?: string;
  change_pct?: number;
  change_bps?: number;
  /** Grouping key — a faint divider is drawn where the group changes. */
  group: "equities" | "vol-rates" | "fx" | "crypto";
};

function delta(t: Tile): { text: string; tone: string; arrow: string } {
  const move = t.change_pct ?? t.change_bps ?? null;
  const tone =
    move == null
      ? "text-[var(--dim)]"
      : move > 0
        ? "text-[var(--up)]"
        : move < 0
          ? "text-[var(--down)]"
          : "text-[var(--dim)]";
  const arrow = move == null || move === 0 ? "" : move > 0 ? "▲" : "▼";
  if (t.change_pct !== undefined) return { text: formatPct(t.change_pct), tone, arrow };
  if (t.change_bps !== undefined)
    return { text: `${t.change_bps > 0 ? "+" : ""}${t.change_bps}bp`, tone, arrow };
  return { text: "—", tone, arrow };
}

export default function MarketPulseStrip({
  verdict,
  crypto,
}: {
  verdict: MarketsVerdict | null;
  crypto: CryptoVerdict | null;
}) {
  const s = verdict?.snapshot;
  const c = crypto?.snapshot;
  const tiles: Tile[] = (
    [
      { label: "S&P 500", level: s?.sp500?.level, change_pct: s?.sp500?.change_pct, group: "equities" },
      { label: "Nasdaq", level: s?.nasdaq?.level, change_pct: s?.nasdaq?.change_pct, group: "equities" },
      { label: "VIX", level: s?.vix?.level, change_pct: s?.vix?.change_pct, group: "vol-rates" },
      { label: "10Y UST", level: s?.ust10y?.level, unit: "%", change_bps: s?.ust10y?.change_bps, group: "vol-rates" },
      { label: "DXY", level: s?.dxy?.level, change_pct: s?.dxy?.change_pct, group: "fx" },
      { label: "BTC", level: c?.btc?.level, prefix: "$", change_pct: c?.btc?.change_pct, group: "crypto" },
      { label: "ETH", level: c?.eth?.level, prefix: "$", change_pct: c?.eth?.change_pct, group: "crypto" },
    ] as Tile[]
  ).filter((t) => t.level !== undefined);

  if (tiles.length === 0) return null;

  return (
    <div className="border border-[var(--border)] bg-[var(--panel)]">
      <div className="panel-scroll flex items-stretch overflow-x-auto font-mono">
        {tiles.map((t, i) => {
          const d = delta(t);
          // Heavier divider between groups, hairline within a group.
          const newGroup = i > 0 && tiles[i - 1].group !== t.group;
          return (
            <div
              key={t.label}
              className={cn(
                "flex min-w-[104px] flex-1 shrink-0 flex-col gap-1 px-3.5 py-2.5",
                i > 0 && "border-l",
                newGroup ? "border-[var(--border-strong)]" : "border-[var(--border)]",
              )}
            >
              <span className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                {t.label}
              </span>
              <span className="text-[17px] font-bold leading-none tabular-nums text-[var(--foreground)]">
                {t.prefix ?? ""}
                {formatLevel(t.level as number)}
                {t.unit ?? ""}
              </span>
              <span className={cn("flex items-baseline gap-1 text-[10px] tabular-nums leading-none", d.tone)}>
                {d.arrow && <span className="text-[8px]">{d.arrow}</span>}
                {d.text}
              </span>
            </div>
          );
        })}
      </div>
      {verdict && (
        <div className="border-t border-[var(--border)] px-3.5 py-1 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
          Levels as of {verdict.date} {verdict.window} briefing
        </div>
      )}
    </div>
  );
}
