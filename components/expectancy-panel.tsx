import type { Opportunity } from "@/lib/data";
import { expectancyByConviction, expectancyStats, type ExpectancyStats } from "@/lib/trade-math";
import { cn, formatPct } from "@/lib/utils";
import Panel from "./panel";

const fmtNum = (n: number | null, d = 2): string =>
  n == null ? "—" : !Number.isFinite(n) ? "∞" : n.toFixed(d);

const toneFor = (n: number | null, good = 0): string =>
  n == null ? "text-[var(--dim)]" : n > good ? "text-[var(--up)]" : n < good ? "text-[var(--down)]" : "text-[var(--dim)]";

/**
 * #2 — Edge & expectancy. The metrics that say whether the journal actually
 * has an edge (and where it comes from): expectancy per trade, profit factor,
 * payoff ratio, win rate, and a per-trade Sharpe — plus the same expectancy
 * split by conviction so you press the buckets that earn.
 */
export default function ExpectancyPanel({ opps }: { opps: Opportunity[] }) {
  const s = expectancyStats(opps);
  const byConv = expectancyByConviction(opps);

  if (s.n === 0) {
    return (
      <Panel code="EDGE" title="Edge & Expectancy">
        <div className="p-3 text-center font-mono text-[11px] text-[var(--dim)]">
          No closed trades yet — expectancy needs realized outcomes.
        </div>
      </Panel>
    );
  }

  const tiles: { label: string; value: string; tone: string; sub: string }[] = [
    {
      label: "Expectancy / trade",
      value: s.expectancyPct == null ? "—" : formatPct(s.expectancyPct),
      tone: toneFor(s.expectancyPct),
      sub: "avg return per closed idea",
    },
    {
      label: "Profit factor",
      value: fmtNum(s.profitFactor),
      tone: toneFor(s.profitFactor == null ? null : s.profitFactor - 1),
      sub: "gross win ÷ gross loss",
    },
    {
      label: "Payoff ratio",
      value: fmtNum(s.payoffRatio),
      tone: toneFor(s.payoffRatio == null ? null : s.payoffRatio - 1),
      sub: "avg win ÷ avg loss",
    },
    {
      label: "Win rate",
      value: s.winRatePct == null ? "—" : `${s.winRatePct.toFixed(0)}%`,
      tone: "text-[var(--foreground)]",
      sub: `${s.wins}W · ${s.losses}L of ${s.n}`,
    },
    {
      label: "Sharpe / trade",
      value: fmtNum(s.sharpe),
      tone: toneFor(s.sharpe),
      sub: "mean ÷ std of returns",
    },
  ];

  // Plain-English read of where the edge lives.
  const read =
    s.expectancyPct == null
      ? null
      : s.expectancyPct <= 0
        ? "Negative expectancy — the journal is not yet making money per trade; the edge has to come from selectivity or sizing."
        : (s.payoffRatio ?? 0) >= 1.5 && (s.winRatePct ?? 0) < 55
          ? "Edge is in the payoff: wins are larger than losses, so it profits even below a 50% hit rate. Let winners run; keep losses at the stop."
          : (s.winRatePct ?? 0) >= 60
            ? "Edge is in the hit rate: most ideas work. Watch that the occasional loss stays small — a fat tail can erase many wins."
            : "Positive expectancy from a balance of hit rate and payoff. Sizing winners up is the lever from here.";

  return (
    <Panel
      code="EDGE"
      title="Edge & Expectancy"
      learn="The bottom-line profitability stats for the closed trade journal. Expectancy = average return per trade (the number that, times trades, is your P&L). Profit factor = total winnings ÷ total losses; above 1.0 makes money, above 2.0 is strong. Payoff ratio = average win ÷ average loss; a high payoff lets you profit below a 50% win rate. Sharpe here is per-trade (mean ÷ standard deviation of returns) — consistency, not just size. Read these together: a low win rate with a high payoff is a perfectly good system."
      meta={<span>{s.n} CLOSED</span>}
    >
      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] font-mono sm:grid-cols-5 sm:divide-y-0">
        {tiles.map((t) => (
          <div key={t.label} className="px-2.5 py-2">
            <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
              {t.label}
            </div>
            <div className={cn("mt-0.5 text-[16px] font-bold tabular-nums", t.tone)}>
              {t.value}
            </div>
            <div className="text-[9px] leading-tight text-[var(--dim)]">{t.sub}</div>
          </div>
        ))}
      </div>

      <table className="w-full border-t border-[var(--border)] font-mono text-[11px]">
        <thead className="bg-[var(--panel-head)] text-[9px] uppercase tracking-wider text-[var(--dim)]">
          <tr>
            <th className="px-2.5 py-1 text-left font-normal">Conviction</th>
            <th className="px-2 py-1 text-right font-normal">N</th>
            <th className="px-2 py-1 text-right font-normal">Win %</th>
            <th className="px-2 py-1 text-right font-normal">Payoff</th>
            <th className="px-2 py-1 text-right font-normal">Profit factor</th>
            <th className="px-2.5 py-1 text-right font-normal">Expectancy</th>
          </tr>
        </thead>
        <tbody>
          {byConv.map(({ conv, stats }) => (
            <tr key={conv} className="border-t border-[var(--border)]">
              <td className="px-2.5 py-0.5 uppercase text-[var(--amber)]">{conv}</td>
              <td className="px-2 py-0.5 text-right text-[var(--foreground)]">{stats.n}</td>
              <td className="px-2 py-0.5 text-right text-[var(--foreground)]">
                {stats.winRatePct == null ? "—" : `${stats.winRatePct.toFixed(0)}%`}
              </td>
              <td className="px-2 py-0.5 text-right text-[var(--foreground)]">
                {fmtNum(stats.payoffRatio, 1)}
              </td>
              <td className="px-2 py-0.5 text-right text-[var(--foreground)]">
                {fmtNum(stats.profitFactor)}
              </td>
              <td
                className={cn(
                  "px-2.5 py-0.5 text-right font-bold tabular-nums",
                  toneFor(stats.expectancyPct),
                )}
              >
                {stats.expectancyPct == null ? "—" : formatPct(stats.expectancyPct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {read && (
        <p className="border-t border-[var(--border)] px-2.5 py-1.5 font-mono text-[10px] leading-snug text-[var(--dim)]">
          <span className="text-[var(--amber-dim)]">Where the edge lives · </span>
          {read}
        </p>
      )}
    </Panel>
  );
}
