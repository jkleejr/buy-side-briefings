import Link from "next/link";
import { getRecentMentionsByTicker, getWatchlist } from "@/lib/data";
import { getChartSeries, getQuote } from "@/lib/markets";
import { formatPct, verdictColor } from "@/lib/utils";
import Panel from "@/components/panel";
import Sparkline from "@/components/sparkline";

export const metadata = { title: "Watchlist — Buy-Side Briefings" };
export const revalidate = 120;

export default async function WatchlistPage() {
  const entries = getWatchlist();
  const symbols = entries.map((e) => e.symbol);
  const mentions = getRecentMentionsByTicker(symbols);

  // Parallel data: live quote + 5-day series per ticker.
  const [quotes, sparks] = await Promise.all([
    Promise.all(entries.map((e) => getQuote(e.symbol))),
    Promise.all(entries.map((e) => getChartSeries(e.symbol, "5D"))),
  ]);

  return (
    <div className="space-y-1">
      <header className="space-y-1 px-1 pb-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Watchlist
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          {entries.length} tickers · live quotes · 5-day sparklines · briefing mentions
        </p>
      </header>

      <Panel
        code="HOW"
        title="How this list is built"
      >
        <p className="p-2 font-mono text-[11px] leading-snug text-[var(--dim)]">
          Edit{" "}
          <code className="text-[var(--amber)]">data/watchlist.json</code> in the repo to
          add or remove names. Each row shows live price + day % change · 50-day trend ·
          5-day sparkline (hover for any day&apos;s close) · the most recent briefing that
          mentioned the ticker (in either Watchlist Mentions or Don&apos;t Buy). Personal
          notes are optional per ticker.
        </p>
      </Panel>

      {entries.length === 0 ? (
        <Panel code="EMPTY" title="No tickers configured">
          <div className="p-4 text-center font-mono text-[11px] text-[var(--dim)]">
            Add tickers to{" "}
            <code className="text-[var(--amber)]">data/watchlist.json</code> and commit.
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
          {entries.map((e, i) => {
            const q = quotes[i];
            const series = sparks[i];
            const mention = mentions.get(e.symbol);
            const price = q?.price ?? null;
            const pct = q?.changePct ?? null;
            const m50 = q?.avg50pct ?? null;
            const up = (pct ?? 0) > 0;
            const down = (pct ?? 0) < 0;
            const pctCls = up
              ? "text-[var(--up)]"
              : down
                ? "text-[var(--down)]"
                : "text-[var(--dim)]";
            const m50Cls =
              m50 === null
                ? "text-[var(--dim)]"
                : m50 > 0
                  ? "text-[var(--up)]"
                  : "text-[var(--down)]";
            const sentimentCls = mention
              ? mention.sentiment === "positive"
                ? "text-[var(--up)]"
                : mention.sentiment === "negative"
                  ? "text-[var(--down)]"
                  : "text-[var(--foreground)]"
              : "text-[var(--dim)]";

            return (
              <Panel
                key={e.symbol}
                code={e.symbol}
                title={e.label}
                meta={
                  <span className="flex items-center gap-2">
                    <span className="text-[var(--foreground)]">
                      {price === null
                        ? "—"
                        : `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                    </span>
                    <span className={pctCls}>
                      {pct === null ? "—" : formatPct(pct)}
                    </span>
                  </span>
                }
              >
                <div className="flex flex-col gap-1.5 p-2">
                  {/* 50-day trend + optional note row */}
                  <div className="flex flex-wrap items-baseline gap-x-3 font-mono text-[10px] uppercase tracking-widest">
                    <span className="text-[var(--amber-dim)]">~50d:</span>
                    <span className={m50Cls}>
                      {m50 === null ? "—" : formatPct(m50)}
                    </span>
                    {e.note && (
                      <span className="ml-auto normal-case tracking-normal text-[11px] text-[var(--dim)]">
                        {e.note}
                      </span>
                    )}
                  </div>

                  {/* Sparkline */}
                  <div className="h-10 w-full">
                    <Sparkline points={series} positive={up} />
                  </div>

                  {/* Latest briefing mention */}
                  {mention ? (
                    <div className="border-t border-[var(--border)] pt-1.5">
                      <div className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
                        <Link
                          href={`/briefings/${mention.routine}/${mention.date}-${mention.window}`}
                          className={`${verdictColor(mention.verdict_code).text} hover:underline`}
                        >
                          ▸ {mention.verdict_label}
                        </Link>
                        <span className="text-[var(--dim)]">
                          {mention.date} {mention.window ?? ""}
                        </span>
                      </div>
                      <div className={`mt-0.5 font-mono text-[11px] leading-snug ${sentimentCls}`}>
                        {mention.note}
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-[var(--border)] pt-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--dim)]">
                      no briefing mention yet
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
