"use client";

import { useMemo, useState } from "react";
import type { BriefingMeta } from "@/lib/data";
import { windowLabel } from "@/lib/utils";
import BriefingList from "./briefing-list";

type Props = {
  items: BriefingMeta[];
};

// The two editions that actually run: morning and night. A handful of older
// entries carry "afternoon" or "daily" windows from routines long retired —
// they stay reachable under All rather than earning a chip of their own.
const WINDOWS = ["morning", "night"];

function discover(items: BriefingMeta[]): string[] {
  const present = new Set(items.map((b) => b.window).filter(Boolean));
  return WINDOWS.filter((w) => present.has(w));
}

export default function BriefingsFilters({ items }: Props) {
  const windows = useMemo(() => discover(items), [items]);
  const [window, setWindow] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((b) => {
      if (window && b.window !== window) return false;
      if (q) {
        const haystack = [b.title ?? "", b.routine, b.date, b.window ?? "", b.verdict_headline ?? ""]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, window, query]);

  const hasActiveFilter = window !== null || query.trim().length > 0;

  return (
    <div className="space-y-1">
      <div className="border border-[var(--border)] bg-[var(--panel)]">
        <div className="border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
            Filters
          </span>
        </div>

        <div className="space-y-1.5 p-2">
          {/* Morning / evening. The routine chips that used to live here
              (Crypto, KOSPI, Markets) are gone — every recent briefing is a
              markets one, so the only distinction worth filtering on is which
              edition you're after. */}
          {windows.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
                Routine
              </span>
              <FilterChip
                label="All"
                active={window === null}
                onClick={() => setWindow(null)}
              />
              {windows.map((w) => (
                <FilterChip
                  key={w}
                  label={windowLabel(w)}
                  active={window === w}
                  onClick={() => setWindow(w)}
                />
              ))}
            </div>
          )}

          {/* Search row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
              Search
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="title, date, headline…"
              className="flex-1 min-w-[120px] border border-[var(--border)] bg-[var(--background)] px-2 py-1 font-mono text-[11px] text-[var(--foreground)] placeholder:text-[var(--dim)] focus:border-[var(--amber)] focus:outline-none"
            />
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  setWindow(null);
                  setQuery("");
                }}
                className="border border-[var(--border)] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[var(--dim)] hover:border-[var(--amber-dim)] hover:text-[var(--amber)]"
              >
                Clear
              </button>
            )}
          </div>

          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--dim)]">
            Showing {filtered.length} of {items.length}
            {hasActiveFilter ? " (filtered)" : ""}
          </div>
        </div>
      </div>

      <BriefingList items={filtered} />
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest transition-colors " +
        (active
          ? "border-[var(--amber)] bg-[rgba(255,165,0,0.1)] text-[var(--amber)]"
          : "border-[var(--border)] text-[var(--dim)] hover:border-[var(--amber-dim)] hover:text-[var(--amber)]")
      }
    >
      {label}
    </button>
  );
}
