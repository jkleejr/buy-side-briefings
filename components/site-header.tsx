import Link from "next/link";
import LearnToggle from "./learn-toggle";
import MobileNav from "./mobile-nav";

// Ordered by the daily job-to-be-done: today's calls first (dossiers, ops),
// then context (markets hub), then the audit trail (week, track record).
const NAV = [
  { href: "/", code: "DASH", label: "Dashboard" },
  { href: "/nvidia", code: "NVDA", label: "NVIDIA" },
  { href: "/bitcoin", code: "BTC", label: "Bitcoin" },
  { href: "/skhynix", code: "HYNIX", label: "SK Hynix" },
  { href: "/opportunities", code: "OPS", label: "Opportunities" },
  { href: "/briefings", code: "BRIEF", label: "Briefings" },
  { href: "/crypto", code: "CRYPTO", label: "Crypto" },
  { href: "/markets", code: "MKTS", label: "Markets" },
  { href: "/digest", code: "WEEK", label: "Week" },
  { href: "/track-record", code: "TRACK", label: "Track Record" },
  { href: "/watchlist", code: "WATCH", label: "Watchlist" },
  { href: "/about", code: "ABT", label: "About" },
];

export default function SiteHeader() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  return (
    <header className="border-b border-[var(--border)] bg-black">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-2 py-1.5 text-[11px]">
        <Link href="/" className="flex shrink-0 items-baseline gap-2">
          <span className="font-mono text-[12px] font-bold uppercase tracking-widest text-[var(--amber)]">
            BSB
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-widest text-[var(--dim)] sm:inline">
            Buy-Side Briefings · Terminal
          </span>
        </Link>

        {/* Inline nav (tablet+). Scrolls horizontally instead of wrapping or
            overflowing the page when the item list is long. */}
        <nav className="hidden min-w-0 flex-1 items-center gap-3 overflow-x-auto md:flex [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 whitespace-nowrap font-mono uppercase tracking-wider text-[var(--dim)] hover:text-[var(--amber)]"
            >
              <span className="text-[var(--amber-dim)]">{item.code}</span>{" "}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--dim)] sm:gap-3">
          <LearnToggle />
          <span className="hidden lg:inline">{dateStr}</span>
          <span className="hidden text-[var(--amber-dim)] lg:inline">·</span>
          <span className="flex items-center gap-1">
            <span className="term-blink inline-block h-1.5 w-1.5 rounded-full bg-[var(--up)]" />
            <span className="text-[var(--up)]">SESSION</span>
          </span>
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}
