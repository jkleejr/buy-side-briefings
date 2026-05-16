import Link from "next/link";
import { cn } from "@/lib/utils";
import Tooltip from "./tooltip";

type PanelProps = {
  title: string;
  meta?: React.ReactNode;
  code?: string;
  learn?: string;
  href?: string;
  className?: string;
  children: React.ReactNode;
};

export default function Panel({
  title,
  meta,
  code,
  learn,
  href,
  className,
  children,
}: PanelProps) {
  const titleNode = learn ? <Tooltip text={learn}>{title}</Tooltip> : title;

  // When href is provided, both the code-prefix and the title (and a chevron)
  // are wrapped in a Link so clicking anywhere on the header opens the dedicated
  // detail page. The hover-tooltip still works because it sits inside the link.
  const header = href ? (
    <Link
      href={href}
      className="flex flex-1 items-center gap-2 transition-colors hover:bg-[rgba(255,165,0,0.06)]"
      title={`Open ${title} detail page`}
    >
      {code && (
        <span className="font-mono text-[10px] tracking-widest text-[var(--amber-dim)]">
          {code}
        </span>
      )}
      <h3 className="whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-[var(--amber)]">
        {titleNode}
      </h3>
      <span className="font-mono text-[10px] text-[var(--cyan-term)]">▸</span>
    </Link>
  ) : (
    <>
      {code && (
        <span className="font-mono text-[10px] tracking-widest text-[var(--amber-dim)]">
          {code}
        </span>
      )}
      <h3 className="whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-[var(--amber)]">
        {titleNode}
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
      <header className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1">
        {header}
        <div className="ml-auto flex items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--dim)]">
          {meta}
        </div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
