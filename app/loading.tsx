// Route-level loading state. Server pages fetch live quotes (Yahoo/FRED) during
// render, which can take a beat on a cold ISR miss — without this the page is
// blank until the whole render completes. Shows a terminal-style placeholder.
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 font-mono">
      <div className="text-[11px] uppercase tracking-widest text-[var(--amber)]">
        <span className="term-blink">▮</span> Loading terminal…
      </div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--dim)]">
        Fetching live market data
      </div>
    </div>
  );
}
