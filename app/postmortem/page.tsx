import Link from "next/link";
import {
  getAllMarketsVerdicts,
  getAllOpportunities,
  type MarketsVerdict,
  type Opportunity,
} from "@/lib/data";
import { getSpxDailyCloses } from "@/lib/markets";
import {
  calibrationByConviction,
  monthsBackFor,
  scoreVerdict,
  type Conviction,
  type VerdictScore,
} from "@/lib/verdict-scoring";
import { isLongish } from "@/lib/trade-math";
import {
  formatPct,
  getVerdictExplanation,
  verdictColor,
} from "@/lib/utils";
import Panel from "@/components/panel";
import Tooltip from "@/components/tooltip";

export const metadata = { title: "What I Got Wrong — Buy-Side Briefings" };
export const revalidate = 600;

const CLOSED = new Set(["target_hit", "stopped_out", "thesis_broken", "expired"]);

/** Book damage = the trade's return scaled by the capital actually committed.
 *  A -10% loss at 4% size costs the book 0.4%. This is what a miss really cost,
 *  not the headline return. Negative for losers. */
function bookContribution(o: Opportunity): number {
  const r = o.outcome?.return_pct;
  if (typeof r !== "number") return 0;
  return (r * (o.position_size_pct ?? 0)) / 100;
}

function directionLabel(d: Opportunity["direction"]): string {
  return d.replace("_", " ");
}

