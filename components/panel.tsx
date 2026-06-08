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
      className="group/ph -mx-2.5 -my-1.5 flex flex-1 items-center gap-2 rounded-t-[var(--radius)] px-2.5 py-1.5 transition-colors hover:bg-[var(--amber-soft)]"
      title={`Open ${title} detail page`}
    >
      {code && (
        <span className="font-mono text-[10px] tracking-widest text-[var(--amber-dim)]">
          {code}
        </span>
      )}
      <h3 className="whitespace-nowrap font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--amber)]">
        {titleNode}
      </h3>
      <span className="font-mono text-[10px] text-[var(--cyan-term)] transition-transform group-hover/ph:translate-x-0.5">
        ▸
      </span>
    </Link>
  ) : (
    <>
      {code && (
        <span className="font-mono text-[10px] tracking-widest text-[var(--amber-dim)]">
          {code}
        </span>
      )}
      <h3 className="whitespace-nowrap font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--amber)]">
        {titleNode}
      </h3>
    </>
  );

  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-[var(--radius)] border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-1)]",
        className,
      )}
    >
      <header className="flex items-center gap-2 rounded-t-[var(--radius)] border-b border-[var(--border)] bg-gradient-to-b from-[var(--panel-head)] to-[var(--panel)] px-2.5 py-1.5">
        {header}
        <div className="ml-auto flex items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--dim)]">
          {meta}
        </div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
