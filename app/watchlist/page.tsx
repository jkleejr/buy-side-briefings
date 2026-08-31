import { getWatchlist } from "@/lib/data";
import { getQuote } from "@/lib/markets";
import { formatPct } from "@/lib/utils";
import Panel from "@/components/panel";
import TickerSearch from "@/components/ticker-search";
import LevelsChart from "@/components/levels-chart";

// Curated additions to consider beyond the user-edited watchlist. Grouped by
// theme. Edit freely. Anything already in data/watchlist.json is auto-filtered
// out at render time so suggestions don't duplicate.
const SUGGESTIONS: Array<{
  category: string;
  description: string;
  tickers: Array<{ symbol: string; label: string; why: string }>;
}> = [
  {
    category: "AI · Semis depth",
    description:
      "Beyond NVDA and AMD — the picks-and-shovels of the AI capex cycle.",
    tickers: [
      { symbol: "MU", label: "Micron Technology", why: "Memory cycle bellwether — HBM demand from AI capex" },
      { symbol: "ARM", label: "Arm Holdings", why: "IP licensing across mobile, auto, datacenter — royalty-on-everything model" },
      { symbol: "ASML", label: "ASML", why: "EUV lithography monopoly — required for every advanced node" },
    ],
  },
  {
    category: "Quantum · speculative",
    description:
      "Pure-play quantum-compute exposure. High volatility, narrative-driven, small caps.",
    tickers: [
      { symbol: "IONQ", label: "IonQ", why: "Trapped-ion quantum hardware — the most-watched pure-play" },
      { symbol: "RGTI", label: "Rigetti Computing", why: "Superconducting quantum — high beta to quantum-narrative news" },
      { symbol: "QBTS", label: "D-Wave Quantum", why: "Quantum annealing — commercial use cases earliest, niche but real" },
    ],
  },
  {
    category: "Crypto exposure via equities",
    description:
      "Get crypto-cycle exposure without holding BTC directly. Useful in tax-advantaged accounts.",
    tickers: [
      { symbol: "COIN", label: "Coinbase", why: "Public proxy for crypto adoption + retail trading volumes" },
      { symbol: "MSTR", label: "Strategy (MicroStrategy)", why: "Largest corporate BTC treasury — behaves like leveraged BTC" },
      { symbol: "HOOD", label: "Robinhood", why: "Retail trading + crypto + rates exposure; high beta to risk sentiment" },
    ],
  },
  {
    category: "Defensive quality",
    description:
      "Boring compounders that hold up when the broader tape gets ugly. Diversifies tech-heavy book.",
    tickers: [
      { symbol: "COST", label: "Costco", why: "Best-in-class consumer staples — defensive growth that holds in downturns" },
      { symbol: "V", label: "Visa", why: "Payments duopoly with MA — quasi-utility cash machine" },
      { symbol: "BRK-B", label: "Berkshire Hathaway B", why: "Buffett's holding company — quality value + insurance + cash hoard" },
    ],
  },
];

export const metadata = { title: "Watchlist" };
export const revalidate = 120;

export default async function WatchlistPage() {
  const entries = getWatchlist();
  const symbols = entries.map((e) => e.symbol);

  // The switcher shows raw tickers, which is fine for NVDA or AMD but useless
  // for a foreign listing like "000660.KS". Label only the symbols that aren't
  // plain tickers (anything with a dot), so those read as "SK Hynix" / "Samsung"
  // while the US names stay compact.
  const chartLabels = Object.fromEntries(
    entries.filter((e) => e.symbol.includes(".")).map((e) => [e.symbol, e.label]),
  );

  // The personal note per ticker, shown top-right of the chart for whichever
  // symbol is selected.
  const chartNotes = Object.fromEntries(
    entries.filter((e) => e.note).map((e) => [e.symbol, e.note as string]),
  );

  // Filter suggestions to drop any tickers already in the user's watchlist.
  const ownedSet = new Set(symbols);
  const suggestionCategories = SUGGESTIONS.map((cat) => ({
    ...cat,
    tickers: cat.tickers.filter((t) => !ownedSet.has(t.symbol)),
  })).filter((cat) => cat.tickers.length > 0);
  const suggestionSymbols = suggestionCategories.flatMap((c) =>
    c.tickers.map((t) => t.symbol),
  );

  const suggestionQuotes = await Promise.all(
    suggestionSymbols.map((s) => getQuote(s)),
  );
  const suggestionQuoteBySymbol = new Map(
    suggestionSymbols.map((s, i) => [s, suggestionQuotes[i]]),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-1">
      <header className="space-y-1 px-1 pb-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Watchlist
        </h1>
      </header>

      {/* Search any ticker/company and add it to your (browser-stored) watchlist. */}
      <TickerSearch />

      {entries.length > 0 && (
        <Panel title="Support & resistance levels">
          <div className="p-2">
            <p className="pb-2 font-mono text-[11px] leading-snug text-[var(--dim)]">
              Daily candles with the levels the price keeps turning at. A level is
              derived from the bars themselves — a swing pivot is a bar that is the high
              or low of the bars around it, pivots at effectively the same price are one
              level, and how many times it was tested is its strength. So &ldquo;tested
              4×&rdquo; means the market turned there four times in the window on screen.
              Nothing is hand-drawn. Hover any bar for its date, price and volume.
            </p>
            {/* Levels on by default here — the panel is titled for them and
                the paragraph above explains them. */}
            <LevelsChart
              symbols={symbols}
              initialSymbol={symbols[0]}
              labels={chartLabels}
              notes={chartNotes}
              defaultLevels
            />
          </div>
        </Panel>
      )}

      {entries.length === 0 && (
        <Panel code="EMPTY" title="No tickers configured">
          <div className="p-4 text-center font-mono text-[11px] text-[var(--dim)]">
            Add tickers to{" "}
            <code className="text-[var(--amber)]">data/watchlist.json</code> and commit.
          </div>
        </Panel>
      )}

      {suggestionCategories.length > 0 && (
        <Panel title="Suggested additions">
          <div className="divide-y divide-[var(--border)]">
            {suggestionCategories.map((cat) => (
              <div key={cat.category} className="p-3">
                <div className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber)]">
                  {cat.category}
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-[var(--dim)]">
                  {cat.description}
                </p>
                <table className="mt-2 w-full font-mono text-[11px]">
                  <tbody>
                    {cat.tickers.map((t) => {
                      const q = suggestionQuoteBySymbol.get(t.symbol);
                      const price = q?.price ?? null;
                      const pct = q?.changePct ?? null;
                      const up = (pct ?? 0) > 0;
                      const down = (pct ?? 0) < 0;
                      const pctCls = up
                        ? "text-[var(--up)]"
                        : down
                          ? "text-[var(--down)]"
                          : "text-[var(--dim)]";
                      return (
                        <tr
                          key={t.symbol}
                          className="border-t border-[var(--border)] align-top"
                        >
                          <td className="w-16 px-2 py-1 text-[var(--amber-dim)]">
                            {t.symbol}
                          </td>
                          <td className="w-40 px-2 py-1 text-[var(--foreground)]">
                            {t.label}
                          </td>
                          <td className="px-2 py-1 text-[var(--dim)]">{t.why}</td>
                          <td className="w-20 px-2 py-1 text-right text-[var(--foreground)]">
                            {price === null
                              ? "—"
                              : `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                          </td>
                          <td className={`w-20 px-2 py-1 text-right ${pctCls}`}>
                            {pct === null ? "—" : formatPct(pct)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
