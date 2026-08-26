import { getThesis } from "@/lib/theses";
import ProseMarkdown from "@/components/prose-markdown";
import Panel from "@/components/panel";

export const metadata = {
  title: "Market History — Buy-Side Briefings",
  description:
    "What 180 years of tech booms and market crashes say about the AI era: run-ups, drawdowns, recoveries, who captured the value, and scenarios for what comes next.",
};

export const revalidate = 3600;

export default function MarketHistoryPage() {
  const thesis = getThesis("market-history");
  if (!thesis) {
    return (
      <div className="border border-[var(--border)] bg-[var(--panel)] p-6 text-center font-mono text-[11px] text-[var(--dim)]">
        Report not found.
      </div>
    );
  }
  const { meta, body } = thesis;

  return (
    <div className="mx-auto max-w-3xl space-y-1">
      <header className="space-y-1 px-1 pb-1">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          {meta.title}
        </h1>
        {meta.subtitle && (
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
            {meta.subtitle}
          </p>
        )}
        {meta.updated && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--dim)]">
            Standing report · last revised {meta.updated}
          </p>
        )}
      </header>

      {meta.summary && (
        <Panel title="Overview">
          <p className="p-2 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
            {meta.summary}
          </p>
        </Panel>
      )}

      <Panel title="What History Says">
        <article className="px-3 py-2">
          <ProseMarkdown>{body}</ProseMarkdown>
        </article>
      </Panel>
    </div>
  );
}
