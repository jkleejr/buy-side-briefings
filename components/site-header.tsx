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
  { href: "/earnings", code: "EARN", label: "Earnings" },
  { href: "/situational-awareness", code: "SITAW", label: "Situational Awareness" },
  { href: "/ai-bubble", code: "BUBBLE", label: "AI Bubble" },
  { href: "/market-history", code: "HIST", label: "Market History" },
];

export default function SiteHeader() {
  const dateStr = todayET();
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--foreground)] bg-[var(--background)]">
      <div className="mx-auto flex max-w-[1600px] items-baseline gap-5 px-4 py-2.5 text-[13px] sm:px-6">
        {/* Inline nav (tablet+) with active-route highlight + overflow fade.
            The nav's first item is TODAY → "/", so home stays reachable
            without a wordmark. */}
        <HeaderNav items={NAV} />

        <div className="ml-auto flex shrink-0 items-baseline gap-3 text-[12px] italic text-[var(--dim)]">
          <PaletteButton />
          <ThemeToggle />
          <span className="hidden lg:inline">{dateStr}</span>
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}
