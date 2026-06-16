import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Terminal-styled long-form markdown renderer. Shared by theses and any other
// long-form prose. Matches the dashboard aesthetic: mono, amber headings, cyan
// links, hairline rules — no new colors or fonts.
export default function ProseMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => (
          <h2 className="mt-6 mb-2 flex items-center gap-2 font-mono text-[13px] font-semibold uppercase tracking-widest text-[var(--amber)]">
            <span className="h-1.5 w-1.5 shrink-0 bg-[var(--amber)]" />
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-4 mb-1 font-mono text-[12px] font-semibold uppercase tracking-wider text-[var(--amber-dim)]">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="my-2 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
            {children}
          </p>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--cyan-term)] underline underline-offset-4 hover:text-[var(--amber)]"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => (
          <ul className="my-2 list-disc space-y-1.5 pl-5 font-mono text-[12px] text-[var(--foreground)]">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 list-decimal space-y-1.5 pl-5 font-mono text-[12px] text-[var(--foreground)]">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-[var(--amber)]">{children}</strong>
        ),
        em: ({ children }) => <em className="text-[var(--foreground)]">{children}</em>,
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-[var(--amber-dim)] pl-3 font-mono text-[12px] italic leading-relaxed text-[var(--dim)]">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-4 border-[var(--border)]" />,
        code: ({ children }) => (
          <code className="bg-[var(--panel-head)] px-1 py-0.5 font-mono text-[11px] text-[var(--cyan-term)]">
            {children}
          </code>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
