import type { KeyLevel } from "@/lib/asset-daily";
import { suggestOptionStructure } from "@/lib/options";
import { cn, formatLevel } from "@/lib/utils";
import Panel from "./panel";

/**
 * #7 — Defined-risk options structure. Turns the dossier's standing call + key
 * levels + IV into a vertical debit spread: the leg strikes, the max width
 * (defined risk/reward), the expiry to use, and whether IV says the target is
 * even reachable. Leverages the specific move with capped, known risk vs shares.
 */
export default function OptionsStructureCard({
  price,
  action,
  ivPct,
  levels,
  currency = "$",
}: {
  price: number;
  action: "buy" | "hold" | "sell";
  ivPct?: number | null;
  levels: KeyLevel[];
  currency?: string;
}) {
  const s = suggestOptionStructure(price, action, levels, { ivPct, horizonDays: 35 });
  if (!s) return null;

  const px = (n: number) => `${currency}${formatLevel(n)}`;
  const name = s.kind === "bull_call" ? "Bull Call Spread" : "Bear Put Spread";
  const r = s.right.toUpperCase();

  const tiles: { label: string; value: string; tone?: string; sub?: string }[] = [
    {
      label: "Max width",
      value: px(s.width),
      tone: "text-[var(--foreground)]",
      sub: "spread ceiling per share",
    },
    {
      label: "Expiry",
      value: `≥ ${s.expiryHintDays}d`,
      tone: "text-[var(--cyan-term)]",
      sub: "past the catalyst",
    },
    {
      label: "Expected move",
      value: s.expectedMove == null ? "IV n/a" : `±${px(s.expectedMove)}`,
      tone: "text-[var(--amber)]",
      sub: s.ivPct == null ? "no listed IV yet" : `${s.ivPct}% IV · ${s.expiryHintDays}d`,
    },
    {
      label: "Target reachable",
      value:
        s.withinExpectedMove == null ? "—" : s.withinExpectedMove ? "within 1σ" : "> 1σ away",
      tone:
        s.withinExpectedMove == null
          ? "text-[var(--dim)]"
          : s.withinExpectedMove
            ? "text-[var(--up)]"
            : "text-[var(--down)]",
      sub: `target ${px(s.targetLevel)}`,
    },
  ];

  return (
    <Panel
      code="OPTS"
      title="Options Structure · Defined Risk"
      learn="A vertical debit spread built from the standing call and the key levels: buy the near leg, sell a leg at the directional target. Your max loss is the debit you pay (a live-chain number), your max gain is the width minus that debit if price reaches the short strike by expiry. Spreads beat owning shares when you want defined risk and leverage to a specific move, and they cut the cost (and theta) of a long single option. 'Expected move' is the ~1σ range IV implies over the expiry — if the target is more than one expected move away, the spread is a long shot; tighten the short strike or extend expiry."
      meta={<span>{s.conditional ? "CONDITIONAL" : "STANDING CALL"}</span>}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-3 py-2 font-mono">
        <span
          className={cn(
            "text-[14px] font-bold uppercase tracking-wide",
            s.kind === "bull_call" ? "text-[var(--up)]" : "text-[var(--down)]",
          )}
        >
          {name}
        </span>
        {s.conditional && (
          <span className="border border-[var(--amber-dim)] px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-[var(--amber)]">
            on confirmation
          </span>
        )}
        <span className="ml-auto text-[11px] text-[var(--dim)]">
          <span className="text-[var(--up)]">BUY {px(s.longStrike)} {r}</span>
          <span className="mx-1.5 text-[var(--amber-dim)]">/</span>
          <span className="text-[var(--down)]">SELL {px(s.shortStrike)} {r}</span>
          <span className="ml-1.5">· same expiry</span>
        </span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] font-mono sm:grid-cols-4 sm:divide-y-0">
        {tiles.map((t) => (
          <div key={t.label} className="px-2.5 py-2">
            <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
              {t.label}
            </div>
            <div className={cn("mt-0.5 text-[15px] font-bold tabular-nums", t.tone)}>
              {t.value}
            </div>
            {t.sub && <div className="text-[9px] leading-tight text-[var(--dim)]">{t.sub}</div>}
          </div>
        ))}
      </div>

      <p className="border-t border-[var(--border)] px-3 py-1.5 font-mono text-[10px] leading-snug text-[var(--dim)]">
        <span className="text-[var(--amber-dim)]">Breakeven ≈ </span>
        {px(s.longStrike)} {s.kind === "bull_call" ? "+" : "−"} the net debit (live quote).
        Max risk = debit; max gain = {px(s.width)} − debit if {r === "CALL" ? "above" : "below"}{" "}
        {px(s.shortStrike)} at expiry.
        {s.ivPct != null && s.ivPct >= 55 && (
          <>
            {" "}
            <span className="text-[var(--amber)]">IV is rich ({s.ivPct}%)</span> — selling the
            opposing spread (a {s.kind === "bull_call" ? "put" : "call"} credit spread) is the
            premium-collecting alternative.
          </>
        )}
      </p>
    </Panel>
  );
}
