import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="bg-[var(--background)]">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3 font-mono text-[10.5px] leading-relaxed text-[var(--dim)] sm:px-6">
        <span className="ml-auto flex gap-4 text-[9.5px] uppercase tracking-[0.18em]">
          <Link href="/about" className="hover:text-[var(--amber)]">About</Link>
          <Link href="/privacy" className="hover:text-[var(--amber)]">Privacy</Link>
        </span>
      </div>
    </footer>
  );
}
