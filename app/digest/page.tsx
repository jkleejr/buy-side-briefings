import Link from "next/link";
import { getAllMarketsVerdicts, type MarketsVerdict } from "@/lib/data";
import { getSpxDailyCloses } from "@/lib/markets";
import { scoreVerdict, type VerdictScore } from "@/lib/verdict-scoring";
import {
  formatPct,
  verdictColor,
  formatBriefingTitle,
  formatRelativeTime,
} from "@/lib/utils";
import Panel from "@/components/panel";
import VerdictMarkerChart, { type VerdictMarker } from "@/components/verdict-marker-chart";

export const metadata = { title: "Week in Review — Buy-Side Briefings" };
export const revalidate = 600;

const WINDOW_DAYS = 7;

function fmtRange(start: Date, end: Date): string {
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const endStr = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return sameYear ? `${startStr} – ${endStr}` : `${startStr} – ${endStr}`;
}

export default async function DigestPage() {
  const all = getAllMarketsVerdicts();

  // Trailing 7 days. Inclusive on both ends.
  const endDate = new Date();
  endDate.setUTCHours(0, 0, 0, 0);
  const startDate = new Date(endDate.getTime() - WINDOW_DAYS * 86_400_000);
  const startStr = startDate.toISOString().slice(0, 10);

  const weekly = all.filter((v) => v.date >= startStr);

  // The window label is wall-clock, so it reads as fully current even when the
  // feed stopped days ago. Surface how far the verdicts actually reach.
  const endStr = endDate.toISOString().slice(0, 10);
  const coveredThrough = weekly[0]?.date ?? null;

  // Fetch ~2 months of SPX so we have room around the verdicts for the chart.
  const spxSeries = await getSpxDailyCloses(2);

  const scored: Array<{ v: MarketsVerdict; score: VerdictScore }> = weekly.map((v) => ({
    v,
    score: scoreVerdict(v, spxSeries),
  }));

  // Count by code (this week only)
  const counts: Record<string, number> = { buy: 0, hold: 0, step_aside: 0, bearish: 0 };
  for (const { v } of scored) {
    counts[v.verdict.code] = (counts[v.verdict.code] ?? 0) + 1;
  }

  // Aggregate hit rate over scored windows.
  let hits = 0;
  let scoredWindows = 0;
  for (const { score } of scored) {
    for (const r of [score.right_d1, score.right_d5, score.right_d20]) {
      if (r === null) continue;
      scoredWindows += 1;
      if (r) hits += 1;
    }
  }
  const hitRate = scoredWindows > 0 ? (hits / scoredWindows) * 100 : null;

  const markers: VerdictMarker[] = scored.map(({ v, score }) => ({
    date: score.base_date ?? v.date,
    close: score.base_close,
    emoji: v.verdict.emoji,
    label: v.verdict.label,
    code: v.verdict.code,
  }));

  // Slice SPX to roughly the same window (~2 weeks back) for a digest-scale chart.
  const sliceStart = new Date(endDate.getTime() - 14 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const spxSlice = spxSeries.filter((p) => p.date >= sliceStart);

  return (
    <div className="space-y-1">
      <header className="space-y-1 px-1 pb-2">
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] hover:underline"
        >
          ◂ DASHBOARD
        </Link>
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Week in Review
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          {fmtRange(startDate, endDate)} · trailing {WINDOW_DAYS} days
          {coveredThrough && coveredThrough !== endStr
            ? ` · verdicts through ${coveredThrough}`
            : ""}
        </p>
      </header>

      {/* ----- Summary tiles ----- */}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-6">
        <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
            Verdicts
          </div>
          <div className="mt-0.5 font-mono text-[18px] text-[var(--foreground)]">
            {scored.length}
          </div>
          <div className="font-mono text-[10px] text-[var(--dim)]">this week</div>
        </div>

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
            {scoredWindows === 0 ? "windows pending" : `${hits}/${scoredWindows} windows`}
          </div>
        </div>
      </div>

      {/* ----- SPX chart with this week's verdict markers ----- */}
      <Panel
        code="WK-CHART"
        title="SPX · This Week with Verdicts"
        meta={<span>2W · DAILY</span>}
      >
        <VerdictMarkerChart series={spxSlice} markers={markers} />
      </Panel>

      {/* ----- Per-verdict list ----- */}
      <Panel
        code="VRDCTS"
        title={`Verdicts logged · last ${WINDOW_DAYS} days`}
      >
        {scored.length === 0 ? (
          <div className="p-4 text-center font-mono text-[11px] text-[var(--dim)]">
            No verdicts logged in the trailing {WINDOW_DAYS} days. Generate one via Claude and
            commit to <code className="text-[var(--amber)]">data/briefings/</code> +{" "}
            <code className="text-[var(--amber)]">data/verdicts/</code>.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {scored.map(({ v, score }) => {
              const color = verdictColor(v.verdict.code);
              const slug = `${v.date}-${v.window}`;
              const title = formatBriefingTitle({
                routine: v.routine,
                date: v.date,
                window: v.window,
              });
              return (
                <li key={slug} className="px-2 py-2">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Link
                      href={`/briefings/${v.routine}/${slug}`}
                      className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide ${color.text} hover:underline`}
                    >
                      <span>{v.verdict.emoji}</span>
                      <span>
                        {v.verdict.label}
                      </span>
                    </Link>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
                      {title}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-[var(--dim)]">
                      {formatRelativeTime(v.generated_at)}
                    </span>
                  </div>

                  <div className="mt-1 font-mono text-[11px] leading-snug text-[var(--foreground)]">
                    {v.verdict.rationale_short}
                  </div>

                  {/* Per-verdict scoring strip */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10px]">
                    {(["d1", "d5", "d20"] as const).map((key) => {
                      const w = score[key];
                      const right = score[`right_${key}` as "right_d1" | "right_d5" | "right_d20"];
                      const labelMap = { d1: "+1d", d5: "+5d", d20: "+20d" } as const;
                      let pctStr = "pending";
                      let pctCls = "text-[var(--dim)]";
                      if (!w.pending && w.pct !== null) {
                        pctStr = formatPct(w.pct);
                        pctCls =
                          w.pct > 0
                            ? "text-[var(--up)]"
                            : w.pct < 0
                              ? "text-[var(--down)]"
                              : "text-[var(--dim)]";
                      }
                      const rightCls =
                        right === null
                          ? "text-[var(--dim)]"
                          : right
                            ? "text-[var(--up)]"
                            : "text-[var(--down)]";
                      const rightMark = right === null ? "—" : right ? "✓" : "✗";
                      return (
                        <span key={key} className="flex items-center gap-1">
                          <span className="text-[var(--amber-dim)]">{labelMap[key]}</span>
                          <span className={pctCls}>{pctStr}</span>
                          <span className={rightCls}>{rightMark}</span>
                        </span>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel code="NOTE" title="About this digest">
        <div className="space-y-1.5 p-3 font-mono text-[11px] leading-snug text-[var(--dim)]">
          <p>
            This page auto-rebuilds from the briefings and verdicts in the repo. Every time
            you commit a new briefing, it shows up here within ~10 minutes (the cache window).
          </p>
          <p>
            Hit rate becomes meaningful around ~10 windows scored. With a single week of
            briefings, treat the number as a curiosity, not a credential — the{" "}
            <Link href="/track-record" className="text-[var(--cyan-term)] hover:underline">
              full Track Record
            </Link>{" "}
            is the place to assess judgment over time.
          </p>
        </div>
      </Panel>
    </div>
  );
}
