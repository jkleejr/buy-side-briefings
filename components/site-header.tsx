import Link from "next/link";
import Image from "next/image";
import HeaderNav from "./header-nav";
import MobileNav from "./mobile-nav";
import ThemeToggle from "./theme-toggle";

// Ordered by the daily job-to-be-done: today's read first, then the archive,
// then what is coming, then the reference pages, then about. Same order as the
// command palette, so the two never present the site differently.
const NAV = [
  { href: "/", code: "TODAY", label: "Today" },
  { href: "/briefings", code: "RPT", label: "Reports" },
  // Route is still /earnings; the nav calls it what the page now calls itself.
  { href: "/earnings", code: "CAL", label: "Calendar" },
  { href: "/macro", code: "MAC", label: "Macro" },
  { href: "/global", code: "GLBL", label: "Global" },
  { href: "/about", code: "ABT", label: "About" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--foreground)] bg-[var(--background)]">
      {/* The chrome wears the monospace utility face, not the reading serif.
          The tape sitting directly under this nav is already mono, as is every
          label, chip and eyebrow on the site — the nav was the one piece of
          instrumentation still set in Charter, which muddies at 13px. */}
      <div className="mx-auto flex max-w-[1600px] items-baseline gap-5 px-4 py-2.5 font-mono text-[12px] sm:px-6">
        {/* The house mark, left of everything and always a link home. Mark
            only, no wordmark — the nav's first item is still TODAY → "/" and
            still carries the active-route rule, so the mark is the brand, not
            the wayfinding. The name lives in the aria-label, which is what a
            screen reader announces for the link.

            The mark is the falling-money image (public/brand/falling-money.png,
            shipped at 3x of its 24px render). `priority` so the sticky header
            paints with the first frame rather than after an image fetch. */}
        <Link
          href="/"
          aria-label="Buy Side — home"
          className="flex shrink-0 items-center self-center"
        >
          <Image
            src="/brand/falling-money.png"
            alt=""
            width={58}
            height={72}
            priority
            className="h-[24px] w-auto"
          />
        </Link>

        {/* Inline nav (tablet+) with active-route highlight + overflow fade. */}
        <HeaderNav items={NAV} />

        <div className="ml-auto flex shrink-0 items-baseline gap-3 font-mono text-[10.5px] tracking-[0.1em] text-[var(--dim)]">
          <ThemeToggle />
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}
