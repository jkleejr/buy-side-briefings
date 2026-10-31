import { notFound } from "next/navigation";
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
  windowLabel,
} from "@/lib/utils";
import type { SupportingPoint } from "@/lib/data";
import ReportBackLink from "@/components/report-back-link";

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
  // The tab says which edition it is, not which day. The archive is what keeps
  // the record of dates; a tab full of "Sunday, September 6, 2026 - Night" is
  // unreadable at tab width, and every open report looked alike.
  return {
    title: briefing.window ? `${windowLabel(briefing.window)} Report` : "Report",
  };
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

  // The title is the report's own headline — what the session was about — not
  // the date it carries. The date and window stay in the eyebrow above it, so
  // nothing is lost. Falls back to the date line for the rare report with no
  // verdict attached (nothing to take a headline from).
  // Widened the same way VerdictHead types it: `headline` is optional because
  // not every routine's verdict carries one (kospi doesn't).
  const head: { rationale_short: string; headline?: string } | undefined =
    verdict?.verdict;
  // An authored frontmatter title is the next-best headline for the handful of
  // one-off briefs whose verdict_ref doesn't resolve (it keys on
  // routine-date-window, which a special slug like "-nvda-pre-earnings" never
  // matches). getAllBriefings() synthesizes "<routine> <slug>" when there is no
  // real title, so only use it when it is something a person actually wrote.
  const authoredTitle =
    briefing.title && briefing.title !== `${briefing.routine} ${briefing.slug}`
      ? briefing.title.trim()
      : "";
  // The full read's own opening heading is the page title, and it comes out
  // of the body so it is not printed twice. The verdict headline is the one
  // the homepage shows; repeating it here put the same sentence in front of a
  // reader who had just clicked it, with the report's real headline buried
  // under "The full read". The verdict headline stays as the fallback for a
  // body that opens without a heading.
  const lead = leadHeading(briefing.body);
  const headline =
    lead.title ||
    (head ? head.headline?.trim() || firstSentence(head.rationale_short) : authoredTitle);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-14 pt-6 sm:px-6 sm:pt-[39px]">
      {/* The reading measure is narrower than the shell the rest of the site
          uses, so it needs its own centring: a bare max-w-3xl inside a
          max-w-5xl parent has no auto margins and pins the column to the left
          edge, which on a wide screen reads as a layout fault rather than as a
          measure — the text and the rules beside it sat left with a third of
          the page empty to their right. */}
      <article className="mx-auto max-w-3xl space-y-4">
      <ReportBackLink />

      <header className="space-y-2">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--lapis)]">
          <span>{formatDateShort(briefing.date)}</span>
          {briefing.window && (
            <>
              <span>-</span>
              {/* normal-case overrides the row's uppercase: the window reads as
                  a word ("Night"), while the SEED chip beside it stays a chip. */}
              <span className="normal-case">{windowLabel(briefing.window)}</span>
            </>
          )}
          {briefing.is_seed && (
            <>
              <span>·</span>
              <span className="border border-[var(--border)] px-1 text-[var(--dim)]">
                SEED
              </span>
            </>
          )}
        </div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--faint)]">
          The full read ~ {fullReadMin} min
        </div>
        <h1 className="font-serif text-[27px] font-semibold leading-[1.15] tracking-[-0.01em] text-[var(--foreground)] sm:text-[31px]">
          {headline || formatBriefingDateLine(briefing)}
        </h1>
      </header>

      {verdict ? (
        <div className="space-y-7 pt-1">
          {/* pt-1 on this container nudges the whole glance block — rule,
              timestamp and bullets together — a few pixels clear of the
              headline. Padding here rather than a margin on the tier, so the
              accent rule moves with the text it marks instead of staying put. */}
          {/* The glance and evidence tiers are unlabelled. Their headings were
              read-times and nothing else — "30 seconds", "1 min · the
              evidence" — and a reader scanning a briefing does not need to be
              told that the top of it is short. Only the full read keeps an
              estimate, because that is the one worth deciding whether to start.
              The homepage still shows a read-time on the link in. */}
          <Tier accent>
            <VerdictHead verdict={verdict} bullets={glanceBullets(points)} />
          </Tier>

          <Tier>
            <FullRead body={lead.body} />
          </Tier>
        </div>
      ) : (
        <div className="briefing-body">
          <BriefingMarkdown source={lead.body} />
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
          <h2 className="mt-6 mb-2 font-mono text-base font-semibold uppercase tracking-wider text-[var(--lapis)]">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-4 mb-1.5 font-mono text-sm font-semibold tracking-wider text-[var(--lapis-dim)]">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="my-2 leading-relaxed text-[var(--foreground)]">{children}</p>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            className="text-[var(--foreground)] underline underline-offset-4 hover:text-[var(--lapis)]"
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
          <strong className="font-semibold text-[var(--lapis)]">{children}</strong>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-2 border-[var(--lapis-dim)] pl-3 italic text-[var(--dim)]">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="border border-[var(--border)] bg-[var(--panel-head)] px-1 py-0.5 text-[12px] text-[var(--lapis)]">
            {children}
          </code>
        ),
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto border border-[var(--border)]">
            <table className="w-full border-collapse font-mono text-[11px]">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1 text-left text-[10px] uppercase tracking-wider text-[var(--lapis-dim)]">
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
    // Only the glance tier carries a rule. The other two had one in the same
    // place and weight, so instead of marking "this is the tier that matters"
    // the device just striped the whole page — three rules down one edge read
    // as a frame, not as emphasis. The indent stays on all three so the
    // columns still line up under each other.
    <section className={accent ? "border-l-2 border-[var(--lapis)] pl-4 sm:pl-5" : "pl-4 sm:pl-5"}>
      {label && (
        <div
          className={`font-mono text-[10.5px] uppercase tracking-[0.16em] ${
            accent ? "text-[var(--cyan)]" : "text-[var(--faint)]"
          }`}
        >
          {label}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * The body's first heading as plain text, and the body without it. Reports
 * open with a methodology note and then the `## <summary>` heading; anything
 * before the heading stays in the body.
 */
function leadHeading(body: string): { title: string; body: string } {
  const m = body.match(/^#{1,6}[ \t]+(.+?)[ \t#]*$/m);
  if (!m || m.index === undefined) return { title: "", body };
  const title = m[1]
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
  return { title, body: body.slice(0, m.index) + body.slice(m.index + m[0].length) };
}

/** First sentence of a longer rationale, for a headline fallback. */
function firstSentence(text: string | undefined): string {
  if (!text) return "";
  const clean = text.replace(/^\([0-9]+\)\s*/, "").replace(/^★+\s*/, "").trim();
  const m = clean.match(/^.*?[.!?](?=\s|$)/);
  return (m ? m[0] : clean).trim();
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
 * The bullets: every sourced point, highest priority first, each ending in a
 * link to its source. There used to be a second, grey "sourced points" tier
 * under these that repeated the same sentences with the links attached; the
 * points are one sentence each, so the two tiers said everything twice. With
 * the links on the bullets that tier is gone, and the bullets carry every
 * point rather than the top five so nothing went with it.
 */
function glanceBullets(points: SupportingPoint[]): { text: string; url?: string }[] {
  return [...points]
    .sort((a, b) => starRank(b.label) - starRank(a.label))
    .map((p) => ({ text: stripMarks(p.label), url: p.url }));
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
  bullets: { text: string; url?: string }[];
}) {
  return (
    // pt-1 rather than pt-2: the accent rule is drawn on the section around
    // this, so the padding above the text is also the length of rule standing
    // above it. Halving it drops the top of the rule closer to the line it
    // marks without moving the text.
    <div className="pt-1">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] text-[var(--lapis)]">
          generated {formatBriefingTime(verdict.generated_at) ?? "—"}
        </span>
      </div>
      {bullets.length > 0 && (
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          {bullets.map((b, i) => {
            const src = sourceLabel(b.url);
            return (
              <li key={i} className="text-[15.5px] leading-[1.5] text-[var(--foreground)]">
                {b.text}
                {b.url && src && (
                  <>
                    {" "}
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="whitespace-nowrap font-mono text-[11px] tracking-[0.06em] text-[var(--lapis)] hover:underline"
                    >
                      {src} →
                    </a>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** The source's site name, for the link at the end of a bullet: INVESTING, CNN. */
function sourceLabel(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parts = new URL(url).hostname.replace(/^www\./, "").split(".");
    // Step past a country domain's second level (koreatimes.co.kr, bbc.co.uk),
    // which otherwise came out as "CO". No length cap: a 10-character clamp
    // printed actionforex.com as "ACTIONFORE".
    let i = parts.length - 2;
    if (i > 0 && parts[parts.length - 1].length === 2 && /^(co|com|ac|or|org|net|gov|ne)$/.test(parts[i])) i--;
    return (parts[Math.max(i, 0)] ?? "").toUpperCase() || null;
  } catch {
    return null;
  }
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

