"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Destination = {
  href: string;
  code: string;
  label: string;
  /** Second letter of the `g` chord, e.g. "n" → press g then n. */
  go?: string;
};

const DESTINATIONS: Destination[] = [
  { href: "/", code: "DASH", label: "Dashboard", go: "d" },
  { href: "/situational-awareness", code: "SITAW", label: "Situational Awareness — Aschenbrenner's AI fund, copy-trade book" },
  { href: "/market-history", code: "HIST", label: "Market History — what past booms & crashes say about AI", go: "m" },
  { href: "/briefings", code: "BRIEF", label: "Briefings archive", go: "r" },
  { href: "/earnings", code: "EARN", label: "Earnings calendar — schedule for the names you track" },
  { href: "/watchlist", code: "WATCH", label: "Watchlist", go: "w" },
  { href: "/kospi", code: "KOSPI", label: "KOSPI briefings", go: "k" },
  { href: "/sectors", code: "SECT", label: "Sector rotation" },
  { href: "/macro", code: "MACRO", label: "Macro — Fed, inflation, labor" },
  { href: "/global", code: "GLBL", label: "Global markets" },
  { href: "/about", code: "ABT", label: "About" },
];

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

/**
 * Terminal-style command palette. ⌘K / Ctrl+K opens it; type to filter,
 * ↑/↓ + Enter to navigate. Outside the palette, `g` then a letter jumps
 * straight to a destination (g n → NVIDIA), like a real terminal.
 */
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingG = useRef<number | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DESTINATIONS;
    return DESTINATIONS.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.href.includes(q),
    );
  }, [query]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      setCursor(0);
      router.push(href);
    },
    [router],
  );

  // Global shortcuts: ⌘K toggle + `g <letter>` chord.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((s) => !s);
        return;
      }
      if (open || isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      // `?` opens the palette too — it doubles as the shortcut reference,
      // since every row shows its g-chord.
      if (e.key === "?") {
        e.preventDefault();
        setOpen(true);
        return;
      }

      const now = Date.now();
      if (pendingG.current && now - pendingG.current < 1200) {
        const dest = DESTINATIONS.find((d) => d.go === e.key.toLowerCase());
        pendingG.current = null;
        if (dest) {
          e.preventDefault();
          navigate(dest.href);
        }
        return;
      }
      if (e.key === "g") pendingG.current = now;
    }
    function onOpenEvent() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("bsb:palette", onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("bsb:palette", onOpenEvent);
    };
  }, [open, navigate]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      // Focus after the overlay paints.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 p-4 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="mx-auto max-w-lg border border-[var(--amber-dim)] bg-[var(--background)] shadow-[0_8px_40px_rgba(30,29,26,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
          <span className="font-mono text-[11px] text-[var(--amber)]">▸</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(results.length - 1, c + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(0, c - 1));
              } else if (e.key === "Enter" && results[cursor]) {
                navigate(results[cursor].href);
              }
            }}
            placeholder="go to…"
            className="w-full bg-transparent font-mono text-[13px] text-[var(--foreground)] placeholder:text-[var(--dim)] focus:outline-none"
          />
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
            esc
          </span>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto">
          {results.map((d, i) => (
            <li key={d.href}>
              <button
                type="button"
                onMouseEnter={() => setCursor(i)}
                onClick={() => navigate(d.href)}
                className={`flex w-full items-baseline gap-2 px-3 py-1.5 text-left font-mono text-[12px] ${
                  i === cursor
                    ? "bg-[rgba(255,165,0,0.1)] text-[var(--amber)]"
                    : "text-[var(--foreground)]"
                }`}
              >
                <span className="w-14 shrink-0 text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
                  {d.code}
                </span>
                <span>{d.label}</span>
                {d.go && (
                  <span className="ml-auto shrink-0 text-[9px] uppercase tracking-widest text-[var(--dim)]">
                    g {d.go}
                  </span>
                )}
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-3 text-center font-mono text-[11px] text-[var(--dim)]">
              no match
            </li>
          )}
        </ul>
        <div className="border-t border-[var(--border)] px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
          ↑↓ move · enter go · outside: g + letter jumps · ? opens this
        </div>
      </div>
    </div>
  );
}
