import Link from "next/link";
import {
  getAllMarketsVerdicts,
  getAllOpportunities,
  type MarketsVerdict,
} from "@/lib/data";
import { getSpxDailyCloses } from "@/lib/markets";
import {
  aggregateStats,
  calibrationByConviction,
  monthsBackFor,
  scoreVerdict,
  type Conviction,
  type ReturnWindow,
  type VerdictScore,
} from "@/lib/verdict-scoring";
import {
  formatBriefingTitle,
  formatPct,
  getVerdictExplanation,
  verdictColor,
} from "@/lib/utils";
import { buildPaperPortfolio } from "@/lib/paper-portfolio";
import EquityCurveChart from "@/components/equity-curve-chart";
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
  const monthsBack = monthsBackFor(earliestVerdict);
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

  // Per-code breakdown, best/worst, current streak — all computed once.
  const stats = aggregateStats(rows);

  // Calibration: does the stated conviction predict outcomes?
  const calib = calibrationByConviction(rows);

  // Same question for the opportunities journal (closed trades only).
  const opps = getAllOpportunities();

  // Paper portfolio: every closed idea taken at stated size, vs holding SPX.
  const portfolio = buildPaperPortfolio(opps, spxSeries);
  const oppCalib = (["high", "medium", "low"] as Conviction[]).map((conv) => {
    const ofConv = opps.filter((o) => o.conviction === conv);
    const wins = ofConv.filter((o) => o.status === "target_hit").length;
    const losses = ofConv.filter(
      (o) => o.status === "stopped_out" || o.status === "thesis_broken",
    ).length;
    const returns = ofConv
      .map((o) => o.outcome?.return_pct)
      .filter((r): r is number => typeof r === "number");
    return {
      conv,
      count: ofConv.length,
      wins,
      losses,
      hit_pct: wins + losses > 0 ? (wins / (wins + losses)) * 100 : null,
      avg_return:
        returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : null,
    };
  });

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

      {/* ---- Per-code performance + best/worst + streak (richer track stats) ---- */}
      <div className="grid grid-cols-1 gap-1 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Panel
            code="PERF"
            title="Performance by Verdict Code"
            learn="For each verdict code, the number issued, +5d hit rate (right / wrong / pending), and average SPX return at +5d. BUY is graded right when SPX is up; BEARISH right when down; STEP ASIDE right when SPX is flat or down (≤+1%). HOLD is informational only and isn't graded."
          >
            <table className="w-full font-mono text-[11px]">
              <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
                <tr>
                  <th className="px-2 py-1 text-left font-normal">Code</th>
                  <th className="px-2 py-1 text-right font-normal">N</th>
                  <th className="px-2 py-1 text-right font-normal">+5d Right</th>
                  <th className="px-2 py-1 text-right font-normal">+5d Wrong</th>
                  <th className="px-2 py-1 text-right font-normal">Pending</th>
                  <th className="px-2 py-1 text-right font-normal">+5d Hit %</th>
                  <th className="px-2 py-1 text-right font-normal">Avg +5d SPX</th>
                </tr>
              </thead>
              <tbody>
                {(["buy", "hold", "step_aside", "bearish"] as const).map((code) => {
                  const cs = stats.by_code[code];
                  const color = verdictColor(code);
                  const scoredN = cs.d5_right + cs.d5_wrong;
                  const hitPct = scoredN > 0 ? (cs.d5_right / scoredN) * 100 : null;
                  const avg = cs.avg_d5_pct;
                  const avgCls =
                    avg === null
                      ? "text-[var(--dim)]"
                      : avg > 0
                        ? "text-[var(--up)]"
                        : avg < 0
                          ? "text-[var(--down)]"
                          : "text-[var(--dim)]";
                  return (
                    <tr key={code} className="border-t border-[var(--border)]">
                      <td className={`px-2 py-0.5 uppercase ${color.text}`}>
                        {code.replace("_", " ")}
                      </td>
                      <td className="px-2 py-0.5 text-right text-[var(--foreground)]">
                        {cs.count}
                      </td>
                      <td className="px-2 py-0.5 text-right text-[var(--up)]">
                        {code === "hold" ? "—" : cs.d5_right}
                      </td>
                      <td className="px-2 py-0.5 text-right text-[var(--down)]">
                        {code === "hold" ? "—" : cs.d5_wrong}
                      </td>
                      <td className="px-2 py-0.5 text-right text-[var(--dim)]">
                        {cs.d5_pending}
                      </td>
                      <td className="px-2 py-0.5 text-right text-[var(--foreground)]">
                        {code === "hold"
                          ? "—"
                          : hitPct === null
                            ? "—"
                            : `${hitPct.toFixed(0)}%`}
                      </td>
                      <td className={`px-2 py-0.5 text-right ${avgCls}`}>
                        {avg === null ? "—" : formatPct(avg)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        </div>

        <div className="lg:col-span-4">
          <Panel
            code="HILO"
            title="Best & Worst Call · Streak"
            learn="The verdict with the strongest direction-adjusted +20d outcome (BEST), the verdict with the worst outcome (WORST), and the current consecutive same-result streak at the +5d window (STREAK). Direction-adjusted means a +5% SPX move counts as +5% for a BUY call but -5% for a BEARISH call. Requires +20d windows to be completed."
          >
            <div className="divide-y divide-[var(--border)]">
              {/* Best */}
              <div className="px-2 py-1.5">
                <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--up)]">
                  Best Call
                </div>
                {stats.best_call ? (
                  <>
                    <Link
                      href={`/briefings/${stats.best_call.v.routine}/${stats.best_call.v.date}-${stats.best_call.v.window}`}
                      className="mt-0.5 block font-mono text-[12px] text-[var(--foreground)] hover:underline"
                    >
                      {stats.best_call.v.verdict.emoji}{" "}
                      <Tooltip text={getVerdictExplanation(stats.best_call.v.verdict.code)}>
                        {stats.best_call.v.verdict.label}
                      </Tooltip>
                    </Link>
                    <div className="font-mono text-[10px] text-[var(--dim)]">
                      {formatBriefingTitle({
                        routine: stats.best_call.v.routine,
                        date: stats.best_call.v.date,
                        window: stats.best_call.v.window,
                      })}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-[var(--up)]">
                      +20d adjusted return {formatPct(stats.best_call.pct)}
                    </div>
                  </>
                ) : (
                  <div className="mt-0.5 font-mono text-[11px] text-[var(--dim)]">
                    no +20d windows complete yet
                  </div>
                )}
              </div>

              {/* Worst */}
              <div className="px-2 py-1.5">
                <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--down)]">
                  Worst Call
                </div>
                {stats.worst_call ? (
                  <>
                    <Link
                      href={`/briefings/${stats.worst_call.v.routine}/${stats.worst_call.v.date}-${stats.worst_call.v.window}`}
                      className="mt-0.5 block font-mono text-[12px] text-[var(--foreground)] hover:underline"
                    >
                      {stats.worst_call.v.verdict.emoji}{" "}
                      <Tooltip text={getVerdictExplanation(stats.worst_call.v.verdict.code)}>
                        {stats.worst_call.v.verdict.label}
                      </Tooltip>
                    </Link>
                    <div className="font-mono text-[10px] text-[var(--dim)]">
                      {formatBriefingTitle({
                        routine: stats.worst_call.v.routine,
                        date: stats.worst_call.v.date,
                        window: stats.worst_call.v.window,
                      })}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-[var(--down)]">
                      +20d adjusted return {formatPct(stats.worst_call.pct)}
                    </div>
                  </>
                ) : (
                  <div className="mt-0.5 font-mono text-[11px] text-[var(--dim)]">
                    no +20d windows complete yet
                  </div>
                )}
              </div>

              {/* Streak */}
              <div className="px-2 py-1.5">
                <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
                  Current Streak · +5d
                </div>
                <div
                  className={
                    "mt-0.5 font-mono text-[14px] " +
                    (stats.streak_d5.kind === "right"
                      ? "text-[var(--up)]"
                      : stats.streak_d5.kind === "wrong"
                        ? "text-[var(--down)]"
                        : "text-[var(--dim)]")
                  }
                >
                  {stats.streak_d5.kind === "none"
                    ? "—"
                    : `${stats.streak_d5.length} ${stats.streak_d5.kind} in a row`}
                </div>
                <div className="font-mono text-[10px] text-[var(--dim)]">
                  oldest-to-newest at +5d, skipping HOLDs and pending
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* ---- Paper portfolio: the "are we making money" chart ---- */}
      {portfolio && (
        <Panel
          code="EQTY"
          title="Paper Portfolio · Every Closed Idea at Stated Size, vs SPX"
          learn="Simulates an account that took EVERY closed opportunity at its published position size, compounding each trade's recorded return on its close date (amber step line). The dashed cyan line is buying the S&P 500 on the journal's first day and doing nothing — the bar any strategy has to beat. Realized trades only: open ideas aren't marked to market, so the line moves only when a trade closes. Win-rate can flatter; this line can't."
          meta={
            <span>
              {portfolio.stats.start_date} → {portfolio.stats.end_date} ·{" "}
              {portfolio.stats.trades} CLOSED
            </span>
          }
        >
          <div className="grid grid-cols-2 divide-x divide-[var(--border)] border-b border-[var(--border)] font-mono sm:grid-cols-5">
            <div className="px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                Strategy
              </div>
              <div
                className={`mt-0.5 text-[15px] font-bold tabular-nums ${
                  portfolio.stats.total_return_pct >= 0
                    ? "text-[var(--up)]"
                    : "text-[var(--down)]"
                }`}
              >
                {formatPct(portfolio.stats.total_return_pct)}
              </div>
            </div>
            <div className="px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                SPX same period
              </div>
              <div
                className={`mt-0.5 text-[15px] font-bold tabular-nums ${
                  portfolio.stats.spx_return_pct >= 0
                    ? "text-[var(--up)]"
                    : "text-[var(--down)]"
                }`}
              >
                {formatPct(portfolio.stats.spx_return_pct)}
              </div>
            </div>
            <div className="px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                Edge vs SPX
              </div>
              <div
                className={`mt-0.5 text-[15px] font-bold tabular-nums ${
                  portfolio.stats.total_return_pct >= portfolio.stats.spx_return_pct
                    ? "text-[var(--up)]"
                    : "text-[var(--down)]"
                }`}
              >
                {formatPct(
                  portfolio.stats.total_return_pct - portfolio.stats.spx_return_pct,
                )}
              </div>
            </div>
            <div className="px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                Max drawdown
              </div>
              <div className="mt-0.5 text-[15px] font-bold tabular-nums text-[var(--down)]">
                {formatPct(portfolio.stats.max_drawdown_pct)}
              </div>
            </div>
            <div className="px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                Avg position
              </div>
              <div className="mt-0.5 text-[15px] font-bold tabular-nums text-[var(--foreground)]">
                {portfolio.stats.avg_position_pct.toFixed(1)}%
              </div>
            </div>
          </div>
          <EquityCurveChart points={portfolio.points} />
          {(portfolio.stats.best || portfolio.stats.worst) && (
            <div className="grid grid-cols-1 border-t border-[var(--border)] font-mono text-[11px] sm:grid-cols-2 sm:divide-x sm:divide-[var(--border)]">
              {portfolio.stats.best && (
                <div className="px-2 py-1.5">
                  <span className="text-[9px] uppercase tracking-widest text-[var(--up)]">
                    Best contribution ·{" "}
                  </span>
                  <Link
                    href={`/opportunities/${portfolio.stats.best.id}`}
                    className="text-[var(--foreground)] hover:underline"
                  >
                    {portfolio.stats.best.ticker}
                  </Link>{" "}
                  <span className="text-[var(--up)]">
                    {formatPct(portfolio.stats.best.contribution_pct)}
                  </span>{" "}
                  <span className="text-[var(--dim)]">
                    ({portfolio.stats.best.weight_pct}% ×{" "}
                    {formatPct(portfolio.stats.best.return_pct)})
                  </span>
                </div>
              )}
              {portfolio.stats.worst && (
                <div className="px-2 py-1.5">
                  <span className="text-[9px] uppercase tracking-widest text-[var(--down)]">
                    Worst contribution ·{" "}
                  </span>
                  <Link
                    href={`/opportunities/${portfolio.stats.worst.id}`}
                    className="text-[var(--foreground)] hover:underline"
                  >
                    {portfolio.stats.worst.ticker}
                  </Link>{" "}
                  <span className="text-[var(--down)]">
                    {formatPct(portfolio.stats.worst.contribution_pct)}
                  </span>{" "}
                  <span className="text-[var(--dim)]">
                    ({portfolio.stats.worst.weight_pct}% ×{" "}
                    {formatPct(portfolio.stats.worst.return_pct)})
                  </span>
                </div>
              )}
            </div>
          )}
        </Panel>
      )}

      {/* ---- Calibration: does stated conviction predict outcomes? ---- */}
      <div className="grid grid-cols-1 gap-1 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel
            code="CALIB"
            title="Calibration · Verdicts by Conviction"
            learn="Every directional verdict (HOLD excluded) grouped by the conviction it was published with. 'Adj +5d' is the direction-adjusted SPX return at +5 trading days — a BEARISH call that preceded a -2% week counts as +2%. If HIGH-conviction calls don't beat MEDIUM and LOW here, the conviction tag carries no information and should be discounted when reading new briefings."
          >
            <table className="w-full font-mono text-[11px]">
              <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
                <tr>
                  <th className="px-2 py-1 text-left font-normal">Conviction</th>
                  <th className="px-2 py-1 text-right font-normal">N</th>
                  <th className="px-2 py-1 text-right font-normal">+5d Right</th>
                  <th className="px-2 py-1 text-right font-normal">+5d Wrong</th>
                  <th className="px-2 py-1 text-right font-normal">Pending</th>
                  <th className="px-2 py-1 text-right font-normal">Hit %</th>
                  <th className="px-2 py-1 text-right font-normal">Adj +5d</th>
                </tr>
              </thead>
              <tbody>
                {(["high", "medium", "low"] as Conviction[]).map((conv) => {
                  const cs = calib[conv];
                  const avg = cs.avg_adj_d5_pct;
                  const avgCls =
                    avg === null
                      ? "text-[var(--dim)]"
                      : avg > 0
                        ? "text-[var(--up)]"
                        : avg < 0
                          ? "text-[var(--down)]"
                          : "text-[var(--dim)]";
                  return (
                    <tr key={conv} className="border-t border-[var(--border)]">
                      <td className="px-2 py-0.5 uppercase text-[var(--amber)]">{conv}</td>
                      <td className="px-2 py-0.5 text-right text-[var(--foreground)]">
                        {cs.count}
                      </td>
                      <td className="px-2 py-0.5 text-right text-[var(--up)]">{cs.d5_right}</td>
                      <td className="px-2 py-0.5 text-right text-[var(--down)]">
                        {cs.d5_wrong}
                      </td>
                      <td className="px-2 py-0.5 text-right text-[var(--dim)]">
                        {cs.d5_pending}
                      </td>
                      <td className="px-2 py-0.5 text-right text-[var(--foreground)]">
                        {cs.hit_pct === null ? "—" : `${cs.hit_pct.toFixed(0)}%`}
                      </td>
                      <td className={`px-2 py-0.5 text-right ${avgCls}`}>
                        {avg === null ? "—" : formatPct(avg)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="px-2 py-1.5 font-mono text-[10px] leading-snug text-[var(--dim)]">
              The question this table answers: when a briefing says HIGH conviction, is it
              actually right more often? Until each row has ~10 scored windows, read it as
              anecdote.
            </p>
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel
            code="CALIB-OPS"
            title="Calibration · Opportunities by Conviction"
            learn="Closed trade ideas from the Opportunities journal grouped by stated conviction. Wins = target hit; losses = stopped out or thesis broken; expired ideas count in N but not in the hit rate. Avg return uses each closed trade's recorded return."
          >
            <table className="w-full font-mono text-[11px]">
              <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
                <tr>
                  <th className="px-2 py-1 text-left font-normal">Conviction</th>
                  <th className="px-2 py-1 text-right font-normal">N</th>
                  <th className="px-2 py-1 text-right font-normal">W</th>
                  <th className="px-2 py-1 text-right font-normal">L</th>
                  <th className="px-2 py-1 text-right font-normal">Hit %</th>
                  <th className="px-2 py-1 text-right font-normal">Avg Ret</th>
                </tr>
              </thead>
              <tbody>
                {oppCalib.map((row) => {
                  const avgCls =
                    row.avg_return === null
                      ? "text-[var(--dim)]"
                      : row.avg_return > 0
                        ? "text-[var(--up)]"
                        : row.avg_return < 0
                          ? "text-[var(--down)]"
                          : "text-[var(--dim)]";
                  return (
                    <tr key={row.conv} className="border-t border-[var(--border)]">
                      <td className="px-2 py-0.5 uppercase text-[var(--amber)]">{row.conv}</td>
                      <td className="px-2 py-0.5 text-right text-[var(--foreground)]">
                        {row.count}
                      </td>
                      <td className="px-2 py-0.5 text-right text-[var(--up)]">{row.wins}</td>
                      <td className="px-2 py-0.5 text-right text-[var(--down)]">{row.losses}</td>
                      <td className="px-2 py-0.5 text-right text-[var(--foreground)]">
                        {row.hit_pct === null ? "—" : `${row.hit_pct.toFixed(0)}%`}
                      </td>
                      <td className={`px-2 py-0.5 text-right ${avgCls}`}>
                        {row.avg_return === null ? "—" : formatPct(row.avg_return)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="px-2 py-1.5 font-mono text-[10px] leading-snug text-[var(--dim)]">
              Same calibration question, applied to the trade journal: do HIGH-conviction
              ideas win more often and return more when they do?
            </p>
          </Panel>
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
                          <span>
                            <Tooltip text={getVerdictExplanation(v.verdict.code)}>
                              {v.verdict.label}
                            </Tooltip>
                          </span>
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
