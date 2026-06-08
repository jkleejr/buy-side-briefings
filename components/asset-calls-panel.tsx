import Link from "next/link";
import type { AssetDaily, DayWinner, TradeAction } from "@/lib/asset-daily";
import { cn, formatLevel, formatPct } from "@/lib/utils";
import Panel from "./panel";

const HREF: Record<string, string> = { nvda: "/nvidia", btc: "/bitcoin" };

const WINNER: Record<DayWinner, { emoji: string; label: string; text: string }> = {
  bulls: { emoji: "🐂", label: "Bulls", text: "text-[var(--up)]" },
  bears: { emoji: "🐻", label: "Bears", text: "text-[var(--down)]" },
  flat: { emoji: "➖", label: "Flat", text: "text-[var(--dim)]" },
};

const ACTION: Record<TradeAction, { text: string; border: string; bg: string }> = {
  buy: { text: "text-[var(--up)]", border: "border-[var(--up)]/40", bg: "bg-[var(--up-soft)]" },
  hold: { text: "text-[var(--amber)]", border: "border-[var(--amber)]/40", bg: "bg-[var(--amber-soft)]" },
  sell: { text: "text-[var(--down)]", border: "border-[var(--down)]/40", bg: "bg-[var(--down-soft)]" },
};

function CallCard({ d }: { d: AssetDaily }) {
  const win = WINNER[d.day_winner];
  const act = ACTION[d.decision.action];
  const href = HREF[d.asset] ?? "/";
  const change = d.snapshot.change_pct;
  const changeTone =
    change > 0 ? "text-[var(--up)]" : change < 0 ? "text-[var(--down)]" : "text-[var(--dim)]";

  return (
    <Link
      href={href}
      className="card-hover block rounded-[var(--radius)] border border-[var(--border)] bg-[var(--panel-head)]/50 px-3 py-2.5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[14px] font-bold text-[var(--foreground)]">{d.symbol}</span>
          <span className="text-[10px] font-medium text-[var(--dim)]">{d.name}</span>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest",
            act.text,
            act.border,
            act.bg,
          )}
        >
          {d.decision.action}
        </span>
      </div>

      <div className="mt-1.5 flex items-baseline gap-2 font-mono tabular-nums">
        <span className="text-[16px] font-bold text-[var(--foreground)]">
          ${formatLevel(d.snapshot.price)}
        </span>
        <span className={cn("text-[11px] font-semibold", changeTone)}>
          {change > 0 ? "▲ " : change < 0 ? "▼ " : ""}
          {formatPct(change)}
        </span>
        <span className={cn("ml-auto text-[10px] uppercase tracking-widest", win.text)}>
          {win.emoji} {win.label} won
        </span>
      </div>

      <p className="prose-read mt-1.5 line-clamp-2 text-[12px] leading-relaxed">
        {d.decision.rationale}
      </p>
    </Link>
  );
}

export default function AssetCallsPanel({ calls }: { calls: AssetDaily[] }) {
  if (calls.length === 0) return null;
  return (
    <Panel
      code="CALLS"
      title="Today's Calls · NVDA + BTC"
      learn="The standing buy/hold/sell decision and who-made-money-today read for the two single-asset desks. Click through for the full daily dossier — positioning, news, outlook, levels, and catalysts."
    >
      <div className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-2">
        {calls.map((d) => (
          <CallCard key={d.asset} d={d} />
        ))}
      </div>
    </Panel>
  );
}
