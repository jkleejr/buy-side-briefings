import Link from "next/link";
import type { AssetDaily, DayWinner, TradeAction } from "@/lib/asset-daily";
import { cn, formatLevel, formatPct } from "@/lib/utils";
import Panel from "./panel";

const HREF: Record<string, string> = { nvda: "/nvidia", btc: "/bitcoin", skhynix: "/skhynix", spcx: "/spacex", nbis: "/nebius", mu: "/micron", be: "/bloom-energy", crwv: "/coreweave" };

const WINNER: Record<DayWinner, { emoji: string; label: string; text: string }> = {
  bulls: { emoji: "🐂", label: "Bulls", text: "text-[var(--up)]" },
  bears: { emoji: "🐻", label: "Bears", text: "text-[var(--down)]" },
  flat: { emoji: "➖", label: "Flat", text: "text-[var(--dim)]" },
};

const ACTION: Record<TradeAction, { text: string; border: string; bg: string }> = {
  buy: { text: "text-[var(--up)]", border: "border-[var(--up)]", bg: "bg-[rgba(34,197,94,0.10)]" },
  hold: { text: "text-[var(--amber)]", border: "border-[var(--amber)]", bg: "bg-[rgba(255,165,0,0.10)]" },
  sell: { text: "text-[var(--down)]", border: "border-[var(--down)]", bg: "bg-[rgba(239,68,68,0.10)]" },
  step_aside: { text: "text-[var(--amber)]", border: "border-[var(--amber)]", bg: "bg-[rgba(255,165,0,0.10)]" },
};

function CallCard({ d }: { d: AssetDaily }) {
  const win = WINNER[d.day_winner] ?? WINNER.flat;
  const act = ACTION[d.decision.action] ?? ACTION.hold;
  const href = HREF[d.asset] ?? "/";
  const change = d.snapshot.change_pct;
  const changeTone =
    change > 0 ? "text-[var(--up)]" : change < 0 ? "text-[var(--down)]" : "text-[var(--dim)]";

  return (
    <Link
      href={href}
      className="block border border-[var(--border)] bg-black px-2.5 py-2 transition-colors hover:border-[var(--amber-dim)] hover:bg-[rgba(255,165,0,0.04)]"
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[13px] font-bold text-[var(--foreground)]">{d.symbol}</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
            {d.name}
          </span>
        </div>
        <span
          className={cn(
            "shrink-0 border px-2 py-0.5 font-mono text-[13px] font-bold uppercase tracking-widest",
            act.text,
            act.border,
            act.bg,
          )}
        >
          {d.decision.action.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-1 flex items-baseline gap-2 font-mono">
        <span className="text-[15px] font-bold tabular-nums text-[var(--foreground)]">
          {d.currency_symbol ?? "$"}{formatLevel(d.snapshot.price)}
        </span>
        <span className={cn("text-[11px] font-semibold", changeTone)}>{formatPct(change)}</span>
        <span className={cn("ml-auto text-[10px] uppercase tracking-widest", win.text)}>
          {win.emoji} {win.label} won
        </span>
      </div>

      <div className="mt-1 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
        <span className="text-[var(--amber-dim)]">Hold</span> {d.decision.horizon}
        {" · "}
        {d.decision.conviction} conv
      </div>

      <p className="mt-1 line-clamp-2 font-mono text-[10px] leading-relaxed text-[var(--dim)]">
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
      title="Today's Calls · Asset Desks"
      learn="The standing buy/hold/sell decision and who-made-money-today read for each single-asset desk. Click through for the full daily dossier — positioning, news, outlook, levels, and catalysts."
    >
      <div className="grid grid-cols-1 gap-1 p-2">
        {calls.map((d) => (
          <CallCard key={d.asset} d={d} />
        ))}
      </div>
    </Panel>
  );
}
