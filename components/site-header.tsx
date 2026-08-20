import { todayET } from "@/lib/utils";
import HeaderNav from "./header-nav";
import MobileNav from "./mobile-nav";
import PaletteButton from "./palette-button";
import ThemeToggle from "./theme-toggle";

// Ordered by the daily job-to-be-done: today's read first, then the archive,
// then standing reports, then the audit trail.
const NAV = [
  { href: "/", code: "TODAY", label: "Today" },
  { href: "/briefings", code: "BRIEF", label: "Briefings" },
  { href: "/watchlist", code: "WATCH", label: "Watchlist" },
  // Route is still /earnings; the nav calls it what the page now calls itself.
  { href: "/earnings", code: "CAL", label: "Calendar" },
  // The sister site, not a route here: it opens in its own tab and never
  // takes the active-route highlight.
  {
    href: "https://ai-capital-flow.vercel.app/",
    code: "FLOW",
    label: "AI Capital Flow",
    external: true,
  },
  // Market History is deliberately not here — the page stays published and
  // stays in the command palette (⌘K, "m"), it just isn't top-level chrome.
];

export default function SiteHeader() {
  const dateStr = todayET();
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--foreground)] bg-[var(--background)]">
      {/* The chrome wears the monospace utility face, not the reading serif.
          The tape sitting directly under this nav is already mono, as is every
          label, chip and eyebrow on the site — the nav was the one piece of
          instrumentation still set in Charter, which muddies at 13px. */}
      <div className="mx-auto flex max-w-[1600px] items-baseline gap-5 px-4 py-2.5 font-mono text-[12px] sm:px-6">
        {/* Inline nav (tablet+) with active-route highlight + overflow fade.
            The nav's first item is TODAY → "/", so home stays reachable
            without a wordmark. */}
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
