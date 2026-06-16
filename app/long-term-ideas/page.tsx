import Link from "next/link";
import {
  getLatestLongTermIdeas,
  type IdeaCategory,
  type IdeaLean,
  type LongTermIdea,
} from "@/lib/long-term-ideas";
import { cn } from "@/lib/utils";
import Panel from "@/components/panel";

export const metadata = {
  title: "Long Term Ideas — Buy-Side Briefings",
  description:
    "Structural, multi-quarter to multi-year theses on NVIDIA, big tech, SpaceX, and crypto — a directional lean and the 'why' for each. For perspective, not advice.",
};

export const revalidate = 300;

const LEAN: Record<IdeaLean, { label: string; text: string; border: string; bg: string }> = {
  buy: { label: "ACCUMULATE", text: "text-[var(--up)]", border: "border-[var(--up)]", bg: "bg-[rgba(34,197,94,0.10)]" },
  sell: { label: "AVOID", text: "text-[var(--down)]", border: "border-[var(--down)]", bg: "bg-[rgba(239,68,68,0.10)]" },
  watch: { label: "WATCH", text: "text-[var(--amber)]", border: "border-[var(--amber)]", bg: "bg-[rgba(255,165,0,0.10)]" },
};

const CATEGORY_ORDER: { key: IdeaCategory; label: string }[] = [
  { key: "ai-semis", label: "AI & Semis" },
  { key: "big-tech", label: "Big Tech" },
  { key: "space", label: "Space" },
  { key: "crypto", label: "Crypto" },
];

function IdeaCard({ idea }: { idea: LongTermIdea }) {
  const lean = LEAN[idea.lean];
  return (
    <div className="border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[14px] font-bold text-[var(--foreground)]">
            {idea.ticker}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
            {idea.name}
          </span>
        </div>
        <span
          className={cn(
            "shrink-0 border px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-widest",
            lean.text,
            lean.border,
            lean.bg,
          )}
        >
          {lean.label}
        </span>
      </div>

      <div className="mt-1 flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
        <span className="text-[var(--amber-dim)]">{idea.conviction} conv</span>
        <span>·</span>
        <span>{idea.timeframe}</span>
      </div>

      <p className="mt-1.5 font-mono text-[12px] leading-snug text-[var(--foreground)]">
        {idea.idea}
      </p>
      <p className="mt-1 font-mono text-[11px] leading-relaxed text-[var(--dim)]">{idea.why}</p>

      {(idea.driver || idea.risk) && (
        <div className="mt-2 space-y-0.5 border-t border-[var(--border)] pt-1.5 font-mono text-[10px] leading-relaxed">
          {idea.driver && (
            <div>
              <span className="uppercase tracking-widest text-[var(--cyan-term)]">Driver </span>
              <span className="text-[var(--dim)]">{idea.driver}</span>
            </div>
          )}
          {idea.risk && (
            <div>
              <span className="uppercase tracking-widest text-[var(--down)]">Risk </span>
              <span className="text-[var(--dim)]">{idea.risk}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LongTermIdeasPage() {
  const set = getLatestLongTermIdeas();

  if (!set) {
    return (
      <div className="border border-[var(--border)] bg-[var(--panel)] p-6 text-center font-mono text-[11px] text-[var(--dim)]">
        No long-term ideas posted yet.
      </div>
    );
  }

  const groups = CATEGORY_ORDER.map((c) => ({
    ...c,
    ideas: set.ideas.filter((i) => i.category === c.key),
  })).filter((g) => g.ideas.length > 0);

  return (
    <div className="space-y-1">
      <header className="space-y-1 px-1 pb-1">
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] hover:underline"
        >
          ◂ DASHBOARD
        </Link>
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Long Term Ideas
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          Structural theses · quarters to years · posted {set.date}
          {set.is_seed ? " · seed" : ""}
        </p>
      </header>

      <Panel code="THESIS" title="The structural backdrop">
        <p className="p-2 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          {set.intro}
        </p>
      </Panel>

      {groups.map((g) => (
        <div key={g.key} className="space-y-1">
          <div className="flex items-center gap-2 px-0.5 pt-3 pb-0.5">
            <span className="h-1.5 w-1.5 shrink-0 bg-[var(--amber)]" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber)]">
              {g.label}
            </span>
            <span className="ml-1 h-px flex-1 bg-[var(--border-strong)]" />
          </div>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {g.ideas.map((idea) => (
              <IdeaCard key={idea.ticker} idea={idea} />
            ))}
          </div>
        </div>
      ))}

      <p className="px-1 pt-3 font-mono text-[10px] leading-snug text-[var(--dim)]">
        Multi-quarter to multi-year perspectives — meant to frame the structural case for
        holding (or avoiding) a name over the long run, not sized recommendations. For the
        next-session view, see{" "}
        <Link href="/short-term-ideas" className="text-[var(--cyan-term)] hover:underline">
          Short Term Ideas
        </Link>
        . Not investment advice.
      </p>
    </div>
  );
}
