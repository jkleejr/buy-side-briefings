import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getAllBriefings,
  getBriefing,
  getVerdictByRef,
} from "@/lib/data";
import {
  formatBriefingDateLine,
  formatBriefingTime,
  formatDateShort,
  readMinutes,
} from "@/lib/utils";
import type { SupportingPoint } from "@/lib/data";

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
  if (!briefing) return { title: "Report not found" };
  return { title: formatBriefingDateLine(briefing) };
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

  const points = verdict?.verdict.supporting_data ?? [];
  const fullReadMin = readMinutes(briefing.body);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-14 pt-6 sm:px-6 sm:pt-[39px]">
      <article className="max-w-3xl space-y-4">
      <Link
        href="/briefings"
        className="block w-fit font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] hover:underline"
      >
        ◂ ALL REPORTS
      </Link>

      <header className="space-y-2 border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--amber)]">
          <span>{formatDateShort(briefing.date)}</span>
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
          {formatBriefingDateLine(briefing)}
        </h1>
      </header>

      {verdict ? (
        <div className="space-y-7 pt-2">
          {/* The glance and evidence tiers are unlabelled. Their headings were
              read-times and nothing else — "30 seconds", "1 min · the
              evidence" — and a reader scanning a briefing does not need to be
              told that the top of it is short. Only the full read keeps an
              estimate, because that is the one worth deciding whether to start.
              The homepage still shows a read-time on the link in. */}
          <Tier accent>
            <VerdictHead verdict={verdict} bullets={glanceBullets(points)} />
          </Tier>

          {points.length > 0 && (
            <Tier>
              <Evidence points={points} />
            </Tier>
          )}

          <Tier label={`The full read · ${fullReadMin} min`}>
            <FullRead body={briefing.body} />
          </Tier>
        </div>
      ) : (
        <div className="briefing-body">
          <BriefingMarkdown source={briefing.body} />
        </div>
      )}

      </article>
    </div>
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
// Progressive disclosure — the briefing is tiered by how much time the reader
// has: a 30-second top (stance + three glanceable bullets + regime chips), the
// sourced evidence a scroll below, and the full read last (collapsed by
// default on mobile). Same words, ordered by reader time.
// ---------------------------------------------------------------------------

function Tier({
  label,
  accent,
  children,
}: {
  /** Omitted on the glance tier, which is the first thing under the title and
   *  needs no naming — the coloured rule already marks it. */
  label?: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`border-l-2 pl-4 sm:pl-5 ${
        accent ? "border-[var(--cyan-term)]" : "border-[var(--border-strong)]"
      }`}
    >
      {label && (
        <div
          className={`font-mono text-[10.5px] uppercase tracking-[0.16em] ${
            accent ? "text-[var(--cyan-term)]" : "text-[var(--faint)]"
          }`}
        >
          {label}
        </div>
      )}
      {children}
    </section>
  );
}

/** First sentence of a longer rationale, for a headline fallback. */
function firstSentence(text: string | undefined): string {
  if (!text) return "";
  const clean = text.replace(/^\([0-9]+\)\s*/, "").replace(/^★+\s*/, "").trim();
  const m = clean.match(/^.*?[.!?](?=\s|$)/);
  return (m ? m[0] : clean).trim();
}

function clampText(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  const cut = t.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, lastSpace > 0 ? lastSpace : maxChars).trim() + "…";
}

/** Strip the analyst's priority marks (★★ / ★ / ⚠) off a point label. */
function stripMarks(label: string): string {
  return label.replace(/^[★⚠️\s]+/u, "").trim();
}

function starRank(label: string): number {
  if (label.startsWith("★★")) return 2;
  if (label.startsWith("★")) return 1;
  return 0;
}

/**
 * The three bullets anyone can read at a glance: the highest-priority points,
 * cut to their first clause. The full sourced versions live one tier below.
 */
