import type { LiveBadge } from "@/lib/opportunity-check";

const TONE_CLS: Record<LiveBadge["tone"], string> = {
  up: "border-[var(--up)] text-[var(--up)]",
  down: "border-[var(--down)] text-[var(--down)]",
  amber: "border-[var(--amber-dim)] text-[var(--amber)]",
  dim: "border-[var(--border)] text-[var(--dim)]",
};

/** Inline row of live plan-vs-price badges (stop breached / target hit / …). */
export default function LiveCheckBadges({
  price,
  badges,
  currency = "$",
}: {
  price: number;
  badges: LiveBadge[];
  currency?: string;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1 font-mono text-[9px] uppercase tracking-wider">
      <span className="text-[var(--dim)]">
        live{" "}
        <span className="text-[var(--foreground)]">
          {currency}
          {price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
      </span>
      {badges.map((b) => (
        <span key={b.label} className={`border bg-black px-1 py-0.5 ${TONE_CLS[b.tone]}`}>
          {b.label}
        </span>
      ))}
    </span>
  );
}
