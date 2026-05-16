import { getRecentMentionsByTicker, getWatchlist, type RecentMention } from "@/lib/data";
import { getChartSeries, getQuote } from "@/lib/markets";
import type { ChartPoint } from "@/lib/chart-ranges";
import Panel from "@/components/panel";
import WatchlistCards, { type WatchQuote } from "@/components/watchlist-cards";

export const metadata = { title: "Watchlist — Buy-Side Briefings" };
export const revalidate = 120;

const INITIAL_RANGE = "5D" as const;

export default async function WatchlistPage() {
  const entries = getWatchlist();
  const symbols = entries.map((e) => e.symbol);
  const mentionsMap = getRecentMentionsByTicker(symbols);

  // Parallel: live quote + initial-range series per ticker.
  const [quotes, sparks] = await Promise.all([
    Promise.all(entries.map((e) => getQuote(e.symbol))),
    Promise.all(entries.map((e) => getChartSeries(e.symbol, INITIAL_RANGE))),
  ]);

  // Convert arrays → maps keyed by symbol for the client component.
  const seriesBySymbol: Record<string, ChartPoint[]> = {};
  const quoteBySymbol: Record<string, WatchQuote> = {};
  const mentionsByKey: Record<string, RecentMention | undefined> = {};
  entries.forEach((e, i) => {
    seriesBySymbol[e.symbol] = sparks[i];
    quoteBySymbol[e.symbol] = {
      price: quotes[i]?.price ?? null,
      changePct: quotes[i]?.changePct ?? null,
      avg50pct: quotes[i]?.avg50pct ?? null,
    };
    mentionsByKey[e.symbol] = mentionsMap.get(e.symbol);
  });

  return (
    <div className="space-y-1">
      <header className="space-y-1 px-1 pb-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Watchlist
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          {entries.length} tickers · live quotes · hover-readable sparklines · briefing mentions
        </p>
      </header>

      <Panel code="HOW" title="How this list is built">
        <p className="p-2 font-mono text-[11px] leading-snug text-[var(--dim)]">
          Edit{" "}
          <code className="text-[var(--amber)]">data/watchlist.json</code> in the repo to
          add or remove names. Pick a timeframe to refresh every card&apos;s sparkline.
          Hover any chart for the day · date · time · price popup. The latest briefing
          that mentioned the ticker (in either Watchlist Mentions or Don&apos;t Buy) is
          linked at the bottom of each card.
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
        <WatchlistCards
          entries={entries}
          initialRange={INITIAL_RANGE}
          initialSeriesBySymbol={seriesBySymbol}
          quoteBySymbol={quoteBySymbol}
          mentions={mentionsByKey}
        />
      )}
    </div>
  );
}
