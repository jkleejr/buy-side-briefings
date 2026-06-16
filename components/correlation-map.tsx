import type { BookCorrelation } from "@/lib/correlation";
import { cn } from "@/lib/utils";
import Panel from "./panel";

// Correlation → terminal tone. High positive = concentration risk (red),
// near-zero/negative = genuine diversifier (green).
function corrTone(c: number | null): string {
  if (c == null) return "text-[var(--dim)]";
  if (c >= 0.7) return "text-[var(--down)]";
  if (c >= 0.4) return "text-[var(--amber)]";
  if (c >= 0.15) return "text-[var(--foreground)]";
  return "text-[var(--up)]";
}

function corrCellBg(c: number | null, diag: boolean): string {
  if (diag) return "bg-[var(--panel-head)]";
  if (c == null) return "";
  if (c >= 0.7) return "bg-[rgba(239,68,68,0.12)]";
  if (c >= 0.4) return "bg-[rgba(255,165,0,0.10)]";
  if (c < 0.15) return "bg-[rgba(34,197,94,0.08)]";
  return "";
}

const fmtCorr = (c: number | null, diag: boolean) =>
  diag ? "1.00" : c == null ? "·" : c.toFixed(2);

export default function CorrelationMap({ data }: { data: BookCorrelation }) {
  const { tickers, matrix, betas, avgCorr, effectiveBets, benchmark } = data;

  const read =
    avgCorr == null
      ? null
      : avgCorr >= 0.5
        ? `Concentrated — the book behaves like ~${effectiveBets?.toFixed(1)} independent bets, not ${tickers.length}. One factor shock (AI sentiment, rates) moves most of it together; trim correlated names or add a hedge.`
        : avgCorr >= 0.3
          ? `Moderately correlated — ~${effectiveBets?.toFixed(1)} effective bets across ${tickers.length} ideas. Watch the red cells: those pairs are close to one position.`
          : `Reasonably diversified — ~${effectiveBets?.toFixed(1)} effective bets across ${tickers.length} ideas. Few pairs move together.`;

  return (
    <Panel
      code="CORR"
      title="Book Correlation & Beta"
      learn="Daily-return correlation between every pair of open ideas, plus each name's beta to the Nasdaq-100 (QQQ). Red cells (≥0.70) are pairs that move almost as one position — diversification by ticker, not by risk. Green cells (<0.15) are genuine diversifiers. 'Effective bets' = n ÷ (1 + (n−1)·avg correlation): how many truly independent positions the book amounts to. Beta > 1 means the name amplifies index moves. Computed pairwise over each pair's shared history, so a freshly-listed name only weakens its own cells."
      meta={
        <span>
          {tickers.length} NAMES · {benchmark} β
          {avgCorr != null && <> · avg ρ {avgCorr.toFixed(2)}</>}
        </span>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[10px]">
          <thead>
            <tr className="bg-[var(--panel-head)] text-[var(--dim)]">
              <th className="px-2 py-1 text-left font-normal">ρ</th>
              {tickers.map((t) => (
                <th key={t} className="px-1.5 py-1 text-center font-normal">
                  {t}
                </th>
              ))}
              <th className="px-2 py-1 text-right font-normal text-[var(--amber-dim)]">
                β·{benchmark}
              </th>
            </tr>
          </thead>
          <tbody>
            {tickers.map((row, i) => (
              <tr key={row} className="border-t border-[var(--border)]">
                <td className="px-2 py-1 text-left font-bold text-[var(--foreground)]">{row}</td>
                {matrix[i].map((c, j) => (
                  <td
                    key={j}
                    className={cn(
                      "px-1.5 py-1 text-center tabular-nums",
                      corrCellBg(c, i === j),
                      i === j ? "text-[var(--dim)]" : corrTone(c),
                    )}
                  >
                    {fmtCorr(c, i === j)}
                  </td>
                ))}
                <td className="px-2 py-1 text-right tabular-nums text-[var(--cyan-term)]">
                  {betas[i] == null ? "·" : betas[i]!.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {read && (
        <p className="border-t border-[var(--border)] px-2 py-1.5 font-mono text-[10px] leading-snug text-[var(--dim)]">
          <span className="text-[var(--amber-dim)]">Concentration · </span>
          {read}
        </p>
      )}
    </Panel>
  );
}
