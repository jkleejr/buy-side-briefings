"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

type NavItem = { href: string; code: string; label: string };

export default function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  // Close menu on route change or escape key.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-[15px] leading-none text-[var(--amber)] hover:bg-[var(--amber-soft)] lg:hidden"
      >
        {open ? "✕" : "☰"}
      </button>

      {open && (
        <>
          {/* Backdrop to dismiss by tap-outside */}
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Slide-down menu */}
          <nav
            className="fixed inset-x-2 top-[56px] z-50 grid max-h-[80vh] grid-cols-2 gap-1 overflow-y-auto rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--panel)] p-2 shadow-[var(--shadow-2)] lg:hidden"
            aria-label="Mobile navigation"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-[13px] font-medium tracking-wide text-[var(--foreground)] hover:bg-[var(--surface-3)] hover:text-[var(--amber)]"
              >
                <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                  {item.code}
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </>
      )}
    </>
  );
}
