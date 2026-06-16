"use client";

// Route-level error boundary. The data layer (lib/markets.ts etc.) already
// degrades Yahoo/FRED failures to null, so this catches the rarer case of an
// unexpected throw during render — without it, Next shows its default error
// screen and the whole route goes blank. Styled to match the terminal look.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center font-mono">
      <div className="text-[11px] uppercase tracking-widest text-[var(--down)]">
        ⚠ Signal lost
      </div>
      <p className="max-w-md text-[12px] leading-relaxed text-[var(--foreground)]">
        A panel failed to render. The data feed may have hiccupped — this is
        usually transient.
      </p>
      <button
        onClick={reset}
        className="border border-[var(--amber)] bg-[rgba(255,165,0,0.06)] px-3 py-1 text-[11px] uppercase tracking-widest text-[var(--amber)] transition-colors hover:bg-[rgba(255,165,0,0.14)]"
      >
        Retry
      </button>
      {error.digest && (
        <div className="text-[9px] uppercase tracking-widest text-[var(--dim)]">
          ref {error.digest}
        </div>
      )}
    </div>
  );
}
