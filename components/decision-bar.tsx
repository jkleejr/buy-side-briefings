import Link from "next/link";
import type { MarketsVerdict } from "@/lib/data";
import type { AssetDaily } from "@/lib/asset-daily";
import { cn, formatPct, verdictColor, verdictHorizon } from "@/lib/utils";

// ---------------------------------------------------------------------------
// "Today's Decision" command bar — the inverted-pyramid answer at the very top
// of the dashboard. It synthesizes the three things a trader opens the site for:
//   1. the standing market call (verdict),
//   2. each asset desk's buy/hold/sell + today's move,
//   3. the next catalyst and how many days until it fires.
// Everything below the bar is the supporting evidence.
// ---------------------------------------------------------------------------

const DESK_HREF: Record<string, string> = {
  nvda: "/nvidia",
  btc: "/bitcoin",
  skhynix: "/skhynix",
  nbis: "/nebius",
  mu: "/micron",
  be: "/bloom-energy",
  crwv: "/coreweave",
};

const ACTION_TONE: Record<string, string> = {
  buy: "text-[var(--up)] border-[var(--up)]",
  hold: "text-[var(--amber)] border-[var(--amber)]",
  sell: "text-[var(--down)] border-[var(--down)]",
};

export type NextCatalyst = { label: string; date: string; days: number };

export default function DecisionBar({
  verdict,
  desks,
  nextCatalyst,
}: {
  verdict: MarketsVerdict | null;
  desks: AssetDaily[];
  nextCatalyst: NextCatalyst | null;
}) {
  if (!verdict && desks.length === 0) return null;
  const vc = verdict ? verdictColor(verdict.verdict.code) : null;

  return (
    <div className="border border-[var(--border-strong)] bg-[var(--panel)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[var(--amber)]">
        <span className="term-blink glow-dot-up inline-block h-1.5 w-1.5 rounded-full bg-[var(--up)]" />
        Today&apos;s Decision
      </div>
      <div className="panel-scroll flex items-stretch divide-x divide-[var(--border)] overflow-x-auto font-mono">
        {/* 1 — standing market call */}
        {verdict && vc && (
          <Link
            href={`/briefings/${verdict.routine}/${verdict.date}-${verdict.window}`}
            className="flex min-w-[220px] flex-1 shrink-0 flex-col justify-center gap-0.5 px-3 py-2 hover:bg-[rgba(255,165,0,0.04)]"
          >
            <span className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
              Market Call
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none">{verdict.verdict.emoji}</span>
              <span className={cn("text-[19px] font-bold uppercase tracking-wide", vc.text)}>
                {verdict.verdict.code.replace(/_/g, " ")}
              </span>
              <span className="text-[9px] uppercase tracking-widest text-[var(--dim)]">
                {verdict.verdict.conviction} conv · {verdictHorizon(verdict.verdict.horizon)}
              </span>
            </div>
            <span className="line-clamp-1 text-[10px] text-[var(--dim)]">
              {verdict.verdict.rationale_short}
            </span>
          </Link>
        )}

        {/* 2 — asset desks at a glance */}
        {desks.length > 0 && (
          <div className="flex min-w-[270px] flex-[2] shrink-0 flex-col justify-center gap-1 px-3 py-2">
            <span className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
              Asset Desks
            </span>
            <div className="flex flex-wrap gap-1">
              {desks.map((d) => (
                <Link
                  key={d.asset}
                  href={DESK_HREF[d.asset] ?? "/"}
                  title={`${d.name} — ${d.decision.action.toUpperCase()} (${d.decision.conviction} conviction · horizon ${d.decision.horizon})`}
                  className={cn(
                    "flex items-center gap-1 border px-1.5 py-0.5 text-[10px] hover:bg-[rgba(255,165,0,0.06)]",
                    ACTION_TONE[d.decision.action] ?? "border-[var(--border)] text-[var(--dim)]",
                  )}
                >
                  <span className="font-bold text-[var(--foreground)]">{d.symbol}</span>
                  <span className="font-bold uppercase">{d.decision.action}</span>
                  <span
                    className={
                      d.snapshot.change_pct >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"
                    }
                  >
                    {formatPct(d.snapshot.change_pct)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 3 — next catalyst countdown */}
        {nextCatalyst && (
          <div className="flex min-w-[170px] flex-1 shrink-0 flex-col justify-center gap-0.5 px-3 py-2">
            <span className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
              Next Catalyst
            </span>
            <span className="text-[15px] font-bold uppercase tabular-nums leading-none text-[var(--cyan-term)]">
              {nextCatalyst.days <= 0 ? "TODAY" : `T−${nextCatalyst.days}d`}
            </span>
            <span className="line-clamp-1 text-[10px] text-[var(--dim)]">{nextCatalyst.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
