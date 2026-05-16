import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-black">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--dim)]">
        <span className="text-[var(--amber-dim)]">DSCLM</span>
        <span className="normal-case tracking-normal text-[var(--dim)]">
          Educational analysis only. Not investment advice. Past performance does not guarantee
          future results.
        </span>
        <span className="ml-auto flex gap-3">
          <Link href="/about" className="hover:text-[var(--amber)]">ABOUT</Link>
          <Link href="/privacy" className="hover:text-[var(--amber)]">PRIVACY</Link>
          <Link href="/terms" className="hover:text-[var(--amber)]">TERMS</Link>
        </span>
      </div>
    </footer>
  );
}
