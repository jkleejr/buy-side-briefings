import { getLatestMarketsVerdict } from "@/lib/data";
import { getQuote } from "@/lib/markets";
import { formatPct } from "@/lib/utils";

export const metadata = { title: "Watchlist — Buy-Side Briefings" };
export const revalidate = 120;

const CORE_TICKERS = [
  "NVDA",
  "GOOGL",
  "AAPL",
  "MSFT",
  "META",
  "AMZN",
  "TSLA",
  "AMD",
  "TSM",
  "AVGO",
];

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "text-emerald-400",
  negative: "text-red-400",
  neutral: "text-zinc-400",
};

export default async function WatchlistPage() {
  const verdict = getLatestMarketsVerdict();
  const mentions = verdict?.watchlist_mentions ?? [];
  const dontBuy = new Set((verdict?.dont_buy ?? []).map((d) => d.ticker));

  const quotes = await Promise.all(CORE_TICKERS.map((t) => getQuote(t)));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Watchlist</h1>
        <p className="text-sm text-zinc-400">
          Mega-cap names with their latest live quote and most recent commentary from the briefings.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/40 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3 text-left">Ticker</th>
              <th className="px-4 py-3 text-right">Live</th>
              <th className="px-4 py-3 text-right">Change</th>
              <th className="px-4 py-3 text-left">Briefing note</th>
            </tr>
          </thead>
          <tbody>
            {CORE_TICKERS.map((ticker, i) => {
              const q = quotes[i];
              const mention = mentions.find((m) => m.ticker === ticker);
              const flagged = dontBuy.has(ticker);
              const up = (q?.changePct ?? 0) > 0;
              const down = (q?.changePct ?? 0) < 0;
              return (
                <tr key={ticker} className="border-b border-zinc-800">
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium text-zinc-100">{ticker}</span>
                    {flagged && (
                      <span className="ml-2 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-red-400">
                        Don&apos;t buy
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-200">
                    {q?.price === null || q?.price === undefined
                      ? "—"
                      : q.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </td>
                  <td
                    className={
                      up
                        ? "px-4 py-3 text-right font-mono text-emerald-400"
                        : down
                          ? "px-4 py-3 text-right font-mono text-red-400"
                          : "px-4 py-3 text-right font-mono text-zinc-500"
                    }
                  >
                    {q?.changePct === null || q?.changePct === undefined
                      ? "—"
                      : formatPct(q.changePct)}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {mention ? (
                      <span className={SENTIMENT_COLOR[mention.sentiment] ?? ""}>
                        {mention.note}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
