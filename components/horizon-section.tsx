import type { ReactNode } from "react";

export default function HorizonSection({
  emoji,
  title,
  subtitle,
  question,
  children,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  question: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <header className="border-b border-zinc-800 pb-3">
        <div className="flex items-baseline gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
          <span>{emoji}</span>
          <span>{title}</span>
          <span className="text-zinc-700">·</span>
          <span className="normal-case tracking-normal text-zinc-500">{subtitle}</span>
        </div>
        <p className="mt-1 text-base italic text-zinc-300">&ldquo;{question}&rdquo;</p>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
