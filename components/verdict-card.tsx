import Link from "next/link";
import type { MarketsVerdict } from "@/lib/data";
import {
  cn,
  formatRelativeTime,
  getVerdictExplanation,
  verdictColor,
  verdictHorizon,
} from "@/lib/utils";
import Panel from "./panel";
import Tooltip from "./tooltip";

export default function VerdictCard({ verdict }: { verdict: MarketsVerdict }) {
  const color = verdictColor(verdict.verdict.code);
  const briefingHref = `/briefings/${verdict.routine}/${verdict.date}-${verdict.window}`;

  return (
    <Panel
      code="VRDCT"
      title="Latest Buy Verdict"
      learn="The headline call — buy / hold / step aside / bearish — with conviction, a one-line rationale, and 4–6 cited supporting points. Hand-written by the analyst (not algorithmic) and time-stamped so the call can be audited later."
      meta={
        <span>
          {verdict.date} {verdict.window} · {formatRelativeTime(verdict.generated_at)}
        </span>
      }
    >
      <div className="flex h-full flex-col p-2">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center border text-2xl",
              color.bg,
              color.ring.replace("ring-", "border-"),
            )}
          >
            {verdict.verdict.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className={cn("font-mono text-base font-bold uppercase tracking-wide", color.text)}>
              <Tooltip text={getVerdictExplanation(verdict.verdict.code)}>
                {verdict.verdict.label}
              </Tooltip>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10px] uppercase tracking-widest text-[var(--dim)]">
              <span>
                Conviction:{" "}
                <span className="text-[var(--foreground)]">
                  {verdict.verdict.conviction.toUpperCase()}
                </span>
              </span>
              <span>
                <Tooltip text="How long this call is meant to hold. Markets verdicts are tactical (days to a couple of weeks) and are scored at +1d / +5d / +20d on the Track Record page.">
                  Horizon
                </Tooltip>
                :{" "}
                <span className="text-[var(--foreground)]">
                  {verdictHorizon(verdict.verdict.horizon)}
                </span>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-[var(--foreground)]">
              {verdict.verdict.rationale_short}
            </p>
          </div>
        </div>

        <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {verdict.verdict.supporting_data.slice(0, 6).map((d, i) => (
            <li
              key={i}
              className="border border-[var(--border)] bg-black px-1.5 py-1 font-mono text-[10px] text-[var(--foreground)]"
            >
              <span className="mr-1 text-[var(--amber-dim)]">›</span>
              {d.url ? (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--amber)] hover:underline"
                >
                  {d.label}
                </a>
              ) : (
                d.label
              )}
            </li>
          ))}
        </ul>

        <Link
          href={briefingHref}
          className="mt-auto pt-2 font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] hover:underline"
        >
          ▸ Full briefing
        </Link>
      </div>
    </Panel>
  );
}
