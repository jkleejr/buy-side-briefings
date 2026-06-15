import type { KeyLevel } from "@/lib/asset-daily";
import { formatLevel, formatPct } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Price-vs-levels gauge. The dossier already lists key levels in a table, but
// an investor reads price spatially: where does it sit between the nearest
// support and resistance, and how far is the stop? This renders the hand-picked
// key levels as ticks on a single axis, with the live price marked, plus the
// nearest support/resistance and their distance in percent.
// ---------------------------------------------------------------------------

function parseLevelNum(s: string): number | null {
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export default function LevelsGauge({
  price,
  currency = "$",
  levels,
}: {
  price: number;
  currency?: string;
  levels: KeyLevel[];
}) {
  const parsed = levels
    .map((l) => ({ ...l, num: parseLevelNum(l.level) }))
    .filter((l): l is KeyLevel & { num: number } => l.num !== null);
  // Need at least a couple of anchors for a gauge to mean anything.
  if (parsed.length < 2) return null;

  const nums = [price, ...parsed.map((p) => p.num)];
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  const pad = (hi - lo || 1) * 0.05;
  const min = lo - pad;
  const max = hi + pad;
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));

  const supports = parsed.filter((p) => p.num < price).sort((a, b) => b.num - a.num);
  const resistances = parsed.filter((p) => p.num >= price).sort((a, b) => a.num - b.num);
  const nearSup = supports[0];
  const nearRes = resistances[0];

  const fmt = (n: number) => `${currency}${formatLevel(n)}`;
  const tone = (k: string) =>
    k === "support" ? "var(--up)" : k === "resistance" ? "var(--down)" : "var(--amber)";

  return (
    <div className="border-t border-[var(--border)] px-3 py-2 font-mono">
      <div className="mb-1.5 flex items-center justify-between text-[9px] uppercase tracking-widest text-[var(--dim)]">
        <span className="text-[var(--amber-dim)]">Price vs. key levels</span>
        <span>
          {supports.length} support · {resistances.length} resistance
        </span>
      </div>

      <div className="relative h-6">
        {/* axis */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--border-strong)]" />
        {/* level ticks */}
        {parsed.map((l, i) => (
          <div
            key={i}
            className="absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos(l.num)}%`, background: tone(l.kind) }}
            title={`${l.label} — ${l.kind} ${fmt(l.num)}`}
          />
        ))}
        {/* live price marker */}
        <div className="absolute inset-y-0" style={{ left: `${pos(price)}%` }}>
          <div className="h-full w-[2px] -translate-x-1/2 bg-[var(--foreground)]" />
          <div className="absolute -top-[3px] left-1/2 -translate-x-1/2 whitespace-nowrap border border-[var(--foreground)] bg-black px-1 text-[9px] font-bold leading-tight text-[var(--foreground)]">
            {fmt(price)}
          </div>
        </div>
      </div>

      <div className="mt-1 flex items-start justify-between gap-2 text-[10px]">
        <span className="min-w-0 text-[var(--up)]">
          {nearSup ? (
            <>
              ▼ {fmt(nearSup.num)}{" "}
              <span className="tabular-nums">
                ({formatPct(((nearSup.num - price) / price) * 100)})
              </span>{" "}
              <span className="text-[var(--dim)]">{nearSup.label}</span>
            </>
          ) : (
            <span className="text-[var(--dim)]">no support below — price at range low</span>
          )}
        </span>
        <span className="min-w-0 text-right text-[var(--down)]">
          {nearRes ? (
            <>
              <span className="text-[var(--dim)]">{nearRes.label}</span> {fmt(nearRes.num)}{" "}
              <span className="tabular-nums">
                ({formatPct(((nearRes.num - price) / price) * 100)})
              </span>{" "}
              ▲
            </>
          ) : (
            <span className="text-[var(--dim)]">no resistance above — price at range high</span>
          )}
        </span>
      </div>
    </div>
  );
}
