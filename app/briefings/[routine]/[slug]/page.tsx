import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAllBriefings, getBriefing, getAllMarketsVerdicts } from "@/lib/data";
import { getSpxDailyCloses } from "@/lib/markets";
import { scoreVerdict, type ReturnWindow } from "@/lib/verdict-scoring";
import {
  cn,
  formatBriefingTitle,
  formatPct,
  verdictColor,
  formatRelativeTime,
} from "@/lib/utils";
import Panel from "@/components/panel";
import Tooltip from "@/components/tooltip";

export const revalidate = 300;

export async function generateStaticParams() {
  return getAllBriefings().map((b) => ({ routine: b.routine, slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ routine: string; slug: string }>;
}) {
  const { routine, slug } = await params;
  const briefing = getBriefing(routine, slug);
  if (!briefing) return { title: "Briefing not found" };
  return { title: formatBriefingTitle(briefing) };
}

function ScoreCell({
  label,
  tip,
  w,
  isRight,
}: {
  label: string;
  tip: string;
  w: ReturnWindow;
  isRight: boolean | null;
}) {
  const pct = w.pct;
  const cls =
    pct === null
      ? "text-[var(--dim)]"
      : pct > 0
        ? "text-[var(--up)]"
        : pct < 0
          ? "text-[var(--down)]"
          : "text-[var(--dim)]";
  const verdict =
    w.pending
      ? "pending"
      : isRight === null
        ? "informational"
        : isRight
          ? "right"
          : "wrong";
  const verdictCls =
    isRight === null
      ? "text-[var(--dim)]"
      : isRight
        ? "text-[var(--up)]"
        : "text-[var(--down)]";
  return (
    <div className="border border-[var(--border)] bg-black px-2 py-1.5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
        <Tooltip text={tip}>{label}</Tooltip>
      </div>
      <div className={`mt-0.5 font-mono text-[16px] ${cls}`}>
        {w.pending ? "—" : pct === null ? "—" : formatPct(pct)}
      </div>
      <div className={`font-mono text-[10px] uppercase tracking-widest ${verdictCls}`}>
        {verdict}
      </div>
    </div>
  );
}

const HORIZON_TIPS = {
  d1: "S&P 500 return 1 trading day after the verdict date — the fastest sanity check on whether the call was right.",
  d5: "S&P 500 return 5 trading days (~one calendar week) after the verdict. The 'did this week move the way the call implied' window.",
  d20: "S&P 500 return 20 trading days (~one calendar month) after the verdict. The horizon most short-term calls really play out over.",
};

export default async function BriefingPage({
  params,
}: {
  params: Promise<{ routine: string; slug: string }>;
}) {
  const { routine, slug } = await params;
  const briefing = getBriefing(routine, slug);
  if (!briefing) notFound();

  const verdictRef = briefing.verdict_ref;
  const verdict = verdictRef
    ? getAllMarketsVerdicts().find(
        (v) => `${v.routine}-${v.date}-${v.window}` === verdictRef,
      )
    : null;
  const color = verdict ? verdictColor(verdict.verdict.code) : null;

  // Only fetch SPX history if we have a verdict to score against.
  const spxSeries = verdict ? await getSpxDailyCloses(9) : [];
  const score = verdict ? scoreVerdict(verdict, spxSeries) : null;

  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/briefings"
        className="font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] hover:underline"
      >
        ◂ ALL BRIEFINGS
      </Link>

      <header className="space-y-2 border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
          <span>{routine}</span>
          <span>·</span>
          <span>
            {briefing.date} {briefing.window ?? ""}
          </span>
          {briefing.is_seed && (
            <>
              <span>·</span>
              <span className="border border-[var(--border)] px-1 text-[var(--dim)]">
                SEED
              </span>
            </>
          )}
        </div>
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          {formatBriefingTitle(briefing)}
        </h1>
        {verdict && color && (
          <div
            className={cn(
              "mt-2 inline-flex items-center gap-2 border px-2 py-1 font-mono text-[12px]",
              color.text,
              color.ring.replace("ring-", "border-"),
              color.bg,
            )}
          >
            <span>{verdict.verdict.emoji}</span>
            <span className="font-semibold uppercase tracking-wide">
              {verdict.verdict.label}
            </span>
            <span className="text-[10px] text-[var(--dim)]">
              · generated {formatRelativeTime(verdict.generated_at)}
            </span>
          </div>
        )}
      </header>

      <div className="briefing-body">
        <BriefingMarkdown source={briefing.body} />
      </div>

      {verdict && score && (
        <Panel
          code="SCORE"
          title="Was this call right?"
          learn="The verdict's directional record vs. SPX over the next 1, 5, and 20 trading days. Updates as time passes — windows show 'pending' until enough trading days have elapsed. Hold calls aren't directional so they show 'informational' rather than right/wrong."
        >
          <div className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-3">
            <ScoreCell label="+1d" tip={HORIZON_TIPS.d1} w={score.d1} isRight={score.right_d1} />
            <ScoreCell label="+5d" tip={HORIZON_TIPS.d5} w={score.d5} isRight={score.right_d5} />
            <ScoreCell
              label="+20d"
              tip={HORIZON_TIPS.d20}
              w={score.d20}
              isRight={score.right_d20}
            />
          </div>
          {score.base_close !== null && (
            <div className="border-t border-[var(--border)] px-2 py-1 font-mono text-[10px] text-[var(--dim)]">
              SPX base close {score.base_date} ·{" "}
              {score.base_close.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </div>
          )}
        </Panel>
      )}
    </article>
  );
}

function BriefingMarkdown({ source }: { source: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => (
          <h2 className="mt-6 mb-2 font-mono text-base font-semibold uppercase tracking-wider text-[var(--amber)]">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-4 mb-1.5 font-mono text-sm font-semibold tracking-wider text-[var(--amber-dim)]">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="my-2 leading-relaxed text-[var(--foreground)]">{children}</p>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            className="text-[var(--cyan-term)] underline underline-offset-4 hover:text-[var(--amber)]"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => (
          <ul className="my-2 list-disc space-y-1 pl-5 text-[var(--foreground)]">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 list-decimal space-y-1 pl-5 text-[var(--foreground)]">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-[var(--amber)]">{children}</strong>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-2 border-[var(--amber-dim)] pl-3 italic text-[var(--dim)]">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="border border-[var(--border)] bg-[var(--panel-head)] px-1 py-0.5 text-[12px] text-[var(--amber)]">
            {children}
          </code>
        ),
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto border border-[var(--border)]">
            <table className="w-full border-collapse font-mono text-[11px]">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1 text-left text-[10px] uppercase tracking-wider text-[var(--amber-dim)]">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-[var(--border)] px-2 py-1 text-[var(--foreground)]">
            {children}
          </td>
        ),
      }}
    >
      {source}
    </ReactMarkdown>
  );
}
