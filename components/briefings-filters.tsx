"use client";

import { useMemo, useState } from "react";
import type { BriefingMeta } from "@/lib/data";
import BriefingList from "./briefing-list";

type Props = {
  items: BriefingMeta[];
};

// Discover available routines and codes from the data itself so the filter
// chips only show options that actually have entries.
function discover(items: BriefingMeta[]): {
  routines: string[];
  codes: string[];
} {
  const routines = new Set<string>();
  const codes = new Set<string>();
  for (const b of items) {
    if (b.routine) routines.add(b.routine);
    if (b.verdict_code) codes.add(b.verdict_code);
  }
  return {
    routines: [...routines].sort(),
    codes: [...codes].sort(),
  };
}

const CODE_LABEL: Record<string, string> = {
  buy: "🟢 BUY",
  hold: "🟡 HOLD",
  step_aside: "🟠 STEP ASIDE",
  bearish: "🔴 BEARISH",
};

const ROUTINE_LABEL: Record<string, string> = {
  markets: "Markets",
  crypto: "Crypto",
  kospi: "KOSPI",
  politics: "Politics",
  quote: "Quote",
  "pre-earnings": "Pre-Earnings",
  "app-ideas": "App Ideas",
  "demand-signals": "Demand Signals",
};

export default function BriefingsFilters({ items }: Props) {
  const { routines, codes } = useMemo(() => discover(items), [items]);
  const [routine, setRoutine] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((b) => {
      if (routine && b.routine !== routine) return false;
      if (code && b.verdict_code !== code) return false;
      if (q) {
        const haystack = [
          b.title ?? "",
          b.routine,
          b.date,
          b.window ?? "",
          b.verdict_rationale ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, routine, code, query]);

  const hasActiveFilter = routine !== null || code !== null || query.trim().length > 0;

  return (
    <div className="space-y-1">
      <div className="border border-[var(--border)] bg-[var(--panel)]">
        <div className="border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
            Filters
          </span>
        </div>

        <div className="space-y-1.5 p-2">
          {/* Routine row */}
          {routines.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
                Routine
              </span>
              <FilterChip
                label="All"
                active={routine === null}
                onClick={() => setRoutine(null)}
              />
              {routines.map((r) => (
                <FilterChip
                  key={r}
                  label={ROUTINE_LABEL[r] ?? r}
                  active={routine === r}
                  onClick={() => setRoutine(r)}
                />
              ))}
            </div>
          )}

          {/* Verdict-code row */}
          {codes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
                Verdict
              </span>
              <FilterChip
                label="All"
                active={code === null}
                onClick={() => setCode(null)}
              />
              {codes.map((c) => (
                <FilterChip
                  key={c}
                  label={CODE_LABEL[c] ?? c}
                  active={code === c}
                  onClick={() => setCode(c)}
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
              placeholder="title, date, rationale…"
              className="flex-1 min-w-[120px] border border-[var(--border)] bg-[var(--background)] px-2 py-1 font-mono text-[11px] text-[var(--foreground)] placeholder:text-[var(--dim)] focus:border-[var(--amber)] focus:outline-none"
            />
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  setRoutine(null);
                  setCode(null);
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
