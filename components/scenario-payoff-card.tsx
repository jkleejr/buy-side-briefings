import type { Catalyst, KeyLevel } from "@/lib/asset-daily";
import { computeScenarios } from "@/lib/options";
import { cn, formatLevel, formatPct, todayET } from "@/lib/utils";
import Panel from "./panel";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Scenario payoff into the next catalyst. Translates the IV-implied expected
 * move (or, lacking IV, the nearest levels) into bull / base / bear price
 * outcomes and the position's P&L per $10k — so the catalyst's risk/reward is
 * a number, not a vibe.
 */
export default function ScenarioPayoffCard({
  price,
  action,
  ivPct,
  levels,
  catalysts,
  currency = "$",
}: {
  price: number;
  action: "buy" | "hold" | "sell";
  ivPct?: number | null;
  levels: KeyLevel[];
  catalysts: Catalyst[];
  currency?: string;
}) {
  const today = todayET();
  const upcoming = catalysts
    .filter((c) => DATE_RE.test(c.date) && c.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const next = upcoming[0];
  const days = next
    ? Math.max(1, Math.round((Date.parse(next.date) - Date.parse(today)) / 86_400_000))
    : 30;
  const anchorLabel = next ? next.label : "~30-day horizon";

  const set = computeScenarios(price, action, levels, {
    ivPct,
    horizonDays: days,
    anchorLabel,
  });
  if (!set) return null;

  const px = (n: number) => `${currency}${formatLevel(n)}`;

  return (
    <Panel
      code="SCEN"
      title="Scenario Payoff · Into the Catalyst"
      learn="Bull / base / bear outcomes into the next dated catalyst. With listed IV the bull and bear legs are ±1 expected move (the ~68% range, ~16% in each tail); without IV they fall back to the nearest resistance and support. 'P&L / $10k' applies the price move to the standing position — a short profits when price falls. This converts the catalyst into a risk/reward you can size against, instead of a directional guess."
      meta={
        <span>
          {next ? `T−${days}d` : "≈30d"}
          {set.expectedMove != null && <> · EM ±{px(set.expectedMove)}</>}
        </span>
      }
    >
      <div className="border-b border-[var(--border)] px-3 py-1.5 font-mono text-[10px] text-[var(--dim)]">
        <span className="text-[var(--amber-dim)]">Anchored to · </span>
        <span className="text-[var(--foreground)]">{anchorLabel}</span>
        <span className="ml-1.5">
          · {set.longBias ? "long" : "short"} position {set.byIV ? "" : "· no listed IV, using levels"}
        </span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-[var(--border)] font-mono">
        {set.legs.map((leg) => {
          const posPct = set.longBias ? leg.pct : -leg.pct;
          const pnl = (posPct / 100) * 10_000;
          const tone =
            posPct > 0
              ? "text-[var(--up)]"
              : posPct < 0
                ? "text-[var(--down)]"
                : "text-[var(--dim)]";
          return (
            <div key={leg.key} className="px-2.5 py-2">
              <div
                className={cn(
                  "text-[9px] uppercase tracking-widest",
                  leg.key === "bull"
                    ? "text-[var(--up)]"
                    : leg.key === "bear"
                      ? "text-[var(--down)]"
                      : "text-[var(--amber-dim)]",
                )}
              >
                {leg.label}
              </div>
              <div className="mt-0.5 text-[15px] font-bold tabular-nums text-[var(--foreground)]">
                {px(leg.price)}
              </div>
              <div className={cn("text-[11px] tabular-nums", tone)}>
                {formatPct(leg.pct)} {leg.prob != null && <span className="text-[var(--dim)]">· {leg.prob}%</span>}
              </div>
              <div className={cn("mt-1 text-[11px] font-bold tabular-nums", tone)}>
                {pnl >= 0 ? "+" : "−"}${Math.abs(Math.round(pnl)).toLocaleString()}
                <span className="ml-1 text-[9px] font-normal text-[var(--dim)]">/ $10k</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="border-t border-[var(--border)] px-3 py-1.5 font-mono text-[10px] leading-snug text-[var(--dim)]">
        <span className="text-[var(--amber-dim)]">Read · </span>
        {set.byIV
          ? `A ${set.longBias ? "long" : "short"} has positive skew here only if the favorable leg's payoff outweighs the ${(set.expectedMove! / price * 100).toFixed(1)}% it can move against you in the tail.`
          : "No listed IV — legs use the nearest support/resistance, so treat the probabilities as unknown and the payoffs as level-to-level."}
      </p>
    </Panel>
  );
}
