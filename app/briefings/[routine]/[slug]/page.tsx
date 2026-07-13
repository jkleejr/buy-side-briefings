import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAllBriefings, getBriefing, getVerdictByRef } from "@/lib/data";
import { getSpxDailyCloses } from "@/lib/markets";
import { scoreVerdict, type ReturnWindow } from "@/lib/verdict-scoring";
import {
  formatBriefingTitle,
  formatPct,
  formatRelativeTime,
} from "@/lib/utils";
import Panel from "@/components/panel";
import type { RegimeIndicator } from "@/lib/data";

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
  w,
  isRight,
}: {
  label: string;
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
    <div className="border border-[var(--border)] bg-[var(--background)] px-2 py-1.5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
        {label}
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

export default async function BriefingPage({
  params,
}: {
  params: Promise<{ routine: string; slug: string }>;
}) {
  const { routine, slug } = await params;
  const briefing = getBriefing(routine, slug);
  if (!briefing) notFound();

  const verdictRef = briefing.verdict_ref;
  const verdict = verdictRef ? getVerdictByRef(verdictRef) : null;

  // SPX scoring only applies to the markets routine; crypto verdicts carry a
  // crypto snapshot and aren't graded against the S&P 500.
  const scorable = verdict && verdict.routine === "markets" ? verdict : null;
  const spxSeries = scorable ? await getSpxDailyCloses(9) : [];
  const score = scorable ? scoreVerdict(scorable, spxSeries) : null;

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
        <h1 className="font-serif text-[27px] font-semibold leading-[1.15] tracking-[-0.01em] text-[var(--foreground)] sm:text-[31px]">
          {formatBriefingTitle(briefing)}
        </h1>
      </header>

      {verdict && <VerdictHead verdict={verdict} />}

      <div className="briefing-body">
        <BriefingMarkdown source={briefing.body} />
      </div>

      {verdict && score && (
        <Panel
          code="SCORE"
          title="Was this call right?"
        >
          <div className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-3">
            <ScoreCell label="+1d" w={score.d1} isRight={score.right_d1} />
            <ScoreCell label="+5d" w={score.d5} isRight={score.right_d5} />
            <ScoreCell
              label="+20d"
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

// ---------------------------------------------------------------------------
// Verdict head — the "split verdict": a short stance, a plain-English
// standfirst, and the regime levels as scannable chips. Replaces the old
// run-on all-caps label (which also printed twice).
// ---------------------------------------------------------------------------

const STANCE: Record<string, { label: string; bg: string }> = {
  buy: { label: "Buy", bg: "#2f7d4f" },
  hold: { label: "Hold", bg: "#b8842a" },
  step_aside: { label: "Step aside", bg: "#b06a1e" },
  aside: { label: "Step aside", bg: "#b06a1e" },
  bearish: { label: "Bearish", bg: "#b0392f" },
};

/** First sentence of a longer rationale, for a standfirst fallback. */
function firstSentence(text: string | undefined): string {
  if (!text) return "";
  const clean = text.replace(/^\([0-9]+\)\s*/, "").replace(/^★+\s*/, "").trim();
  const m = clean.match(/^.*?[.!?](?=\s|$)/);
  return (m ? m[0] : clean).trim();
}

/** Shorten a regime indicator's name to a chip label: "SPX vs 7,460 …" → "SPX". */
function chipName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, "")
    .split(/\s+(?:vs|Gate|Yield|dual|floor)/i)[0]
    .trim();
}

function chipValue(value: number, unit?: string): string {
  if (unit === "%") return `${value}%`;
  if (unit === "$")
    return value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value}`;
  return value >= 1000 ? value.toLocaleString("en-US") : String(value);
}

function RegimeChips({ regime }: { regime?: RegimeIndicator[] }) {
  const rows = (regime ?? []).slice(0, 6);
  if (!rows.length) return null;
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {rows.map((r, i) => {
        const breached =
          (r.trigger_above != null && r.value >= r.trigger_above) ||
          (r.trigger_below != null && r.value <= r.trigger_below);
        const gate =
          r.trigger_above != null
            ? `≥ ${chipValue(r.trigger_above, r.unit)}`
            : r.trigger_below != null
              ? `≤ ${chipValue(r.trigger_below, r.unit)}`
              : null;
        return (
          <span
            key={i}
            className="inline-flex items-baseline gap-2 rounded-sm border border-[var(--border-strong)] bg-[var(--panel)] px-2.5 py-1.5 font-mono text-[11.5px] tabular-nums"
          >
            <span className="text-[9.5px] uppercase tracking-[0.1em] text-[var(--faint)]">
              {chipName(r.name)}
            </span>
            <span
              className="font-semibold"
              style={{ color: breached ? "var(--down)" : "var(--foreground)" }}
            >
              {chipValue(r.value, r.unit)}
            </span>
            {gate && <span className="text-[var(--faint)]">{gate}</span>}
          </span>
        );
      })}
    </div>
  );
}

function VerdictHead({
  verdict,
}: {
  verdict: {
    verdict: {
      code: string;
      conviction: string;
      rationale_short: string;
      headline?: string;
    };
    regime_risk?: RegimeIndicator[];
    generated_at: string;
  };
}) {
  const stance = STANCE[verdict.verdict.code] ?? { label: verdict.verdict.code, bg: "#6d6a62" };
  const standfirst =
    verdict.verdict.headline?.trim() || firstSentence(verdict.verdict.rationale_short);
  return (
    <section className="border-b border-[var(--border)] pb-5">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="rounded-sm px-2.5 py-1 font-mono text-[12px] font-bold uppercase tracking-[0.08em] text-white"
          style={{ background: stance.bg }}
        >
          {stance.label}
        </span>
        <span className="font-mono text-[12px] capitalize text-[var(--dim)]">
          {verdict.verdict.conviction} conviction
        </span>
        <span className="ml-auto font-mono text-[11px] text-[var(--faint)]">
          generated {formatRelativeTime(verdict.generated_at)}
        </span>
      </div>
      {standfirst && (
        <p className="mt-4 max-w-[54ch] text-[19px] italic leading-[1.5] text-[var(--ink-3)]">
          {standfirst}
        </p>
      )}
      <RegimeChips regime={verdict.regime_risk} />
    </section>
  );
}
