import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-4 border-t border-[var(--border)] bg-[var(--panel-head)]/40">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-2 py-4 text-[11px] text-[var(--dim)] sm:px-4">
        <span className="pill border-[var(--border)] text-[var(--amber-dim)]">Disclaimer</span>
        <span className="basis-full text-[var(--muted)] sm:basis-auto sm:flex-1">
          Educational analysis only. Not investment advice. Past performance does not guarantee
          future results.
        </span>
        <span className="ml-auto flex gap-4 font-mono text-[10px] uppercase tracking-widest">
          <Link href="/about" className="hover:text-[var(--amber)]">About</Link>
          <Link href="/privacy" className="hover:text-[var(--amber)]">Privacy</Link>
          <Link href="/terms" className="hover:text-[var(--amber)]">Terms</Link>
        </span>
      </div>
    </footer>
  );
}
