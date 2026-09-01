"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Destination = {
  href: string;
  code: string;
  label: string;
};

// Ordered the way the site is read, not alphabetically or by age: home, then
// the daily pages (reports, calendar), then the market-data pages (macro,
// global), then about.
const DESTINATIONS: Destination[] = [
  { href: "/", code: "HOME", label: "Home" },
  { href: "/briefings", code: "RPT", label: "Reports" },
  { href: "/earnings", code: "CAL", label: "Calendar" },
  { href: "/macro", code: "MACRO", label: "Macro" },
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
 * ↑/↓ + Enter to navigate.
 */
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Global shortcut: ⌘K toggles the palette. `?` opens it too.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((s) => !s);
        return;
      }
      if (open || isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?") {
        e.preventDefault();
        setOpen(true);
      }
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
  }, [open]);

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
        {/* pb-1 stands in for the removed shortcut footer, which used to give the
            panel a base — without it the last row sits flush on the border. */}
        <ul className="max-h-[50vh] overflow-y-auto pb-1">
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
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-3 text-center font-mono text-[11px] text-[var(--dim)]">
              no match
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
