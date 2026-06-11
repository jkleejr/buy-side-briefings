import Link from "next/link";
import type { OpenRisk } from "@/lib/risk";
import { cn } from "@/lib/utils";
import Panel from "./panel";

// ---------------------------------------------------------------------------
// Open-book risk: the one number nobody computes by hand — if every open
// idea's stop hits, how much does the account bleed? Plus gross/net exposure
// and theme concentration (five tickers can secretly be one trade).
// ---------------------------------------------------------------------------

function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export default function RiskPanel({ risk }: { risk: OpenRisk }) {
  const top = risk.rows.filter((r) => r.risk_pct !== null).slice(0, 3);
  const maxTheme = risk.themes[0]?.weight_pct ?? 0;

  return (
    <Panel
      code="BOOK"
      title="Open Risk"
      learn="Plan-level risk across every open idea, straight from the published numbers: MAX BLEED is the total account loss if every stop hits (position size × entry-to-stop distance, summed). GROSS L/S is the total position weight long vs short. THEMES sums position weight per tag across ideas sharing it — if one theme carries a large slice of the book, several tickers are secretly the same trade."
      meta={<span>{risk.rows.length} OPEN</span>}
    >
      <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-b border-[var(--border)] font-mono">
        <div className="px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Max bleed
          </div>
          <div className="mt-0.5 text-[15px] font-bold tabular-nums text-[var(--down)]">
            −{pct(risk.max_bleed_pct)}
          </div>
          <div className="text-[9px] leading-tight text-[var(--dim)]">
            if every stop hits{risk.unsized > 0 ? ` · ${risk.unsized} unsized` : ""}
          </div>
        </div>
        <div className="px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Gross L / S
          </div>
          <div className="mt-0.5 text-[15px] font-bold tabular-nums">
            <span className="text-[var(--up)]">{pct(risk.gross_long_pct, 0)}</span>
            <span className="text-[var(--dim)]"> / </span>
            <span className="text-[var(--down)]">{pct(risk.gross_short_pct, 0)}</span>
          </div>
          <div className="text-[9px] leading-tight text-[var(--dim)]">position weight</div>
        </div>
        <div className="px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Net
          </div>
          <div
            className={cn(
              "mt-0.5 text-[15px] font-bold tabular-nums",
              risk.net_pct > 0
                ? "text-[var(--up)]"
                : risk.net_pct < 0
                  ? "text-[var(--down)]"
                  : "text-[var(--dim)]",
            )}
          >
            {risk.net_pct > 0 ? "+" : ""}
            {pct(risk.net_pct, 0)}
          </div>
          <div className="text-[9px] leading-tight text-[var(--dim)]">long bias</div>
        </div>
      </div>

      {/* Biggest single-idea risks */}
      {top.length > 0 && (
        <ul className="divide-y divide-[var(--border)] border-b border-[var(--border)] font-mono text-[10px]">
          {top.map((r) => (
            <li key={r.id} className="flex items-baseline gap-2 px-2 py-1">
              <Link
                href={`/opportunities/${r.id}`}
                className="text-[var(--amber)] hover:underline"
              >
                {r.ticker}
              </Link>
              <span className="uppercase text-[var(--dim)]">{r.direction.replace("_", " ")}</span>
              <span className="ml-auto tabular-nums text-[var(--dim)]">
                {r.weight_pct}% × {pct(r.stop_distance_pct!)} ={" "}
                <span className="text-[var(--down)]">−{pct(r.risk_pct!, 2)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Theme concentration */}
      {risk.themes.length > 0 && (
        <ul className="divide-y divide-[var(--border)] font-mono text-[10px]">
          {risk.themes.map((t) => (
            <li key={t.tag} className="px-2 py-1">
              <div className="flex items-baseline gap-2">
                <span className="uppercase tracking-wider text-[var(--foreground)]">{t.tag}</span>
                <span className="text-[var(--dim)]">×{t.count}</span>
                <span className="ml-auto tabular-nums text-[var(--foreground)]">
                  {pct(t.weight_pct, 0)}
                </span>
              </div>
              <div className="mt-0.5 h-1 w-full overflow-hidden bg-[var(--panel-head)]">
                <div
                  className={cn(
                    "h-full",
                    t.weight_pct >= 15 ? "bg-[var(--amber)]" : "bg-[var(--up)]",
                  )}
                  style={{ width: `${maxTheme > 0 ? (t.weight_pct / maxTheme) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
