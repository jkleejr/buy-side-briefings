"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; code: string; label: string };

export default function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="hidden min-w-0 flex-1 items-center gap-x-0.5 overflow-x-auto lg:flex [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Primary"
    >
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1 text-[12px] font-medium tracking-wide transition-colors",
              active
                ? "bg-[var(--amber-soft)] text-[var(--amber)]"
                : "text-[var(--dim)] hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
