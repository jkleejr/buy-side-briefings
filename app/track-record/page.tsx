import Link from "next/link";
import { getAllMarketsVerdicts, type MarketsVerdict } from "@/lib/data";
import { getSpxDailyCloses } from "@/lib/markets";
import { scoreVerdict, type ReturnWindow, type VerdictScore } from "@/lib/verdict-scoring";
import { formatPct, verdictColor } from "@/lib/utils";
import Panel from "@/components/panel";
import Tooltip from "@/components/tooltip";
import VerdictMarkerChart, {
  type VerdictMarker,
} from "@/components/verdict-marker-chart";

export const metadata = { title: "Track Record — Buy-Side Briefings" };
export const revalidate = 600;

const HORIZON_TIPS: Record<"d1" | "d5" | "d20", string> = {
  d1: "S&P 500 return 1 trading day after the verdict date — the fastest sanity check on whether the call was right.",
  d5: "S&P 500 return 5 trading days (~one calendar week) after the verdict. The 'did this week move the way the call implied' window.",
  d20: "S&P 500 return 20 trading days (~one calendar month) after the verdict. The horizon most short-term calls really play out over.",
};

function ReturnCell({ w }: { w: ReturnWindow }) {
  if (w.pending) {
    return <span className="text-[var(--dim)]">pending</span>;
  }
  if (w.pct === null) {
    return <span className="text-[var(--dim)]">—</span>;
  }
  const up = w.pct > 0;
  return (
    <span
      className={
        up ? "text-[var(--up)]" : w.pct < 0 ? "text-[var(--down)]" : "text-[var(--dim)]"
      }
    >
      {formatPct(w.pct)}
    </span>
  );
}

function RightCell({ value }: { value: boolean | null }) {
  if (value === null) return <span className="text-[var(--dim)]">—</span>;
  if (value)
    return (
      <span className="text-[var(--up)]" title="Right">
        ✓
      </span>
    );
  return (
    <span className="text-[var(--down)]" title="Wrong">
      ✗
    </span>
  );
}

