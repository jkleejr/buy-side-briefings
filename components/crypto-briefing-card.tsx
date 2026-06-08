import Link from "next/link";
import type { CryptoVerdict } from "@/lib/data";
import { cn, formatLevel, formatPct, verdictColor, getVerdictExplanation } from "@/lib/utils";
import Tooltip from "./tooltip";

function formatDate(date: string): { day: string; md: string } {
  const d = new Date(`${date}T12:00:00Z`);
  if (isNaN(d.getTime())) return { day: "", md: date };
  return {
    day: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
    md: d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", timeZone: "UTC" }),
  };
}

function SnapItem({ label, value, change }: { label: string; value: string; change?: string }) {
  const isUp = change?.startsWith("+");
  const isDown = change?.startsWith("-");
  const changeColor = isUp ? "text-[var(--up)]" : isDown ? "text-[var(--down)]" : "text-[var(--dim)]";
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span className="text-[var(--amber-dim)]">{label}</span>
      <span className="text-[var(--foreground)]">{value}</span>
      {change && <span className={changeColor}>{change}</span>}
    </span>
  );
}

const FG_LABEL = (v: number): string =>
  v <= 24 ? "Extreme Fear" : v <= 44 ? "Fear" : v <= 55 ? "Neutral" : v <= 75 ? "Greed" : "Extreme Greed";

export default function CryptoBriefingCard({ verdict }: { verdict: CryptoVerdict }) {
  const color = verdictColor(verdict.verdict.code);
  const { day, md } = formatDate(verdict.date);
  const briefingHref = `/briefings/${verdict.routine}/${verdict.date}-${verdict.window}`;

  const snap = verdict.snapshot ?? {};

  return (
    <article className="card-hover rounded-[var(--radius)] border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-1)]">
      {/* Header row: date | verdict pill | full-link */}
      <header className="flex items-center gap-2 rounded-t-[var(--radius)] border-b border-[var(--border)] bg-gradient-to-b from-[var(--panel-head)] to-[var(--panel)] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest">
        <span className="text-[var(--amber-dim)]">{day}</span>
        <span className="text-[var(--foreground)]">{md}</span>
        <span className="text-[var(--dim)]">·</span>
        <span className="text-[var(--cyan-term)]">DAILY</span>
        <span className="text-[var(--dim)]">·</span>
        <span className={cn("font-bold", color.text)}>
          <Tooltip text={getVerdictExplanation(verdict.verdict.code)}>
            {verdict.verdict.emoji} {verdict.verdict.code.toUpperCase().replace("_", " ")}
          </Tooltip>
        </span>
        <span className="text-[var(--dim)]">·</span>
        <span className="text-[var(--foreground)]">{verdict.verdict.conviction}</span>
        <Link
          href={briefingHref}
          className="ml-auto text-[var(--cyan-term)] hover:underline"
        >
          FULL ▸
        </Link>
      </header>

      {/* Body */}
      <div className="space-y-1.5 px-2 py-2">
        {/* Headline label */}
        <h3 className={cn("font-mono text-[13px] font-bold leading-snug", color.text)}>
          {verdict.verdict.label}
        </h3>

        {/* Snapshot strip */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px]">
          {snap.btc && (
            <SnapItem
              label="BTC"
              value={`$${formatLevel(snap.btc.level)}`}
              change={snap.btc.change_pct !== undefined ? formatPct(snap.btc.change_pct) : undefined}
            />
          )}
          {snap.eth && (
            <SnapItem
              label="ETH"
              value={`$${formatLevel(snap.eth.level)}`}
              change={snap.eth.change_pct !== undefined ? formatPct(snap.eth.change_pct) : undefined}
            />
          )}
          {snap.total_mcap && (
            <SnapItem
              label="MCAP"
              value={`$${snap.total_mcap.level.toFixed(2)}T`}
              change={
                snap.total_mcap.change_pct !== undefined
                  ? formatPct(snap.total_mcap.change_pct)
                  : undefined
              }
            />
          )}
          {snap.btc_dominance && (
            <SnapItem label="BTC.D" value={`${snap.btc_dominance.level.toFixed(1)}%`} />
          )}
          {snap.fear_greed && (
            <SnapItem
              label="F&G"
              value={`${snap.fear_greed.value} ${snap.fear_greed.label ?? FG_LABEL(snap.fear_greed.value)}`}
            />
          )}
        </div>

        {/* Short rationale */}
        <p className="prose-read text-[12px] leading-relaxed">
          {verdict.verdict.rationale_short}
        </p>
      </div>
    </article>
  );
}
