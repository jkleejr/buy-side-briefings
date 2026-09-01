import Link from "next/link";
import { todayETDisplay } from "@/lib/utils";
import BrandMark from "./brand-mark";
import HeaderNav from "./header-nav";
import MobileNav from "./mobile-nav";
import PaletteButton from "./palette-button";
import ThemeToggle from "./theme-toggle";

// Ordered by the daily job-to-be-done: today's read first, then the archive,
// then what is coming, then the reference pages, then about. Same order as the
// command palette, so the two never present the site differently.
const NAV = [
  { href: "/", code: "TODAY", label: "Today" },
  { href: "/briefings", code: "RPT", label: "Reports" },
  // Route is still /earnings; the nav calls it what the page now calls itself.
  { href: "/earnings", code: "CAL", label: "Calendar" },
  { href: "/macro", code: "MACRO", label: "Macro" },
  { href: "/global", code: "GLBL", label: "Global Markets" },
  { href: "/about", code: "ABT", label: "About" },
];

export default function SiteHeader() {
  const dateStr = todayETDisplay();
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

            The -1px nudge is optical, not geometric: the mark's box was already
            centred on the row. The nav reads its centre off the cap band, with
            descenders hanging below it, and the mark's own weight sits low
            because the candle bodies cluster under the midline while only thin
            wicks reach the top. Both offsets point down, ~0.8px together. */}
        <Link
          href="/"
          aria-label="Buy Side — home"
          className="flex shrink-0 -translate-y-px items-center self-center"
        >
          <BrandMark className="h-[18px] w-[17px]" />
        </Link>

        {/* Inline nav (tablet+) with active-route highlight + overflow fade. */}
        <HeaderNav items={NAV} />

        <div className="ml-auto flex shrink-0 items-baseline gap-3 font-mono text-[10.5px] tracking-[0.1em] text-[var(--dim)]">
          <PaletteButton />
          <ThemeToggle />
          <span className="hidden lg:inline">{dateStr}</span>
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}
