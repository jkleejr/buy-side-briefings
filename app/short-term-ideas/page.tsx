import Link from "next/link";
import {
  getLatestShortTermIdeas,
  type IdeaCategory,
  type IdeaLean,
  type ShortTermIdea,
} from "@/lib/short-term-ideas";
import { cn } from "@/lib/utils";
import Panel from "@/components/panel";

export const metadata = {
  title: "Short Term Ideas — Buy-Side Briefings",
  description:
    "Quick, next-session trade perspectives on NVIDIA, big tech, SpaceX, and crypto — a directional lean and a short 'why' for each. For perspective, not advice.",
};

export const revalidate = 300;

const LEAN: Record<IdeaLean, { label: string; text: string; border: string; bg: string }> = {
  buy: { label: "BUY", text: "text-[var(--up)]", border: "border-[var(--up)]", bg: "bg-[rgba(34,197,94,0.10)]" },
  sell: { label: "SELL", text: "text-[var(--down)]", border: "border-[var(--down)]", bg: "bg-[rgba(239,68,68,0.10)]" },
  watch: { label: "WATCH", text: "text-[var(--amber)]", border: "border-[var(--amber)]", bg: "bg-[rgba(255,165,0,0.10)]" },
};

const CATEGORY_ORDER: { key: IdeaCategory; label: string }[] = [
  { key: "ai-semis", label: "AI & Semis" },
  { key: "big-tech", label: "Big Tech" },
  { key: "space", label: "Space" },
  { key: "crypto", label: "Crypto" },
];

function IdeaCard({ idea }: { idea: ShortTermIdea }) {
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

      {(idea.trigger || idea.risk) && (
        <div className="mt-2 space-y-0.5 border-t border-[var(--border)] pt-1.5 font-mono text-[10px] leading-relaxed">
          {idea.trigger && (
            <div>
              <span className="uppercase tracking-widest text-[var(--cyan-term)]">Trigger </span>
              <span className="text-[var(--dim)]">{idea.trigger}</span>
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

export default function ShortTermIdeasPage() {
  const set = getLatestShortTermIdeas();

  if (!set) {
    return (
      <div className="border border-[var(--border)] bg-[var(--panel)] p-6 text-center font-mono text-[11px] text-[var(--dim)]">
        No short-term ideas posted yet.
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
          Short Term Ideas
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          For the {set.for_session} session · posted {set.date}
          {set.is_seed ? " · seed" : ""}
        </p>
      </header>

      <Panel code="SETUP" title="The setup into next session">
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
        These are quick directional perspectives for the next market day — meant to surface
        ideas and the reasoning behind a buy or sell, not sized recommendations. The journaled,
        risk-managed setups live in{" "}
        <Link href="/opportunities" className="text-[var(--cyan-term)] hover:underline">
          Opportunities
        </Link>
        . Not investment advice.
      </p>
    </div>
  );
}
