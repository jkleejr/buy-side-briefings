// Route-level loading state. Server pages fetch live quotes (Yahoo/FRED) during
// render, which can take a beat on a cold ISR miss — without this the page is
// blank until the whole render completes.
//
// It reads as a short terminal transcript: each line prints on its own delay,
// the line still in flight carries cycling dots, and a block cursor blinks
// after the last one. Pure CSS (see .term-* in globals.css), so this stays a
// server component and paints with the first byte of the shell. The delays
// are spaced so the whole transcript is on screen inside a second — most
// loads resolve before the last line, and the ones that do not are exactly
// the ones that need something to look at.
const LINES: { text: string; delay: number; done?: boolean }[] = [
  { text: "buy side terminal", delay: 0, done: true },
  { text: "connecting to market feed", delay: 250, done: true },
  { text: "fetching live market data", delay: 600 },
];

export default function Loading() {
  return (
    <div
      className="flex min-h-[50vh] items-center justify-center px-4"
      role="status"
      aria-live="polite"
      aria-label="Fetching live market data"
    >
      <div className="w-full max-w-[22rem] font-mono text-[12px] leading-[1.9] tracking-[0.04em] text-[var(--dim)]">
        {LINES.map((line, i) => {
          const last = i === LINES.length - 1;
          return (
            <div
              key={line.text}
              className="term-line whitespace-nowrap"
              style={{ animationDelay: `${line.delay}ms` }}
            >
              <span className="text-[var(--amber)]" aria-hidden="true">
                {i === 0 ? "▮" : ">"}
              </span>{" "}
              <span className={last ? "term-dots text-[var(--foreground)]" : undefined}>
                {line.text}
              </span>
              {line.done && !last && (
                <span className="text-[var(--faint)]"> ... ok</span>
              )}
            </div>
          );
        })}
        <div
          className="term-line"
          style={{ animationDelay: `${LINES[LINES.length - 1].delay + 150}ms` }}
          aria-hidden="true"
        >
          <span className="text-[var(--amber)]">&gt;</span>{" "}
          <span className="term-cursor text-[var(--amber)]">▮</span>
        </div>
      </div>
    </div>
  );
}
