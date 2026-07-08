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
  verdictColor,
} from "@/lib/utils";
import { buildPaperPortfolio } from "@/lib/paper-portfolio";
import EquityCurveChart from "@/components/equity-curve-chart";
import ExpectancyPanel from "@/components/expectancy-panel";
import Panel from "@/components/panel";
import VerdictMarkerChart, {
  type VerdictMarker,
} from "@/components/verdict-marker-chart";

export const metadata = { title: "Track Record — Buy-Side Briefings" };
export const revalidate = 600;

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
            Hit rate
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
          >
            <table className="w-full font-mono text-[11px] term-table">
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
                      {stats.best_call.v.verdict.label}
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
                      {stats.worst_call.v.verdict.label}
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
          title="Paper Portfolio vs SPX"
          meta={
            <span>
              <span className="hidden sm:inline">
                {portfolio.stats.start_date} → {portfolio.stats.end_date} ·{" "}
              </span>
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
                  <span className="text-[var(--foreground)]">
                    {portfolio.stats.best.ticker}
                  </span>{" "}
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
                  <span className="text-[var(--foreground)]">
                    {portfolio.stats.worst.ticker}
                  </span>{" "}
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

      {/* ---- #2 Edge & expectancy: the bottom-line profitability stats ---- */}
      <ExpectancyPanel opps={opps} />

      {/* ---- Calibration: does stated conviction predict outcomes? ---- */}
      <div className="grid grid-cols-1 gap-1 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel
            code="CALIB"
            title="Calibration · Verdicts by Conviction"
          >
            <table className="w-full font-mono text-[11px] term-table">
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
          >
            <table className="w-full font-mono text-[11px] term-table">
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
      >
        {rows.length === 0 ? (
          <div className="p-3 text-center font-mono text-[11px] text-[var(--dim)]">
            No verdicts logged yet.
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards — the 8-column table is unreadable at phone width. */}
            <div className="divide-y divide-[var(--border)] md:hidden">
              {rows.map(({ v, score }) => {
                const color = verdictColor(v.verdict.code);
                const slug = `${v.date}-${v.window}`;
                return (
                  <div key={slug} className="px-2 py-1.5 font-mono">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                      <span className="text-[var(--foreground)]">{v.date}</span>
                      <span className="text-[var(--dim)]">{v.window}</span>
                      <span className="ml-auto flex gap-1 normal-case">
                        <RightCell value={score.right_d1} />
                        <RightCell value={score.right_d5} />
                        <RightCell value={score.right_d20} />
                      </span>
                    </div>
                    <Link
                      href={`/briefings/${v.routine}/${slug}`}
                      className={`mt-0.5 block text-[12px] leading-snug ${color.text}`}
                    >
                      {v.verdict.emoji} {v.verdict.label}
                    </Link>
                    <div className="mt-0.5 flex gap-3 text-[10px]">
                      <span>
                        <span className="text-[var(--dim)]">+1d </span>
                        <ReturnCell w={score.d1} />
                      </span>
                      <span>
                        <span className="text-[var(--dim)]">+5d </span>
                        <ReturnCell w={score.d5} />
                      </span>
                      <span>
                        <span className="text-[var(--dim)]">+20d </span>
                        <ReturnCell w={score.d20} />
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-[10px] leading-snug text-[var(--dim)]">
                      {v.verdict.rationale_short}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
            <table className="w-full font-mono text-[11px] term-table">
              <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
                <tr>
                  <th className="px-2 py-1 text-left font-normal">Date</th>
                  <th className="px-2 py-1 text-left font-normal">Win</th>
                  <th className="px-2 py-1 text-left font-normal">Verdict</th>
                  <th className="px-2 py-1 text-right font-normal">
                    +1d
                  </th>
                  <th className="px-2 py-1 text-right font-normal">
                    +5d
                  </th>
                  <th className="px-2 py-1 text-right font-normal">
                    +20d
                  </th>
                  <th className="px-2 py-1 text-center font-normal">Right?</th>
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
                          className={`flex items-start gap-1.5 ${color.text} hover:underline`}
                        >
                          <span>{v.verdict.emoji}</span>
                          <span className="line-clamp-2 leading-snug">
                            {v.verdict.label}
                          </span>
                        </Link>
                        <p className="mt-1 line-clamp-3 text-[10px] leading-snug text-[var(--dim)]">
                          {v.verdict.rationale_short}
                        </p>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
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
