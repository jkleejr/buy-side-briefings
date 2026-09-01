"use client";

/** Header hint that opens the command palette (same as pressing ⌘I). */
export default function PaletteButton() {
  return (
    <button
      type="button"
      onClick={() => document.dispatchEvent(new CustomEvent("bsb:palette"))}
      className="hidden border border-[var(--border)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)] hover:border-[var(--amber-dim)] hover:text-[var(--amber)] md:inline"
      title="Command palette (⌘I)"
    >
      ⌘I
    </button>
  );
}
