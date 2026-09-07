import Link from "next/link";
import HeaderNav, { HeaderNavLink } from "./header-nav";
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

/**
 * About sits apart from the rest, over on the right beside the theme toggle.
 * The inline row is the daily circuit — today's read, the archive, what's
 * coming, the reference pages — and About is the one entry a reader visits
 * once. NAV stays whole for the mobile drawer and the command palette, so
 * nothing is harder to reach; only the desktop row is split.
 */
const PRIMARY_NAV = NAV.filter((i) => i.href !== "/about");
const ABOUT = NAV.find((i) => i.href === "/about")!;

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--foreground)] bg-[var(--background)]">
      {/* The chrome wears the monospace utility face, not the reading serif.
          The tape sitting directly under this nav is already mono, as is every
          label, chip and eyebrow on the site — the nav was the one piece of
          instrumentation still set in Charter, which muddies at 13px. */}
      <div className="mx-auto flex max-w-[1600px] items-center gap-5 px-4 py-2.5 font-mono text-[12px] sm:px-6">
        {/* The wordmark, left of everything and always a link home. Set in
            the reading serif rather than the nav's mono: it is the one piece
            of the chrome that is the brand rather than instrumentation, and
            the same face the headlines use ties the two ends of the page
            together. The nav's first item is still TODAY → "/" and still
            carries the active-route rule, so this is the brand, not the
            wayfinding.

            Centred in the row rather than sitting on the nav baseline. The
            row is baseline-aligned for the nav items, which are all one size;
            the mark is larger, and baseline-aligning it hung it off the top of
            the bar with the space all underneath. A three-letter monogram also
            wants more letterspacing than a word does. */}
        <Link
          href="/"
          aria-label="Buy Side — home"
          className="shrink-0 self-center font-serif text-[15px] font-semibold leading-none tracking-[0.08em] text-[var(--foreground)]"
        >
          [BSB]
        </Link>

        {/* Inline nav (tablet+) with active-route highlight + overflow fade. */}
        <HeaderNav items={PRIMARY_NAV} />

        <div className="ml-auto flex shrink-0 items-center gap-3 font-mono text-[10.5px] tracking-[0.1em] text-[var(--dim)]">
          {/* Hidden below md for the same reason the inline row is: the
              drawer already carries About there. */}
          <div className="hidden md:block">
            <HeaderNavLink item={ABOUT} />
          </div>
          <ThemeToggle />
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}
