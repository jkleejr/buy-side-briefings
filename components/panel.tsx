import Link from "next/link";
import { cn } from "@/lib/utils";

type PanelProps = {
  title: string;
  meta?: React.ReactNode;
  /** Data vintage, e.g. "14:32 UTC" — rendered after meta as AS OF …. */
  asOf?: string;
  code?: string;
  href?: string;
  className?: string;
  children: React.ReactNode;
};

export default function Panel({
  title,
  meta,
  asOf,
  code,
  href,
  className,
  children,
}: PanelProps) {
  // When href is provided, both the code-prefix and the title (and a chevron)
  // are wrapped in a Link so clicking anywhere on the header opens the dedicated
  // detail page.
  const header = href ? (
    <Link
      href={href}
      className="flex min-w-0 flex-1 items-center gap-2 transition-colors hover:bg-[rgba(255,165,0,0.06)]"
      title={`Open ${title} detail page`}
    >
      {code && (
        <span className="shrink-0 font-mono text-[10px] tracking-widest text-[var(--amber-dim)]">
          {code}
        </span>
      )}
      <h3 className="truncate font-mono text-[11px] uppercase tracking-wider text-[var(--amber)]">
        {title}
      </h3>
      <span className="shrink-0 font-mono text-[10px] text-[var(--cyan-term)]">▸</span>
    </Link>
  ) : (
    <>
      {code && (
        <span className="shrink-0 font-mono text-[10px] tracking-widest text-[var(--amber-dim)]">
          {code}
        </span>
      )}
      <h3 className="min-w-0 truncate font-mono text-[11px] uppercase tracking-wider text-[var(--amber)]">
        {title}
      </h3>
    </>
  );

  return (
    <section
      className={cn(
        "flex h-full flex-col border border-[var(--border)] bg-[var(--panel)]",
        className,
      )}
    >
      <header className="flex min-w-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1">
        {header}
        <div className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[var(--dim)]">
          {meta}
          {asOf && (
            <span className="hidden whitespace-nowrap font-mono text-[9px] tracking-widest text-[var(--dim)] sm:inline">
              AS OF {asOf}
            </span>
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
