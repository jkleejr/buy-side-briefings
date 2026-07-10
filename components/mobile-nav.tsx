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
        className="flex items-center justify-center border border-[var(--border)] px-2 py-1 font-mono text-[14px] leading-none text-[var(--amber)] hover:bg-[rgba(255,165,0,0.06)] md:hidden"
      >
        {open ? "✕" : "☰"}
      </button>

      {open && (
        <>
          {/* Backdrop to dismiss by tap-outside */}
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Slide-down menu */}
          <nav
            className="fixed inset-x-0 top-[40px] z-50 flex flex-col border-y border-[var(--amber)] bg-[var(--background)] shadow-2xl md:hidden"
            aria-label="Mobile navigation"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-baseline gap-2 border-t border-[var(--border)] px-4 py-3 font-mono text-[13px] uppercase tracking-wider text-[var(--foreground)] first:border-t-0 hover:bg-[rgba(255,165,0,0.06)] hover:text-[var(--amber)]"
              >
                <span className="text-[var(--amber-dim)]">{item.code}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </>
      )}
    </>
  );
}
