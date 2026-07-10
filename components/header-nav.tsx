"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; code: string; label: string };

/**
 * Desktop/tablet inline nav (md+). Horizontally scrolls instead of wrapping when
 * the item list is long; highlights the active route and fades the right edge so
 * the overflow is discoverable.
 */
export default function HeaderNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="relative hidden min-w-0 flex-1 md:block">
      <nav className="flex items-baseline gap-5 overflow-x-auto pr-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 whitespace-nowrap pb-0.5 text-[13px] tracking-[0.04em] ${
                active
                  ? "border-b-2 border-[var(--amber)] font-bold text-[var(--foreground)]"
                  : "border-b-2 border-transparent text-[var(--dim)] hover:text-[var(--foreground)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {/* Right-edge fade signals there are more items past the scroll edge. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[var(--background)] to-transparent" />
    </div>
  );
}
