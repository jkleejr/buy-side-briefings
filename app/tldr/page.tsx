import { getAllMarketsVerdicts } from "@/lib/data";
import TldrCard from "@/components/tldr-card";

export const metadata = {
  title: "TL;DR — Buy-Side Briefings",
  description:
    "Short-form one-page summaries of every market briefing. Verdict, conviction, key snapshot, and a one-paragraph rationale — without the long-form depth.",
};

export default function TldrPage() {
  const verdicts = getAllMarketsVerdicts();

  return (
    <div className="space-y-3">
      <header className="space-y-1 px-1 pb-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          TL;DR feed
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          Short-form briefings · verdict + key levels + one-paragraph thesis
        </p>
        <p className="font-mono text-[11px] leading-relaxed text-[var(--dim)]">
          Every market briefing condensed to its essentials: the call, the conviction, the four
          numbers that matter, and a single paragraph explaining why. Click <span className="text-[var(--cyan-term)]">FULL ▸</span>{" "}
          on any card for the long-form analysis with citations, trade setups, and bear case.
        </p>
      </header>

      {verdicts.length === 0 ? (
        <div className="border border-[var(--border)] bg-[var(--panel)] p-6 text-center font-mono text-[11px] text-[var(--dim)]">
          No briefings yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {verdicts.map((v) => (
            <TldrCard key={`${v.date}-${v.window}`} verdict={v} />
          ))}
        </div>
      )}
    </div>
  );
}