export default async function TrackRecordPage() {
  const verdicts = getAllMarketsVerdicts();

  // Anchor the chart window around the verdicts we actually have. Default
  // 9 months back; extend if any verdict is older than that.
  const earliestVerdict = verdicts.length
    ? verdicts[verdicts.length - 1].date
    : null;
  let monthsBack = 9;
  if (earliestVerdict) {
    const days = Math.max(0, (Date.now() - new Date(earliestVerdict).getTime()) / 86_400_000);
    monthsBack = Math.max(9, Math.ceil(days / 30) + 2);
  }
  const spxSeries = await getSpxDailyCloses(monthsBack);

  // Score every verdict against the SPX series.
  const rows: Array<{ v: MarketsVerdict; score: VerdictScore }> = verdicts.map((v) => ({
    v,
    score: scoreVerdict(v, spxSeries),
  }));

  // Counts per verdict code (for the summary tiles).
  const counts: Record<string, number> = {};
  for (const v of verdicts) {
    counts[v.verdict.code] = (counts[v.verdict.code] ?? 0) + 1;
  }

  // Aggregate hit-rate over completed (non-pending, non-null) windows.
  let hits = 0;
  let scored = 0;
  for (const { score } of rows) {
    for (const r of [score.right_d1, score.right_d5, score.right_d20]) {
      if (r === null) continue;
      scored += 1;
      if (r) hits += 1;
    }
  }
  const hitRate = scored > 0 ? (hits / scored) * 100 : null;

  // Build markers for the chart.
  const markers: VerdictMarker[] = rows.map(({ v, score }) => ({
    date: score.base_date ?? v.date,
    close: score.base_close,
    emoji: v.verdict.emoji,
    label: v.verdict.label,
    code: v.verdict.code,
  }));

  return (
    <div className="space-y-1">
      <Panel
        code="CHART"
        title="SPX · Verdicts Overlaid"
        learn="The S&P 500 daily close (amber line) with a colored dot at each verdict date. Green dots = BUY calls, yellow = HOLD, orange = STEP ASIDE, red = BEARISH. Hover a dot's date on the X-axis to see the SPX level. The whole point: at a glance, see whether the calls landed where the index turned."
        meta={<span>{monthsBack}MO · DAILY</span>}
      >
        <VerdictMarkerChart series={spxSeries} markers={markers} />
      </Panel>

      <div className="grid grid-cols-2 gap-1 sm:grid-cols-5">
        {(["buy", "hold", "step_aside", "bearish"] as const).map((code) => {
          const color = verdictColor(code);
          return (
            <div
              key={code}
              className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5"
            >
              <div className={`font-mono text-[10px] uppercase tracking-widest ${color.text}`}>
                {code.replace("_", " ")}
              </div>
              <div className="mt-0.5 font-mono text-[18px] text-[var(--foreground)]">
                {counts[code] ?? 0}
              </div>
            </div>
          );
        })}
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
            <Tooltip text="Across every completed +1d/+5d/+20d window for every verdict, the percentage that was directionally correct. 'Hold' verdicts aren't included (they're not directional calls). Wait for ~20+ verdicts before reading the number seriously — small samples are noisy.">
              Hit rate
            </Tooltip>
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--foreground)]">
            {hitRate === null ? "—" : `${hitRate.toFixed(0)}%`}
          </div>
          <div className="font-mono text-[10px] text-[var(--dim)]">
            {scored === 0 ? "no scored windows yet" : `${hits}/${scored} windows`}
          </div>
        </div>
      </div>

      <Panel
        code="LOG"
        title="All Verdicts · Forward Returns vs SPX"
        learn="Every Buy Verdict ever published, time-stamped and audited against SPX. Columns +1d/+5d/+20d are the S&P 500 return that many trading days after the verdict. ✓/✗ marks whether the call was directionally right. Hold rows are informational only — they're not directional calls so they can't be right or wrong."
      >
        {rows.length === 0 ? (
          <div className="p-3 text-center font-mono text-[11px] text-[var(--dim)]">
            No verdicts logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[11px]">
              <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
                <tr>
                  <th className="px-2 py-1 text-left font-normal">Date</th>
                  <th className="px-2 py-1 text-left font-normal">Win</th>
                  <th className="px-2 py-1 text-left font-normal">Verdict</th>
                  <th className="px-2 py-1 text-right font-normal">
                    <Tooltip text={HORIZON_TIPS.d1}>+1d</Tooltip>
                  </th>
                  <th className="px-2 py-1 text-right font-normal">
                    <Tooltip text={HORIZON_TIPS.d5}>+5d</Tooltip>
                  </th>
                  <th className="px-2 py-1 text-right font-normal">
                    <Tooltip text={HORIZON_TIPS.d20}>+20d</Tooltip>
                  </th>
                  <th className="px-2 py-1 text-center font-normal">Right?</th>
                  <th className="px-2 py-1 text-left font-normal">Rationale</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ v, score }) => {
                  const color = verdictColor(v.verdict.code);
                  const slug = `${v.date}-${v.window}`;
                  return (
                    <tr key={slug} className="border-t border-[var(--border)] align-top">
                      <td className="px-2 py-1 text-[var(--foreground)]">{v.date}</td>
                      <td className="px-2 py-1 text-[var(--dim)]">{v.window}</td>
                      <td className="px-2 py-1">
                        <Link
                          href={`/briefings/${v.routine}/${slug}`}
                          className={`inline-flex items-center gap-1.5 ${color.text} hover:underline`}
                        >
                          <span>{v.verdict.emoji}</span>
                          <span>{v.verdict.label}</span>
                        </Link>
                      </td>
                      <td className="px-2 py-1 text-right">
                        <ReturnCell w={score.d1} />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <ReturnCell w={score.d5} />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <ReturnCell w={score.d20} />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <div className="flex justify-center gap-1">
                          <RightCell value={score.right_d1} />
                          <RightCell value={score.right_d5} />
                          <RightCell value={score.right_d20} />
                        </div>
                      </td>
                      <td className="max-w-md px-2 py-1 text-[var(--foreground)]">
                        {v.verdict.rationale_short}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel code="NOTE" title="Methodology">
        <div className="space-y-1.5 p-2 font-mono text-[11px] leading-snug text-[var(--dim)]">
          <p>
            Each verdict is matched to the SPX closing level on its date (or the next trading
            day if it falls on a weekend), then the +1d / +5d / +20d closes are read off the
            same series. Returns shown are simple percent changes vs. that base close.
          </p>
          <p>
            <span className="text-[var(--amber-dim)]">Scoring rules:</span>{" "}
            <span className="text-[var(--up)]">BUY</span> is right if SPX is up;{" "}
            <span className="text-[var(--down)]">BEARISH</span> is right if SPX is down;{" "}
            <span className="text-[var(--foreground)]">STEP ASIDE</span> is right if SPX is
            flat or down (you didn&apos;t miss meaningful upside);{" "}
            <span className="text-[var(--foreground)]">HOLD</span> is informational and not
            scored.
          </p>
          <p>
            Hit rate becomes meaningful at ~20 verdicts. Below that, treat the number as
            anecdote, not signal.
          </p>
        </div>
      </Panel>
    </div>
  );
}
