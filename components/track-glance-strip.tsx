import Link from "next/link";
import { formatPct } from "@/lib/utils";
import type { StreakInfo } from "@/lib/verdict-scoring";

type OppStats = {
  active: number;
  wins: number;
  losses: number;
  hit_rate_pct: number | null;
  avg_return_pct: number | null;
};

/**
 * One-row accountability strip for the home dashboard: is the desk actually
 * right, and what's on right now? Each tile links to the page with the full
 * story (/track-record, /opportunities).
 */
function MiniCurve({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const W = 96;
  const H = 18;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = W / (values.length - 1);
  const d = values
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`,
    )
    .join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[18px] w-full" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={up ? "#22c55e" : "#ef4444"} strokeWidth={1.25} />
    </svg>
  );
}

export default function TrackGlanceStrip({
  hitRate,
  hits,
  scored,
  streak,
  ops,
  equity,
  regime,
}: {
  hitRate: number | null;
  hits: number;
  scored: number;
  streak: StreakInfo;
  ops: OppStats;
  /** Paper-portfolio summary: recent equity values + total realized return. */
  equity?: { values: number[]; total_pct: number } | null;
  /** Live regime check: named triggers currently in breach. */
  regime?: { breached: number; total: number } | null;
}) {
  const streakTone =
    streak.kind === "right"
      ? "text-[var(--up)]"
      : streak.kind === "wrong"
        ? "text-[var(--down)]"
        : "text-[var(--dim)]";
  const avgTone =
    ops.avg_return_pct === null
      ? "text-[var(--dim)]"
      : ops.avg_return_pct > 0
        ? "text-[var(--up)]"
        : ops.avg_return_pct < 0
          ? "text-[var(--down)]"
          : "text-[var(--dim)]";

  const tiles: { href: string; label: string; value: React.ReactNode; sub: string }[] = [
    ...(regime
      ? [
          {
            href: "#regime",
            label: "Regime · Live",
            value: (
              <span
                className={
                  regime.breached > 0 ? "text-[var(--down)]" : "text-[var(--up)]"
                }
              >
                {regime.breached}/{regime.total}
              </span>
            ),
            sub: "triggers in breach now",
          },
        ]
      : []),
    {
      href: "/track-record",
      label: "Verdict Hit Rate",
      value: hitRate === null ? "—" : `${hitRate.toFixed(0)}%`,
      sub: scored === 0 ? "no scored windows" : `${hits}/${scored} windows`,
    },
    {
      href: "/track-record",
      label: "Streak · +5d",
      value: (
        <span className={streakTone}>
          {streak.kind === "none" ? "—" : `${streak.length} ${streak.kind}`}
        </span>
      ),
      sub: "consecutive same-result calls",
    },
    {
      href: "/opportunities",
      label: "Open Ideas",
      value: String(ops.active),
      sub: "active trade setups",
    },
    {
      href: "/opportunities",
      label: "Closed W–L",
      value: (
        <span>
          <span className="text-[var(--up)]">{ops.wins}</span>
          <span className="text-[var(--dim)]">–</span>
          <span className="text-[var(--down)]">{ops.losses}</span>
        </span>
      ),
      sub:
        ops.hit_rate_pct === null
          ? "no closed trades yet"
          : `${ops.hit_rate_pct.toFixed(0)}% hit rate`,
    },
    {
      href: "/opportunities",
      label: "Avg Closed Ret",
      value: (
        <span className={avgTone}>
          {ops.avg_return_pct === null ? "—" : formatPct(ops.avg_return_pct)}
        </span>
      ),
      sub: "per closed idea",
    },
  ];

  return (
    <div className="border border-[var(--border)] bg-[var(--panel)]">
      <div className="panel-scroll flex items-stretch divide-x divide-[var(--border)] overflow-x-auto font-mono">
        {tiles.map((t, i) => (
          <Link
            key={`${t.label}-${i}`}
            href={t.href}
            className="flex min-w-[128px] flex-1 shrink-0 flex-col justify-between gap-0.5 px-3 py-1.5 hover:bg-[rgba(255,165,0,0.04)]"
          >
            <span className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
              {t.label}
            </span>
            <span className="text-[15px] font-bold tabular-nums leading-none text-[var(--foreground)]">
              {t.value}
            </span>
            <span className="text-[10px] leading-none text-[var(--dim)]">{t.sub}</span>
          </Link>
        ))}
        {equity && equity.values.length >= 2 && (
          <Link
            href="/track-record"
            className="flex min-w-[148px] flex-1 shrink-0 flex-col justify-between gap-0.5 px-3 py-1.5 hover:bg-[rgba(255,165,0,0.04)]"
          >
            <span className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
              Paper Equity
            </span>
            <span
              className={`text-[15px] font-bold tabular-nums leading-none ${
                equity.total_pct >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"
              }`}
            >
              {formatPct(equity.total_pct)}
            </span>
            <MiniCurve values={equity.values} />
          </Link>
        )}
      </div>
    </div>
  );
}
