"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveRoute } from "@/lib/nav-active";

type NavItem = { href: string; code: string; label: string; external?: boolean };

/**
 * One rule for every nav item, wherever it sits. The current page is marked by
 * its colour, not by a rule under it: with the rule gone the pb-0.5 and the 2px
 * transparent border it sat in went too, since they padded every item below its
 * text and left the boxes centred while the text rode high. Weight and
 * aria-current still carry the state for anyone who can't use the colour.
 */
function navItemClass(active: boolean): string {
  return `shrink-0 whitespace-nowrap font-mono text-[12px] leading-none tracking-[0.02em] ${
    active
      ? "font-semibold text-[var(--amber)]"
      : "text-[var(--dim)] hover:text-[var(--foreground)]"
  }`;
}

/**
 * A single nav item, for the ones that sit outside the inline row — About
 * lives over on the right, beside the theme toggle, because it is the one
 * entry a reader visits once rather than daily.
 */
export function HeaderNavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = item.external ? false : isActiveRoute(item.href, pathname);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={navItemClass(active)}
    >
      {item.label}
    </Link>
  );
}

/**
 * Desktop/tablet inline nav (md+). Horizontally scrolls instead of wrapping when
 * the item list is long; highlights the active route and fades the right edge so
 * the overflow is discoverable.
 */
export default function HeaderNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="relative hidden min-w-0 flex-1 md:block">
      <nav className="flex items-center gap-5 overflow-x-auto pr-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = item.external ? false : isActiveRoute(item.href, pathname);
          const cls = navItemClass(active);

          // Off-site links leave in a new tab and say so with a small arrow,
          // so a click doesn't quietly navigate away from the briefing.
          if (item.external) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cls}
              >
                {item.label}
                <span aria-hidden="true" className="ml-1 text-[10px]">↗</span>
              </a>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cls}
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
