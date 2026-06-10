import type { AssetDaily } from "@/lib/asset-daily";
import { getDailyCloses } from "@/lib/markets";
import {
  judgeAssetAction,
  monthsBackFor,
  scoreDatedCall,
  type VerdictScore,
} from "@/lib/verdict-scoring";
import { cn, formatPct } from "@/lib/utils";
import Panel from "./panel";

const ACTION_TONE: Record<AssetDaily["decision"]["action"], string> = {
  buy: "text-[var(--up)]",
  hold: "text-[var(--amber)]",
  sell: "text-[var(--down)]",
};

function PctCell({ pct, pending }: { pct: number | null; pending: boolean }) {
  if (pending) return <span className="text-[var(--dim)]">pending</span>;
  if (pct === null) return <span className="text-[var(--dim)]">—</span>;
  const tone =
    pct > 0 ? "text-[var(--up)]" : pct < 0 ? "text-[var(--down)]" : "text-[var(--dim)]";
  return <span className={tone}>{formatPct(pct)}</span>;
}

function Mark({ value }: { value: boolean | null }) {
  if (value === null) return <span className="text-[var(--dim)]">—</span>;
  return value ? (
    <span className="text-[var(--up)]">✓</span>
  ) : (
    <span className="text-[var(--down)]">✗</span>
  );
}

/**
 * Grades every dossier call for one asset against its own price series —
 * the same +1d/+5d/+20d audit the markets verdicts get on /track-record.
 * BUY is right when the asset rose over the window, SELL when it fell,
 * HOLD is informational.
 */
export default async function AssetCallRecord({
  series,
  symbol,
}: {
  /** Dossier series, newest first (as returned by getAssetDailySeries). */
  series: AssetDaily[];
  /** Yahoo symbol to score against (NVDA, BTC-USD, 000660.KS …). */
  symbol: string;
}) {
  if (series.length === 0) return null;
  const earliest = series[series.length - 1].date;
  const closes = await getDailyCloses(symbol, monthsBackFor(earliest));
  if (closes.length === 0) return null;

  const scored: Array<{ d: AssetDaily; score: VerdictScore }> = series.map((d) => ({
    d,
    score: scoreDatedCall(d.date, closes, (pct) =>
      judgeAssetAction(d.decision.action, pct),
    ),
  }));

  // Headline: +5d hit rate over directional calls with completed windows.
  let right = 0;
  let wrong = 0;
  for (const { score } of scored) {
    if (score.right_d5 === true) right += 1;
    else if (score.right_d5 === false) wrong += 1;
  }
  const hitPct = right + wrong > 0 ? (right / (right + wrong)) * 100 : null;

  // Average +5d asset return measured from BUY-call dates.
  const buyD5 = scored
    .filter(({ d, score }) => d.decision.action === "buy" && !score.d5.pending)
    .map(({ score }) => score.d5.pct)
    .filter((p): p is number => p !== null);
  const avgBuyD5 =
    buyD5.length > 0 ? buyD5.reduce((a, b) => a + b, 0) / buyD5.length : null;

  const directional = scored.filter(({ d }) => d.decision.action !== "hold").length;

  return (
    <Panel
      code="REC"
      title={`Call Record · ${symbol}`}
      learn="Every call this page has published, audited against the asset's own price at +1, +5, and +20 trading days. BUY is right if the price rose over the window, SELL is right if it fell; HOLD carries no direction so it isn't graded. Hit rate uses the +5d window — the horizon most of these calls are written for. Small samples are noisy: treat the percentage as anecdote until there are ~15+ scored calls."
      meta={<span>{scored.length} CALLS · +5D AUDIT</span>}
    >
      <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-b border-[var(--border)] font-mono">
        <div className="px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            +5d hit rate
          </div>
          <div className="mt-0.5 text-[15px] font-bold tabular-nums text-[var(--foreground)]">
            {hitPct === null ? "—" : `${hitPct.toFixed(0)}%`}
            <span className="ml-1.5 text-[10px] font-normal text-[var(--dim)]">
              {right + wrong === 0 ? "windows pending" : `${right}/${right + wrong}`}
            </span>
          </div>
        </div>
        <div className="px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Avg +5d after BUY
          </div>
          <div
            className={cn(
              "mt-0.5 text-[15px] font-bold tabular-nums",
              avgBuyD5 === null
                ? "text-[var(--dim)]"
                : avgBuyD5 > 0
                  ? "text-[var(--up)]"
                  : "text-[var(--down)]",
            )}
          >
            {avgBuyD5 === null ? "—" : formatPct(avgBuyD5)}
          </div>
        </div>
        <div className="px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Directional calls
          </div>
          <div className="mt-0.5 text-[15px] font-bold tabular-nums text-[var(--foreground)]">
            {directional}
            <span className="ml-1.5 text-[10px] font-normal text-[var(--dim)]">
              of {scored.length} ({scored.length - directional} hold)
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full font-mono text-[11px]">
          <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
            <tr>
              <th className="px-2 py-1 text-left font-normal">Date</th>
              <th className="px-2 py-1 text-left font-normal">Call</th>
              <th className="px-2 py-1 text-left font-normal">Conv</th>
              <th className="px-2 py-1 text-right font-normal">+1d</th>
              <th className="px-2 py-1 text-right font-normal">+5d</th>
              <th className="px-2 py-1 text-right font-normal">+20d</th>
              <th className="px-2 py-1 text-center font-normal">Right?</th>
            </tr>
          </thead>
          <tbody>
            {scored.map(({ d, score }) => (
              <tr key={d.date} className="border-t border-[var(--border)]">
                <td className="px-2 py-0.5 text-[var(--foreground)]">{d.date}</td>
                <td className={cn("px-2 py-0.5 uppercase", ACTION_TONE[d.decision.action])}>
                  {d.decision.action}
                </td>
                <td className="px-2 py-0.5 uppercase text-[var(--dim)]">
                  {d.decision.conviction.slice(0, 3)}
                </td>
                <td className="px-2 py-0.5 text-right">
                  <PctCell pct={score.d1.pct} pending={score.d1.pending} />
                </td>
                <td className="px-2 py-0.5 text-right">
                  <PctCell pct={score.d5.pct} pending={score.d5.pending} />
                </td>
                <td className="px-2 py-0.5 text-right">
                  <PctCell pct={score.d20.pct} pending={score.d20.pending} />
                </td>
                <td className="px-2 py-0.5 text-center">
                  <span className="inline-flex gap-1">
                    <Mark value={score.right_d1} />
                    <Mark value={score.right_d5} />
                    <Mark value={score.right_d20} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
