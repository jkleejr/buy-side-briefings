import Link from "next/link";
import { getThesis } from "@/lib/theses";
import ProseMarkdown from "@/components/prose-markdown";
import Panel from "@/components/panel";

export const metadata = {
  title: "Books — Buy-Side Briefings",
  description:
    "Investing books read closely, fact-checked against their critics, and applied to the current tape. One standing report per book.",
};

export const revalidate = 3600;

type BookEntry = {
  /** Slug of the thesis file backing this report, for title/date/summary. */
  slug: string;
  book: string;
  author: string;
  published: string;
  /** Why this book earns a standing report. */
  note: string;
};

const BOOKS: BookEntry[] = [
  {
    slug: "black-swan",
    book: "The Black Swan",
    author: "Nassim Nicholas Taleb",
    published: "2007 · 2nd ed. 2010",
    note: "The framework for rare, high-impact events — what it actually says, what its critics say back, and how this year's shocks grade against it.",
  },
];

export default function BooksPage() {
  const entries = BOOKS.map((b) => ({ ...b, thesis: getThesis(b.slug) })).filter(
    (b) => b.thesis !== null,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-1">
      <header className="space-y-1 px-1 pb-2">
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] hover:underline"
        >
          ◂ DASHBOARD
        </Link>
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Books
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          Read closely · fact-checked against the critics · applied to the tape
        </p>
      </header>

      {/* The reports read here rather than behind a link. Each book used to
          own a route, which made this page a table of contents that existed
          only to send you one click further for the thing you came for — and
          with a single book on the shelf, a contents page for one chapter. */}
      {entries.map((entry) => {
        const { meta, body } = entry.thesis!;
        return (
          <section key={entry.slug} className="space-y-1">
            <div className="px-1 pt-3">
              <h2 className="font-mono text-[15px] font-semibold tracking-tight text-[var(--amber)]">
                {entry.book}
              </h2>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-[var(--dim)]">
                {entry.author} · {entry.published}
              </p>
              <p className="mt-2 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
                {entry.note}
              </p>
            </div>

            {meta.summary && (
              <Panel code="TL;DR" title="The short version">
                <p className="p-2 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
                  {meta.summary}
                </p>
              </Panel>
            )}

            <Panel
              code="REPORT"
              title={
                meta.updated
                  ? `${meta.title} · revised ${meta.updated}`
                  : meta.title
              }
            >
              <article className="px-3 py-2">
                <ProseMarkdown>{body}</ProseMarkdown>
              </article>
            </Panel>
          </section>
        );
      })}

      <p className="px-1 pt-2 font-mono text-[10px] leading-snug text-[var(--dim)]">
        Each report is a standing document, revised when the evidence moves — not a dated call.
        Related standing research:{" "}
        <Link href="/ai-bubble" className="text-[var(--cyan-term)] hover:underline">
          The AI Bubble Question
        </Link>{" "}
        and{" "}
        <Link href="/market-history" className="text-[var(--cyan-term)] hover:underline">
          Market History
        </Link>
        . Educational only — not investment advice.
      </p>
    </div>
  );
}
