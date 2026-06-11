"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type {
  Opportunity,
  OpportunityConviction,
  OpportunityDirection,
} from "@/lib/data";
import type { LiveCheck } from "@/lib/opportunity-check";
import LiveCheckBadges from "./live-check-badges";

type Props = {
  items: Opportunity[];
  /** Live plan-vs-price checks for open ideas, keyed by opportunity id. */
  live?: Record<string, LiveCheck>;
};

const DIRECTION_LABEL: Record<OpportunityDirection, string> = {
  long: "LONG",
  short: "SHORT",
  long_vol: "LONG VOL",
  short_vol: "SHORT VOL",
  pair: "PAIR",
};

function directionColor(d: OpportunityDirection): string {
  switch (d) {
    case "long":
    case "long_vol":
      return "text-[var(--up)]";
    case "short":
    case "short_vol":
      return "text-[var(--down)]";
    default:
      return "text-[var(--amber)]";
  }
}

function convictionColor(c: OpportunityConviction): string {
  switch (c) {
    case "high":
      return "text-[var(--up)]";
    case "medium":
      return "text-[var(--amber)]";
    case "low":
      return "text-[var(--dim)]";
  }
}

function convictionBars(c: OpportunityConviction): string {
  switch (c) {
    case "high":
      return "███";
    case "medium":
      return "██░";
    case "low":
      return "█░░";
  }
}

export default function OpportunitiesList({ items, live }: Props) {
  const [dirFilter, setDirFilter] = useState<"all" | OpportunityDirection>("all");
  const [convFilter, setConvFilter] = useState<"all" | OpportunityConviction>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tagsExpanded, setTagsExpanded] = useState(false);

  // Most-used tags first — the full alphabet of ~100 one-off tags buried the
  // actual ideas below the fold, so only the top slice shows by default.
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of items) for (const t of o.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return Array.from(counts.keys()).sort(
      (a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b),
    );
  }, [items]);

  const VISIBLE_TAGS = 12;
  const visibleTags = tagsExpanded ? allTags : allTags.slice(0, VISIBLE_TAGS);
  // Keep the active filter's pill visible even when it's outside the top slice.
  if (!tagsExpanded && tagFilter && !visibleTags.includes(tagFilter)) {
    visibleTags.push(tagFilter);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((o) => {
      if (dirFilter !== "all" && o.direction !== dirFilter) return false;
      if (convFilter !== "all" && o.conviction !== convFilter) return false;
      if (tagFilter && !o.tags.includes(tagFilter)) return false;
      if (
        q &&
        ![o.title, o.ticker, o.thesis, o.catalyst, ...o.tags]
          .join(" ")
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [items, dirFilter, convFilter, tagFilter, query]);

  return (
    <div className="space-y-2">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border border-[var(--border)] bg-[var(--panel)] p-2 font-mono text-[10px]">
        <span className="text-[var(--amber-dim)]">FILTER ▸</span>

        <select
          value={dirFilter}
          onChange={(e) =>
            setDirFilter(e.target.value as "all" | OpportunityDirection)
          }
          className="border border-[var(--border)] bg-black px-1.5 py-0.5 text-[var(--foreground)]"
        >
          <option value="all">all directions</option>
          <option value="long">long only</option>
          <option value="short">short only</option>
          <option value="pair">pair trade</option>
          <option value="long_vol">long vol</option>
          <option value="short_vol">short vol</option>
        </select>

        <select
          value={convFilter}
          onChange={(e) =>
            setConvFilter(e.target.value as "all" | OpportunityConviction)
          }
          className="border border-[var(--border)] bg-black px-1.5 py-0.5 text-[var(--foreground)]"
        >
          <option value="all">all conviction</option>
          <option value="high">high conviction</option>
          <option value="medium">medium conviction</option>
          <option value="low">low conviction</option>
        </select>

        <input
          type="text"
          placeholder="search ticker, thesis, tag…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-[160px] border border-[var(--border)] bg-black px-1.5 py-0.5 text-[var(--foreground)] placeholder:text-[var(--dim)]"
        />

        <span className="ml-auto text-[var(--dim)]">
          {filtered.length} / {items.length}
        </span>
      </div>

      {/* Tag pills */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1 font-mono text-[10px]">
          <button
            onClick={() => setTagFilter(null)}
            className={`border px-1.5 py-0.5 uppercase tracking-wider ${
              tagFilter === null
                ? "border-[var(--amber)] text-[var(--amber)]"
                : "border-[var(--border)] text-[var(--dim)] hover:text-[var(--amber-dim)]"
            }`}
          >
            all
          </button>
          {visibleTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t === tagFilter ? null : t)}
              className={`border px-1.5 py-0.5 uppercase tracking-wider ${
                tagFilter === t
                  ? "border-[var(--amber)] text-[var(--amber)]"
                  : "border-[var(--border)] text-[var(--dim)] hover:text-[var(--amber-dim)]"
              }`}
            >
              {t}
            </button>
          ))}
          {allTags.length > VISIBLE_TAGS && (
            <button
              onClick={() => setTagsExpanded((s) => !s)}
              className="border border-[var(--amber-dim)] px-1.5 py-0.5 uppercase tracking-wider text-[var(--amber)]"
            >
              {tagsExpanded ? "▴ less" : `+${allTags.length - visibleTags.length} more ▾`}
            </button>
          )}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
        {filtered.map((o) => (
          <Link
            key={o.id}
            href={`/opportunities/${o.id}`}
            className="block border border-[var(--border)] bg-[var(--panel)] transition-colors hover:border-[var(--amber-dim)]"
          >
            <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider">
              <span className={directionColor(o.direction)}>
                {DIRECTION_LABEL[o.direction]}
              </span>
              <span className="text-[var(--amber)]">{o.ticker}</span>
              <span className="text-[var(--dim)]">·</span>
              <span className="text-[var(--dim)]">{o.category.replace("_", " ")}</span>
              <span className="ml-auto flex items-center gap-1">
                <span className={convictionColor(o.conviction)}>
                  {convictionBars(o.conviction)}
                </span>
                <span className={convictionColor(o.conviction)}>{o.conviction}</span>
              </span>
            </div>
            <div className="p-2">
              <div className="font-mono text-[13px] font-semibold text-[var(--foreground)]">
                {o.title}
              </div>
              {live?.[o.id] && (
                <div className="mt-1">
                  <LiveCheckBadges
                    price={live[o.id].price}
                    badges={live[o.id].badges}
                  />
                </div>
              )}
              <div className="mt-1 font-mono text-[11px] leading-snug text-[var(--dim)]">
                {o.catalyst}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-2 font-mono text-[10px]">
                <div>
                  <div className="text-[var(--amber-dim)] uppercase tracking-wider">
                    Horizon
                  </div>
                  <div className="text-[var(--foreground)]">{o.time_horizon}</div>
                </div>
                <div>
                  <div className="text-[var(--amber-dim)] uppercase tracking-wider">
                    R/R
                  </div>
                  <div className="text-[var(--foreground)]">{o.risk_reward}</div>
                </div>
                <div>
                  <div className="text-[var(--amber-dim)] uppercase tracking-wider">
                    Size
                  </div>
                  <div className="text-[var(--foreground)]">{o.position_size_pct}%</div>
                </div>
              </div>
              {o.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 font-mono text-[9px] uppercase tracking-wider">
                  {o.tags.map((t) => (
                    <span
                      key={t}
                      className="border border-[var(--border)] bg-black px-1 py-0.5 text-[var(--dim)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full border border-[var(--border)] bg-[var(--panel)] p-6 text-center font-mono text-[11px] text-[var(--dim)]">
            No opportunities match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
