"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// The dropdown behind the chart header's asset picker and indicator menu.
//
// One primitive for both so they open, close and dismiss identically: click the
// trigger to toggle, click anywhere outside to close, Escape to close. Closing
// on pointerdown rather than click means a press that starts outside the menu
// dismisses it before the underlying control fires, which is what a reader
// reaching past an open menu expects.
// ---------------------------------------------------------------------------

export default function ChartMenu({
  label,
  ariaLabel,
  minWidth = 260,
  align = "left",
  disabled,
  children,
}: {
  /** Trigger content — the asset name, or "Indicators (2)". */
  label: ReactNode;
  ariaLabel: string;
  minWidth?: number;
  align?: "left" | "right";
  disabled?: boolean;
  /** Receives a closer so a row can dismiss the menu after acting. */
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      // Escape hands focus back to the trigger, so keyboard use doesn't get
      // dropped at the top of the document.
      btnRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[11px] leading-5 disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)] ${
          open
            ? "border-[var(--amber)] bg-[rgba(255,165,0,0.08)] text-[var(--foreground)]"
            : "border-[var(--border-strong)] text-[var(--foreground)] hover:bg-[var(--panel)]"
        }`}
      >
        <span className="truncate">{label}</span>
        <span
          aria-hidden
          className={`text-[8px] text-[var(--dim)] ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          style={{ minWidth }}
          className={`absolute top-[calc(100%+4px)] z-50 max-h-[70vh] overflow-y-auto overscroll-contain border border-[var(--border-strong)] bg-[var(--panel)] py-1 shadow-2xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
