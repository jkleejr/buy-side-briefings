import type { Opportunity } from "@/lib/data";
import type { DailyClose } from "@/lib/markets";

// ---------------------------------------------------------------------------
// Paper portfolio: what would have happened if you took EVERY closed
// opportunity at its stated position size. Returns are applied on each
// trade's close date (realized-only — open ideas are not marked to market),
// compounding a notional account that starts at 100. Benchmarked against
// buying SPX on the journal's first day and doing nothing.
// ---------------------------------------------------------------------------

export type EquityPoint = { date: string; strategy: number; spx: number };

export type ClosedTrade = {
  id: string;
  ticker: string;
  closed_at: string;
  return_pct: number;
  weight_pct: number;
  /** Contribution to the account, percent (weight × return). */
  contribution_pct: number;
};

export type PortfolioStats = {
  trades: number;
  start_date: string;
  end_date: string;
  total_return_pct: number;
  spx_return_pct: number;
  max_drawdown_pct: number;
  avg_position_pct: number;
  best: ClosedTrade | null;
  worst: ClosedTrade | null;
};

export type PaperPortfolio = {
  points: EquityPoint[];
  stats: PortfolioStats;
  trades: ClosedTrade[];
};

const DEFAULT_WEIGHT_PCT = 5;

export function buildPaperPortfolio(
  opportunities: Opportunity[],
  spx: DailyClose[],
): PaperPortfolio | null {
  const closed: ClosedTrade[] = opportunities
    .filter(
      (o): o is Opportunity & { outcome: NonNullable<Opportunity["outcome"]> } =>
        o.outcome != null &&
        typeof o.outcome.return_pct === "number" &&
        typeof o.outcome.closed_at === "string",
    )
    .map((o) => {
      const weight_pct = o.position_size_pct ?? DEFAULT_WEIGHT_PCT;
      return {
        id: o.id,
        ticker: o.ticker,
        closed_at: o.outcome.closed_at,
        return_pct: o.outcome.return_pct,
        weight_pct,
        contribution_pct: (weight_pct / 100) * o.outcome.return_pct,
      };
    })
    .sort((a, b) => a.closed_at.localeCompare(b.closed_at));

  if (closed.length === 0 || spx.length === 0) return null;

  // The curve starts when the journal started, so idle time shows as flat
  // line — sitting out IS a position.
  const firstCreated = opportunities
    .map((o) => o.created_at)
    .sort((a, b) => a.localeCompare(b))[0];
  const start = firstCreated ?? closed[0].closed_at;

  const window = spx.filter((p) => p.date >= start);
  if (window.length === 0) return null;
  const spxBase = window[0].close;

  const points: EquityPoint[] = [];
  let equity = 100;
  let ti = 0;
  let peak = 100;
  let maxDrawdown = 0;
  for (const day of window) {
    while (ti < closed.length && closed[ti].closed_at <= day.date) {
      equity *= 1 + closed[ti].contribution_pct / 100;
      ti += 1;
    }
    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, ((equity - peak) / peak) * 100);
    points.push({
      date: day.date,
      strategy: equity,
      spx: (day.close / spxBase) * 100,
    });
  }

  const lastPoint = points[points.length - 1];
  const byContribution = [...closed].sort((a, b) => b.contribution_pct - a.contribution_pct);
  const avgWeight =
    closed.reduce((s, t) => s + t.weight_pct, 0) / closed.length;

  return {
    points,
    trades: closed,
    stats: {
      trades: closed.length,
      start_date: window[0].date,
      end_date: lastPoint.date,
      total_return_pct: lastPoint.strategy - 100,
      spx_return_pct: lastPoint.spx - 100,
      max_drawdown_pct: maxDrawdown,
      avg_position_pct: avgWeight,
      best: byContribution[0] ?? null,
      worst: byContribution[byContribution.length - 1] ?? null,
    },
  };
}
