import Link from "next/link";
import type { KospiVerdict } from "@/lib/data";
import { cn, formatLevel, formatPct, verdictColor } from "@/lib/utils";

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

export default function KospiBriefingCard({ verdict }: { verdict: KospiVerdict }) {
  const color = verdictColor(verdict.verdict.code);
  const { day, md } = formatDate(verdict.date);
  const briefingHref = `/briefings/${verdict.routine}/${verdict.date}-${verdict.window}`;

  const snap = verdict.snapshot ?? {};

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
        <span className="text-[var(--cyan-term)]">DAILY</span>
        <span className="text-[var(--dim)]">·</span>
        <span className={cn("font-bold", color.text)}>
          {verdict.verdict.emoji} {verdict.verdict.code.toUpperCase().replace("_", " ")}
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
          {snap.kospi && (
            <SnapItem
              label="KOSPI"
              value={formatLevel(snap.kospi.level)}
              change={snap.kospi.change_pct !== undefined ? formatPct(snap.kospi.change_pct) : undefined}
            />
          )}
          {snap.kosdaq && (
            <SnapItem
              label="KOSDAQ"
              value={formatLevel(snap.kosdaq.level)}
              change={snap.kosdaq.change_pct !== undefined ? formatPct(snap.kosdaq.change_pct) : undefined}
            />
          )}
          {snap.usdkrw && (
            <SnapItem
              label="USD/KRW"
              value={`₩${formatLevel(snap.usdkrw.level)}`}
              change={snap.usdkrw.change_pct !== undefined ? formatPct(snap.usdkrw.change_pct) : undefined}
            />
          )}
          {snap.foreign_net && (
            <SnapItem
              label="FOREIGN"
              value={`${snap.foreign_net.value > 0 ? "+" : ""}₩${snap.foreign_net.value.toFixed(1)}T`}
            />
          )}
          {snap.sk_hynix && (
            <SnapItem
              label="HYNIX"
              value={`₩${formatLevel(snap.sk_hynix.level)}`}
              change={snap.sk_hynix.change_pct !== undefined ? formatPct(snap.sk_hynix.change_pct) : undefined}
            />
          )}
          {snap.samsung && (
            <SnapItem
              label="SMSNG"
              value={`₩${formatLevel(snap.samsung.level)}`}
              change={snap.samsung.change_pct !== undefined ? formatPct(snap.samsung.change_pct) : undefined}
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