export default async function PostmortemPage() {
  const verdicts = getAllMarketsVerdicts();
  const opps = getAllOpportunities();

  const earliest = verdicts.length ? verdicts[verdicts.length - 1].date : null;
  const spxSeries = await getSpxDailyCloses(monthsBackFor(earliest));

  const rows: Array<{ v: MarketsVerdict; score: VerdictScore }> = verdicts.map(
    (v) => ({ v, score: scoreVerdict(v, spxSeries) }),
  );

  // ---- Wrong verdicts: directional calls the market moved against at +5d ----
  // adj = direction-adjusted +5d return; negative means the call cost you.
  const wrongVerdicts = rows
    .filter((r) => r.score.right_d5 === false && r.score.d5.pct !== null)
    .map(({ v, score }) => {
      const adj = v.verdict.code === "buy" ? score.d5.pct! : -score.d5.pct!;
      return { v, score, adj };
    })
    .sort((a, b) => a.adj - b.adj);

  // ---- Losing trades: closed ideas that finished red, worst book damage first ----
  const closed = opps.filter(
    (o) => CLOSED.has(o.status) && typeof o.outcome?.return_pct === "number",
  );
  const losers = closed
    .filter((o) => o.outcome!.return_pct < 0)
    .sort((a, b) => bookContribution(a) - bookContribution(b));
  const totalDamage = losers.reduce((s, o) => s + bookContribution(o), 0);

  // ---- Miss rate by conviction: does HIGH conviction fail less? ----
  const calib = calibrationByConviction(rows);

  // ---- Loss concentration by theme tag ----
  const tagMap = new Map<string, { damage: number; count: number }>();
  for (const o of losers) {
    const d = bookContribution(o);
    for (const tag of o.tags ?? []) {
      const cur = tagMap.get(tag) ?? { damage: 0, count: 0 };
      cur.damage += d;
      cur.count += 1;
      tagMap.set(tag, cur);
    }
  }
  const worstTags = [...tagMap.entries()]
    .map(([tag, v]) => ({ tag, ...v }))
    .sort((a, b) => a.damage - b.damage)
    .slice(0, 8);

  // ---- Long vs short scorecard over closed trades ----
  const sideBuckets: Record<"long" | "short", { n: number; wins: number; losses: number; sumRet: number }> = {
    long: { n: 0, wins: 0, losses: 0, sumRet: 0 },
    short: { n: 0, wins: 0, losses: 0, sumRet: 0 },
  };
  for (const o of closed) {
    const side = isLongish(o.direction) ? "long" : "short";
    const r = o.outcome!.return_pct;
    sideBuckets[side].n += 1;
    sideBuckets[side].sumRet += r;
    if (r > 0) sideBuckets[side].wins += 1;
    else sideBuckets[side].losses += 1;
  }

  const wrongCount = rows.filter((r) => r.score.right_d5 === false).length;

  return (
    <div className="space-y-1">
      {/* ---- Headline damage tiles ---- */}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--down)]">
            <Tooltip text="Directional markets verdicts (BUY/STEP ASIDE/BEARISH) that the S&P moved against at the +5 trading-day window. HOLD and still-pending windows are excluded.">
              Wrong verdicts · +5d
            </Tooltip>
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--foreground)]">
            {wrongCount}
          </div>
        </div>
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--down)]">
            Losing trades
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--foreground)]">
            {losers.length}
            <span className="ml-1 text-[11px] text-[var(--dim)]">
              / {closed.length} closed
            </span>
          </div>
        </div>
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--down)]">
            <Tooltip text="Sum of every losing trade's contribution to the book — each trade's return scaled by the capital it was sized at. The cumulative drag the misses created.">
              Book damage
            </Tooltip>
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--down)]">
            {formatPct(totalDamage)}
          </div>
        </div>
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--down)]">
            Worst single miss
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--down)]">
            {losers.length ? formatPct(losers[0].outcome!.return_pct) : "—"}
          </div>
          <div className="truncate font-mono text-[10px] text-[var(--dim)]">
            {losers.length ? losers[0].ticker : "no losses logged"}
          </div>
        </div>
      </div>

      {/* ---- Losing trades, ranked by what they cost the book ---- */}
      <Panel
        code="LOSS"
        title="Losing Trades · Ranked by Book Damage"
        learn="Every closed opportunity that finished in the red, sorted by the damage it did to the book (return × position size) — not the raw return. A big loss at a small size can hurt less than a medium loss sized large. The recorded post-trade note is the lesson the journal already wrote down."
        meta={<span>{losers.length} LOSERS</span>}
      >
        {losers.length === 0 ? (
          <div className="p-3 text-center font-mono text-[11px] text-[var(--dim)]">
            No losing trades logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[11px] term-table">
              <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
                <tr>
                  <th className="px-2 py-1 text-left font-normal">Ticker</th>
                  <th className="px-2 py-1 text-left font-normal">Dir</th>
                  <th className="px-2 py-1 text-left font-normal">Conv</th>
                  <th className="px-2 py-1 text-right font-normal">Size</th>
                  <th className="px-2 py-1 text-right font-normal">Return</th>
                  <th className="px-2 py-1 text-right font-normal">
                    <Tooltip text="Return × position size: the trade's actual contribution to the book.">
                      Damage
                    </Tooltip>
                  </th>
                  <th className="px-2 py-1 text-left font-normal">Closed</th>
                  <th className="px-2 py-1 text-left font-normal">Lesson</th>
                </tr>
              </thead>
              <tbody>
                {losers.map((o) => (
                  <tr key={o.id} className="border-t border-[var(--border)] align-top">
                    <td className="px-2 py-1">
                      <Link
                        href={`/opportunities/${o.id}`}
                        className="text-[var(--foreground)] hover:underline"
                      >
                        {o.ticker}
                      </Link>
                    </td>
                    <td className="px-2 py-1 uppercase text-[var(--dim)]">
                      {directionLabel(o.direction)}
                    </td>
                    <td className="px-2 py-1 uppercase text-[var(--amber)]">
                      {o.conviction}
                    </td>
                    <td className="px-2 py-1 text-right text-[var(--dim)]">
                      {o.position_size_pct}%
                    </td>
                    <td className="px-2 py-1 text-right text-[var(--down)]">
                      {formatPct(o.outcome!.return_pct)}
                    </td>
                    <td className="px-2 py-1 text-right text-[var(--down)]">
                      {formatPct(bookContribution(o))}
                    </td>
                    <td className="px-2 py-1 text-[var(--dim)]">
                      {o.outcome!.closed_at}
                    </td>
                    <td className="max-w-md px-2 py-1 text-[var(--foreground)]">
                      {o.outcome!.note ?? o.outcome!.outcome_label}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ---- Error patterns ---- */}
      <div className="grid grid-cols-1 gap-1 lg:grid-cols-12">
        {/* Miss rate by conviction */}
        <div className="lg:col-span-4">
          <Panel
            code="CONV"
            title="Miss Rate by Conviction"
            learn="For every directional verdict graded at +5d, the share that was WRONG, split by the conviction it carried. If HIGH-conviction calls miss as often as LOW, the conviction tag isn't carrying information and shouldn't move your sizing."
          >
            <table className="w-full font-mono text-[11px] term-table">
              <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
                <tr>
                  <th className="px-2 py-1 text-left font-normal">Conviction</th>
                  <th className="px-2 py-1 text-right font-normal">Graded</th>
                  <th className="px-2 py-1 text-right font-normal">Wrong</th>
                  <th className="px-2 py-1 text-right font-normal">Miss %</th>
                </tr>
              </thead>
              <tbody>
                {(["high", "medium", "low"] as Conviction[]).map((conv) => {
                  const cs = calib[conv];
                  const graded = cs.d5_right + cs.d5_wrong;
                  const missPct = graded > 0 ? (cs.d5_wrong / graded) * 100 : null;
                  const cls =
                    missPct === null
                      ? "text-[var(--dim)]"
                      : missPct > 50
                        ? "text-[var(--down)]"
                        : "text-[var(--foreground)]";
                  return (
                    <tr key={conv} className="border-t border-[var(--border)]">
                      <td className="px-2 py-0.5 uppercase text-[var(--amber)]">{conv}</td>
                      <td className="px-2 py-0.5 text-right text-[var(--foreground)]">
                        {graded}
                      </td>
                      <td className="px-2 py-0.5 text-right text-[var(--down)]">
                        {cs.d5_wrong}
                      </td>
                      <td className={`px-2 py-0.5 text-right ${cls}`}>
                        {missPct === null ? "—" : `${missPct.toFixed(0)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="px-2 py-1.5 font-mono text-[10px] leading-snug text-[var(--dim)]">
              The tell: HIGH should miss least. If it doesn&apos;t, discount the label.
            </p>
          </Panel>
        </div>

        {/* Long vs short scorecard */}
        <div className="lg:col-span-3">
          <Panel
            code="SIDE"
            title="Long vs Short"
            learn="Closed trades bucketed by side (long-ish vs short-ish). Shows whether the losses cluster on one side — a directional bias worth knowing about. Avg return is the mean realized return across that bucket."
          >
            <table className="w-full font-mono text-[11px] term-table">
              <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
                <tr>
                  <th className="px-2 py-1 text-left font-normal">Side</th>
                  <th className="px-2 py-1 text-right font-normal">N</th>
                  <th className="px-2 py-1 text-right font-normal">W/L</th>
                  <th className="px-2 py-1 text-right font-normal">Avg</th>
                </tr>
              </thead>
              <tbody>
                {(["long", "short"] as const).map((side) => {
                  const b = sideBuckets[side];
                  const avg = b.n > 0 ? b.sumRet / b.n : null;
                  const cls =
                    avg === null
                      ? "text-[var(--dim)]"
                      : avg > 0
                        ? "text-[var(--up)]"
                        : "text-[var(--down)]";
                  return (
                    <tr key={side} className="border-t border-[var(--border)]">
                      <td className="px-2 py-0.5 uppercase text-[var(--amber)]">{side}</td>
                      <td className="px-2 py-0.5 text-right text-[var(--foreground)]">
                        {b.n}
                      </td>
                      <td className="px-2 py-0.5 text-right text-[var(--dim)]">
                        <span className="text-[var(--up)]">{b.wins}</span>/
                        <span className="text-[var(--down)]">{b.losses}</span>
                      </td>
                      <td className={`px-2 py-0.5 text-right ${cls}`}>
                        {avg === null ? "—" : formatPct(avg)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        </div>

        {/* Loss concentration by theme */}
        <div className="lg:col-span-5">
          <Panel
            code="THEME"
            title="Where the Losses Cluster · by Tag"
            learn="Book damage from losing trades, summed by theme tag (a trade with three tags contributes to all three). Surfaces which themes have been net-destructive — the categories to take smaller or skip until the thesis improves."
          >
            {worstTags.length === 0 ? (
              <div className="p-3 text-center font-mono text-[11px] text-[var(--dim)]">
                No tagged losses yet.
              </div>
            ) : (
              <table className="w-full font-mono text-[11px] term-table">
                <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
                  <tr>
                    <th className="px-2 py-1 text-left font-normal">Tag</th>
                    <th className="px-2 py-1 text-right font-normal">Losses</th>
                    <th className="px-2 py-1 text-right font-normal">Damage</th>
                  </tr>
                </thead>
                <tbody>
                  {worstTags.map((t) => (
                    <tr key={t.tag} className="border-t border-[var(--border)]">
                      <td className="px-2 py-0.5 text-[var(--cyan-term)]">{t.tag}</td>
                      <td className="px-2 py-0.5 text-right text-[var(--foreground)]">
                        {t.count}
                      </td>
                      <td className="px-2 py-0.5 text-right text-[var(--down)]">
                        {formatPct(t.damage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      </div>

      {/* ---- Wrong verdicts, ranked by the move they fought ---- */}
      <Panel
        code="MISS"
        title="Wrong Verdicts · +5d"
        learn="Directional markets verdicts the S&P moved against over the +5 trading-day window, worst first. 'Cost' is the direction-adjusted move: a BUY ahead of a -2% week shows -2%; a BEARISH ahead of a +2% week also shows -2%. HOLD and pending windows are excluded — they can't be wrong."
        meta={<span>{wrongVerdicts.length} MISSED</span>}
      >
        {wrongVerdicts.length === 0 ? (
          <div className="p-3 text-center font-mono text-[11px] text-[var(--dim)]">
            No graded misses yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[11px] term-table">
              <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
                <tr>
                  <th className="px-2 py-1 text-left font-normal">Date</th>
                  <th className="px-2 py-1 text-left font-normal">Verdict</th>
                  <th className="px-2 py-1 text-right font-normal">SPX +5d</th>
                  <th className="px-2 py-1 text-right font-normal">Cost</th>
                  <th className="px-2 py-1 text-left font-normal">Rationale at the time</th>
                </tr>
              </thead>
              <tbody>
                {wrongVerdicts.map(({ v, score, adj }) => {
                  const color = verdictColor(v.verdict.code);
                  const slug = `${v.date}-${v.window}`;
                  return (
                    <tr key={slug} className="border-t border-[var(--border)] align-top">
                      <td className="px-2 py-1 text-[var(--foreground)]">
                        {v.date}
                        <span className="ml-1 text-[var(--dim)]">{v.window}</span>
                      </td>
                      <td className="px-2 py-1">
                        <Link
                          href={`/briefings/${v.routine}/${slug}`}
                          className={`inline-flex items-center gap-1.5 ${color.text} hover:underline`}
                        >
                          <span>{v.verdict.emoji}</span>
                          <Tooltip text={getVerdictExplanation(v.verdict.code)}>
                            {v.verdict.label}
                          </Tooltip>
                        </Link>
                      </td>
                      <td className="px-2 py-1 text-right text-[var(--foreground)]">
                        {score.d5.pct === null ? "—" : formatPct(score.d5.pct)}
                      </td>
                      <td className="px-2 py-1 text-right text-[var(--down)]">
                        {formatPct(adj)}
                      </td>
                      <td className="max-w-md px-2 py-1 text-[var(--dim)]">
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

      <Panel code="NOTE" title="How to read this page">
        <div className="space-y-1.5 p-2 font-mono text-[11px] leading-snug text-[var(--dim)]">
          <p>
            This is the inverse of the track record: it isolates the misses so the
            patterns in them are visible. Two independent error streams —{" "}
            <span className="text-[var(--foreground)]">markets verdicts</span> graded
            against SPX, and <span className="text-[var(--foreground)]">closed trade
            ideas</span> graded by realized return.
          </p>
          <p>
            <span className="text-[var(--amber-dim)]">Book damage</span> weights a loss
            by the capital behind it (return × position size), so a small-size blow-up
            doesn&apos;t outrank a large-size grind. It&apos;s the number that actually
            moved the equity curve.
          </p>
          <p>
            Read the pattern tables, not the individual rows: a single wrong call is
            noise; a conviction tier that misses 60% of the time, or a theme that&apos;s
            net-negative across several trades, is signal worth changing behavior over.
          </p>
        </div>
      </Panel>
    </div>
  );
}
