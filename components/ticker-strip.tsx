import { getTickerStrip } from "@/lib/markets";
import { formatPct } from "@/lib/utils";
import { TICKER_TIPS } from "@/lib/glossary";
import Tooltip from "./tooltip";

export const revalidate = 60;

export default async function TickerStrip() {
  const quotes = await getTickerStrip();

  return (
    <div className="w-full border-b border-[var(--border)] bg-[var(--panel-head)]">
      <div className="panel-scroll mx-auto flex max-w-[1600px] flex-nowrap items-center gap-x-5 overflow-x-auto px-2 py-1 font-mono text-[11px] md:flex-wrap md:gap-y-1 md:overflow-visible">
        {quotes.map((q) => {
          const up = (q.changePct ?? 0) > 0;
          const down = (q.changePct ?? 0) < 0;
          const tip = TICKER_TIPS[q.symbol] ?? TICKER_TIPS[q.label] ?? "";
          const labelEl = (
            <span className="text-[var(--amber-dim)] uppercase tracking-wider">{q.label}</span>
          );
          return (
            <div key={q.symbol} className="flex shrink-0 items-baseline gap-2">
              {tip ? <Tooltip text={tip}>{labelEl}</Tooltip> : labelEl}
              <span className="text-[var(--foreground)]">
                {q.price === null
                  ? "—"
                  : q.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </span>
              <span
                className={
                  up
                    ? "text-[var(--up)]"
                    : down
                      ? "text-[var(--down)]"
                      : "text-[var(--dim)]"
                }
              >
                {q.changePct === null ? "—" : formatPct(q.changePct)}
              </span>
            </div>
          );
        })}
        <span className="ml-auto flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-widest text-[var(--dim)]">
          <span className="term-blink inline-block h-1.5 w-1.5 rounded-full bg-[var(--up)]" />
          YAHOO · 60s
        </span>
      </div>
    </div>
  );
}
