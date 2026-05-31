import Link from "next/link";
import type { MarketsVerdict } from "@/lib/data";
import { cn, formatLevel, formatPct, verdictColor, getVerdictExplanation } from "@/lib/utils";
import Tooltip from "./tooltip";

const WINDOW_LABEL: Record<string, string> = {
  morning: "MORN",
  afternoon: "AFTN",
  night: "NITE",
};

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

export default function TldrCard({ verdict }: { verdict: MarketsVerdict }) {
  const color = verdictColor(verdict.verdict.code);
  const { day, md } = formatDate(verdict.date);
  const windowCode = WINDOW_LABEL[verdict.window] ?? verdict.window.toUpperCase();
  const briefingHref = `/briefings/${verdict.routine}/${verdict.date}-${verdict.window}`;

  const snap = verdict.snapshot ?? {};
  const ust30y = (verdict.regime_risk ?? []).find(
    (r) => r.name.toLowerCase().includes("30y") || r.name.toLowerCase().startsWith("30y"),
  );

  return (
    <article
      className={cn(
        "border bg-[var(--panel)] transition-colors hover:border-[var(--amber-dim)]",
        "border-[var(--border)]",
      )}
    >
      {/* Header row: date | verdict pill | full-link */}
      <header className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1 font-mono text-[10px] uppercase tracking-widest">
        <span className="text-[var(--amber-dim)]">{day}</span>
        <span className="text-[var(--foreground)]">{md}</span>
        <span className="text-[var(--dim)]">·</span>
        <span className="text-[var(--cyan-term)]">{windowCode}</span>
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
          {snap.sp500 && (
            <SnapItem
              label="SPX"
              value={formatLevel(snap.sp500.level)}
              change={snap.sp500.change_pct !== undefined ? formatPct(snap.sp500.change_pct) : undefined}
            />
          )}
          {snap.nasdaq && (
            <SnapItem
              label="NDX"
              value={formatLevel(snap.nasdaq.level)}
              change={snap.nasdaq.change_pct !== undefined ? formatPct(snap.nasdaq.change_pct) : undefined}
            />
          )}
          {snap.vix && (
            <SnapItem
              label="VIX"
              value={snap.vix.level.toFixed(2)}
              change={snap.vix.change_pct !== undefined ? formatPct(snap.vix.change_pct) : undefined}
            />
          )}
          {ust30y && (
            <SnapItem
              label="30Y"
              value={`${ust30y.value.toFixed(2)}${ust30y.unit ?? "%"}`}
            />
          )}
          {snap.ust10y && (
            <SnapItem
              label="10Y"
              value={`${snap.ust10y.level.toFixed(2)}%`}
              change={snap.ust10y.change_bps !== undefined ? `${snap.ust10y.change_bps >= 0 ? "+" : ""}${snap.ust10y.change_bps}bps` : undefined}
            />
          )}
          {snap.dxy && (
            <SnapItem
              label="DXY"
              value={snap.dxy.level.toFixed(2)}
              change={snap.dxy.change_pct !== undefined ? formatPct(snap.dxy.change_pct) : undefined}
            />
          )}
        </div>

        {/* Short rationale */}
        <p className="font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
          {verdict.verdict.rationale_short}
        </p>
      </div>
    </article>
  );
}
