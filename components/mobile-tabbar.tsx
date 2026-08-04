"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", code: "DASH" },
  { href: "/briefings", code: "BRIEF" },
  { href: "/earnings", code: "CAL" },
  { href: "/watchlist", code: "WATCH" },
];

/**
 * Sticky bottom tab bar for phones — the daily destinations one thumb
 * away. Hidden on md+ where the header nav is visible.
 */
export default function MobileTabbar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border-strong)] bg-[var(--background)] pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid grid-cols-4">
        {TABS.map((t) => {
          const active =
            t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`py-2.5 text-center font-mono text-[10px] uppercase tracking-widest ${
                active
                  ? "border-t-2 border-[var(--amber)] text-[var(--amber)]"
                  : "border-t-2 border-transparent text-[var(--dim)]"
              }`}
            >
              {t.code}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
