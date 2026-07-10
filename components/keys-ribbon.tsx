"use client";

// Bloomberg-style function-key ribbon pinned to the bottom of the screen on
// desktop — the always-visible reminder of the keyboard controls. Clicking
// anywhere on it opens the command palette (the full shortcut reference).
// Hidden on mobile, where the tab bar owns the bottom edge and there is no
// keyboard.

const HINTS: { keys: string; label: string }[] = [
  { keys: "⌘K", label: "GO TO" },
  { keys: "G D", label: "DASH" },
  { keys: "G N", label: "NVDA" },
  { keys: "G B", label: "BTC" },
  { keys: "G H", label: "HYNIX" },
  { keys: "G O", label: "OPS" },
  { keys: "G T", label: "TRACK" },
  { keys: "G M", label: "MKTS" },
  { keys: "?", label: "ALL KEYS" },
];

export default function KeysRibbon() {
  return (
    <button
      type="button"
      onClick={() => document.dispatchEvent(new CustomEvent("bsb:palette"))}
      title="Command palette (⌘K) — or press g then a letter to jump"
      className="fixed inset-x-0 bottom-0 z-40 hidden cursor-pointer items-center gap-x-4 overflow-x-hidden border-t border-[var(--border)] bg-[var(--background)] px-2 py-1 text-left font-mono text-[9px] uppercase tracking-widest md:flex"
    >
      {HINTS.map((h) => (
        <span key={h.keys} className="shrink-0 whitespace-nowrap">
          <span className="text-[var(--amber)]">{h.keys}</span>{" "}
          <span className="text-[var(--dim)]">{h.label}</span>
        </span>
      ))}
    </button>
  );
}
