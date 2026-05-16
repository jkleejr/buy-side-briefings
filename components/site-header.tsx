import Link from "next/link";
import LearnToggle from "./learn-toggle";
import ChartTypeHeaderToggle from "./chart-type-header-toggle";
import MobileNav from "./mobile-nav";

const NAV = [
  { href: "/", code: "DASH", label: "Dashboard" },
  { href: "/briefings", code: "BRIEF", label: "Briefings" },
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

        {/* Inline nav (tablet+) */}
        <nav className="hidden items-center gap-3 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-mono uppercase tracking-wider text-[var(--dim)] hover:text-[var(--amber)]"
            >
              <span className="text-[var(--amber-dim)]">{item.code}</span>{" "}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--dim)] sm:gap-3">
          <ChartTypeHeaderToggle />
          <LearnToggle />
          <span className="hidden sm:inline">{dateStr}</span>
          <span className="hidden text-[var(--amber-dim)] sm:inline">·</span>
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
