import Link from "next/link";
import LearnToggle from "./learn-toggle";
import MobileNav from "./mobile-nav";
import MainNav from "./main-nav";

const NAV = [
  { href: "/", code: "DASH", label: "Dashboard" },
  { href: "/indices", code: "INDX", label: "Indices" },
  { href: "/tech", code: "TECH", label: "Tech" },
  { href: "/nvidia", code: "NVDA", label: "NVIDIA" },
  { href: "/briefings", code: "BRIEF", label: "Briefings" },
  { href: "/tldr", code: "TLDR", label: "TL;DR" },
  { href: "/crypto-briefings", code: "CRYPTO", label: "Crypto" },
  { href: "/bitcoin", code: "BTC", label: "Bitcoin" },
  { href: "/kospi", code: "KOSPI", label: "KOSPI" },
  { href: "/opportunities", code: "OPS", label: "Opportunities" },
  { href: "/digest", code: "WEEK", label: "Week" },
  { href: "/track-record", code: "TRACK", label: "Track Record" },
  { href: "/watchlist", code: "WATCH", label: "Watchlist" },
  { href: "/about", code: "ABT", label: "About" },
];

export default function SiteHeader() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--background)]/65">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-2 py-2 sm:px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Buy-Side Briefings — home">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-[var(--amber)] to-[var(--amber-dim)] font-mono text-[12px] font-bold text-black shadow-[var(--shadow-1)]">
            B
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[13px] font-bold tracking-tight text-[var(--foreground)]">
              Buy-Side
            </span>
            <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--dim)] sm:inline">
              Briefings
            </span>
          </span>
        </Link>

        <span className="hidden h-6 w-px shrink-0 bg-[var(--border)] lg:block" />

        {/* Inline nav (desktop) */}
        <MainNav items={NAV} />

        <div className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--dim)] sm:gap-3">
          <LearnToggle />
          <span className="hidden tabular-nums sm:inline">{dateStr}</span>
          <span className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--up-soft)] px-2 py-0.5 sm:flex">
            <span className="term-blink inline-block h-1.5 w-1.5 rounded-full bg-[var(--up)]" />
            <span className="text-[var(--up)]">LIVE</span>
          </span>
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}
