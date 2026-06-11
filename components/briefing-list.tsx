import Link from "next/link";
import type { BriefingMeta } from "@/lib/data";
import {
  formatBriefingTime,
  formatBriefingTitle,
  formatBriefingTitleShort,
} from "@/lib/utils";
import Panel from "./panel";

const ROUTINE_LABEL: Record<string, string> = {
  markets: "MKT",
  politics: "POL",
  quote: "QTE",
  "app-ideas": "APP",
  "pre-earnings": "ERN",
  "demand-signals": "DMD",
};

type Props = {
  items: BriefingMeta[];
  limit?: number;
  panel?: boolean;
};

export default function BriefingList({ items, limit, panel = true }: Props) {
  const list = limit ? items.slice(0, limit) : items;

  if (list.length === 0) {
    const empty = (
      <div className="p-3 text-center font-mono text-[11px] text-[var(--dim)]">
        No briefings yet. Generate one via Claude and commit to{" "}
        <code className="text-[var(--amber-dim)]">data/briefings/</code>.
      </div>
    );
    if (!panel) return empty;
    return (
      <Panel code="BRIEF" title="Recent Briefings">
        {empty}
      </Panel>
    );
  }

  const body = (
    <ul className="divide-y divide-[var(--border)]">
      {list.map((b) => {
        const fullTitle = formatBriefingTitle(b);
        const clock = formatBriefingTime(b.generated_at);
        return (
          <li key={`${b.routine}-${b.slug}`}>
            <Link
              href={`/briefings/${b.routine}/${b.slug}`}
              title={fullTitle}
              className="flex items-center gap-2 px-2 py-2.5 font-mono text-[11px] hover:bg-[var(--panel-head)] sm:py-1.5"
            >
              <span className="w-9 shrink-0 text-[var(--amber-dim)]">
                {ROUTINE_LABEL[b.routine] ?? b.routine.slice(0, 3).toUpperCase()}
              </span>
              <span className="flex-1 truncate text-[var(--foreground)] sm:hidden">
                {formatBriefingTitleShort(b)}
              </span>
              <span className="hidden flex-1 truncate text-[var(--foreground)] sm:inline">
                {fullTitle}
              </span>
              {clock && (
                <span className="shrink-0 text-[var(--dim)]" title={`Generated ${clock}`}>
                  {clock}
                </span>
              )}
              {b.is_seed && (
                <span className="shrink-0 border border-[var(--border)] px-1 text-[9px] uppercase tracking-widest text-[var(--dim)]">
                  SEED
                </span>
              )}
              <span className="shrink-0 text-[var(--cyan-term)]">▸</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  if (!panel) return body;
  return (
    <Panel
      code="BRIEF"
      title="Recent Briefings"
      learn="Archive of the most recent analyst write-ups. Each entry links to the full long-form briefing with citations, tables, and a mandatory bear case. Routine codes: MKT = markets, POL = politics, ERN = pre-earnings."
      meta={
        <Link href="/briefings" className="text-[var(--cyan-term)] hover:underline">
          ALL ▸
        </Link>
      }
    >
      {body}
    </Panel>
  );
}
