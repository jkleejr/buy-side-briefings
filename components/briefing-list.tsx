import Link from "next/link";
import type { BriefingMeta } from "@/lib/data";
import {
  formatBriefingDateLine,
  formatBriefingTime,
  formatBriefingTitleShort,
} from "@/lib/utils";
import Panel from "./panel";

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
      <Panel title="Recent Briefings">
        {empty}
      </Panel>
    );
  }

  const body = (
    <ul className="divide-y divide-[var(--border)]">
      {list.map((b) => {
        const dateLine = formatBriefingDateLine(b);
        const clock = formatBriefingTime(b.generated_at);
        return (
          <li key={`${b.routine}-${b.slug}`}>
            <Link
              href={`/briefings/${b.routine}/${b.slug}`}
              title={dateLine}
              className="flex items-center gap-2 px-2 py-2.5 font-mono text-[11px] hover:bg-[var(--panel-head)] sm:py-1.5"
            >
              {/* Date line, then what the briefing is actually about. The
                  headline is the point of the row — the date only says when. */}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                <span className="truncate text-[var(--foreground)] sm:hidden">
                  {formatBriefingTitleShort(b)}
                </span>
                <span className="hidden shrink-0 text-[var(--foreground)] sm:inline">
                  {dateLine}
                </span>
                {b.verdict_headline && (
                  <span className="truncate text-[var(--dim)]">
                    <span className="hidden sm:inline">· </span>
                    {b.verdict_headline}
                  </span>
                )}
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
      title="Recent Briefings"
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
