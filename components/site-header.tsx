import Link from "next/link";
import { getLatestMarketsVerdict } from "@/lib/data";
import { todayET, verdictColor } from "@/lib/utils";
import HeaderNav from "./header-nav";
import LearnToggle from "./learn-toggle";
import MobileNav from "./mobile-nav";
import PaletteButton from "./palette-button";

// Ordered by the daily job-to-be-done: today's calls first (dossiers, ops),
// then context (markets hub), then the audit trail (week, track record).
const NAV = [
  // Information first (what helps you decide), then our trades. The long tail
  // (Crypto, Week, What I Got Wrong, Watchlist, About) lives in the ⌘K palette.
  { href: "/", code: "DASH", label: "Dashboard" },
  { href: "/briefings", code: "BRIEF", label: "Briefings" },
  { href: "/stocks", code: "STOCKS", label: "Stocks" },
  { href: "/markets", code: "MKTS", label: "Markets" },
  { href: "/earnings", code: "EARN", label: "Earnings" },
  { href: "/opportunities", code: "OPS", label: "Opportunities" },
  { href: "/situational-awareness", code: "SITAW", label: "Situational Awareness" },
  { href: "/track-record", code: "TRACK", label: "Track Record" },
  { href: "/desk", code: "DESK", label: "Paper Desk" },
];

export default function SiteHeader() {
  const dateStr = todayET();
  const verdict = getLatestMarketsVerdict();
  const vc = verdict ? verdictColor(verdict.verdict.code) : null;
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-black">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-2 py-1.5 text-[11px]">
        <Link href="/" className="flex shrink-0 items-baseline gap-2">
          <span className="font-mono text-[12px] font-bold uppercase tracking-widest text-[var(--amber)]">
            BSB
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-widest text-[var(--dim)] sm:inline">
            Buy-Side Briefings · Terminal
          </span>
        </Link>

        {/* Inline nav (tablet+) with active-route highlight + overflow fade. */}
        <HeaderNav items={NAV} />

        <div className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--dim)] sm:gap-3">
          <PaletteButton />
          <LearnToggle />
          <span className="hidden lg:inline">{dateStr}</span>
          <span className="hidden text-[var(--amber-dim)] lg:inline">·</span>
          <span className="flex items-center gap-1">
            <span className="term-blink glow-dot-up inline-block h-1.5 w-1.5 rounded-full bg-[var(--up)]" />
            <span className="text-[var(--up)]">SESSION</span>
          </span>
          <MobileNav items={NAV} />
        </div>
      </div>

      {/* Mobile-only verdict ribbon — rides along inside the sticky header so the
          standing market call stays pinned while scrolling a long page. */}
      {verdict && vc && (
        <Link
          href={`/briefings/${verdict.routine}/${verdict.date}-${verdict.window}`}
          className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--panel)] px-2 py-1 font-mono md:hidden"
        >
          <span className="shrink-0 text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Call
          </span>
          <span className="shrink-0 text-[11px] leading-none">{verdict.verdict.emoji}</span>
          <span
            className={`shrink-0 text-[12px] font-bold uppercase leading-none tracking-wide ${vc.text}`}
          >
            {verdict.verdict.code.replace(/_/g, " ")}
          </span>
          <span className="shrink-0 text-[9px] uppercase tracking-widest text-[var(--dim)]">
            {verdict.verdict.conviction}
          </span>
          <span className="truncate text-[10px] text-[var(--dim)]">
            {verdict.verdict.rationale_short}
          </span>
        </Link>
      )}
    </header>
  );
}