function glanceBullets(points: SupportingPoint[]): string[] {
  return [...points]
    .sort((a, b) => starRank(b.label) - starRank(a.label))
    .slice(0, 3)
    .map((p) => {
      const clean = stripMarks(p.label);
      let cut = clean.length;
      for (const sep of [";", ". "]) {
        const i = clean.indexOf(sep, 30);
        if (i > 0 && i < cut) cut = i;
      }
      return clampText(clean.slice(0, cut), 190);
    });
}

function VerdictHead({
  verdict,
  bullets,
}: {
  verdict: {
    verdict: {
      rationale_short: string;
      headline?: string;
    };
    generated_at: string;
  };
  bullets: string[];
}) {
  const headline =
    verdict.verdict.headline?.trim() || firstSentence(verdict.verdict.rationale_short);
  return (
    <div className="pt-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] text-[var(--amber)]">
          generated {formatBriefingTime(verdict.generated_at) ?? "—"}
        </span>
      </div>
      {headline && (
        <p className="mt-3 max-w-[40ch] text-[21px] font-semibold leading-[1.3] tracking-[-0.005em] text-[var(--foreground)] [text-wrap:balance]">
          {headline}
        </p>
      )}
      {bullets.length > 0 && (
        <ul className="mt-3 max-w-[62ch] list-disc space-y-1.5 pl-5">
          {bullets.map((b, i) => (
            <li key={i} className="text-[15.5px] leading-[1.5] text-[var(--ink-2)]">
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The evidence — every sourced point, bold lead + link. First three visible,
// the rest behind a native <details> expander.
// ---------------------------------------------------------------------------

function sourceLabel(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parts = new URL(url).hostname.replace(/^www\./, "").split(".");
    const name = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    return name.toUpperCase().slice(0, 10);
  } catch {
    return null;
  }
}

/** Split "June CPI preview (BLS...): consensus …" into a bold lead + the rest. */
function splitLead(label: string): { lead: string | null; rest: string } {
  const clean = stripMarks(label);
  const m = clean.match(/^(.{3,60}?)(?::\s+|\s+—\s+)/);
  if (m) return { lead: m[1], rest: clean.slice(m[0].length) };
  return { lead: null, rest: clean };
}

function EvidenceRow({ point }: { point: SupportingPoint }) {
  const { lead, rest } = splitLead(point.label);
  const src = sourceLabel(point.url);
  return (
    <div className="text-[15px] leading-[1.55] text-[var(--ink-3)]">
      {lead && (
        <b className="font-semibold text-[var(--foreground)]">{lead}</b>
      )}
      {lead ? " — " : ""}
      {rest}{" "}
      {point.url && src && (
        <a
          href={point.url}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap font-mono text-[11px] tracking-[0.06em] text-[var(--amber)] hover:underline"
        >
          {src} →
        </a>
      )}
    </div>
  );
}

function Evidence({ points }: { points: SupportingPoint[] }) {
  const shown = points.slice(0, 3);
  const more = points.slice(3);
  return (
    <div className="mt-3 space-y-3.5">
      {shown.map((p, i) => (
        <EvidenceRow key={i} point={p} />
      ))}
      {more.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none font-mono text-[12px] italic text-[var(--faint)] hover:text-[var(--dim)]">
            <span className="group-open:hidden">
              + {more.length} more sourced point{more.length > 1 ? "s" : ""} ▾
            </span>
            <span className="hidden group-open:inline">
              − show fewer ▴
            </span>
          </summary>
          <div className="mt-3.5 space-y-3.5">
            {more.map((p, i) => (
              <EvidenceRow key={i} point={p} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The full read — everything the model wrote, on every screen. This used to sit
// behind a "tap to expand" toggle on mobile, which meant tapping into a
// briefing and then tapping again to actually read it: two taps for the one
// thing the page exists to show. The tier label above it already carries the
// read-time, so the length is disclosed without hiding the text.
// ---------------------------------------------------------------------------

function FullRead({ body }: { body: string }) {
  return (
    <div className="briefing-body">
      <BriefingMarkdown source={body} />
    </div>
  );
}

