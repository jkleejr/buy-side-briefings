import { getChartSeries, getQuote } from "@/lib/markets";
import type { ChartPoint } from "@/lib/chart-ranges";
import Panel from "./panel";
import TechStocksClient, {
  type TechAsset,
  type TechQuote,
} from "./tech-stocks-client";

export const revalidate = 60;

// Magnificent 7 plus AVGO — the eight names that move the index most.
const ASSETS: TechAsset[] = [
  { symbol: "AAPL", label: "AAPL", sublabel: "Apple" },
  { symbol: "MSFT", label: "MSFT", sublabel: "Microsoft" },
  { symbol: "NVDA", label: "NVDA", sublabel: "Nvidia" },
  { symbol: "GOOGL", label: "GOOGL", sublabel: "Alphabet" },
  { symbol: "AMZN", label: "AMZN", sublabel: "Amazon" },
  { symbol: "META", label: "META", sublabel: "Meta" },
  { symbol: "TSLA", label: "TSLA", sublabel: "Tesla" },
  { symbol: "AVGO", label: "AVGO", sublabel: "Broadcom" },
];

const INITIAL_RANGE = "5D" as const;

/**
 * The eight mega-cap tech names that move the index most. Each card shows
 * live price, day %, and a 5D-default sparkline that hovers for date/price.
 * Shared timeframe selector at top changes every chart at once.
 */
export default async function TechStocksPanel() {
  const [seriesArr, quoteArr] = await Promise.all([
    Promise.all(ASSETS.map((a) => getChartSeries(a.symbol, INITIAL_RANGE))),
    Promise.all(ASSETS.map((a) => getQuote(a.symbol))),
  ]);

  const initialSeriesBySymbol: Record<string, ChartPoint[]> = {};
  const quoteBySymbol: Record<string, TechQuote> = {};
  ASSETS.forEach((a, i) => {
    initialSeriesBySymbol[a.symbol] = seriesArr[i];
    quoteBySymbol[a.symbol] = {
      price: quoteArr[i]?.price ?? null,
      changePct: quoteArr[i]?.changePct ?? null,
    };
  });

  return (
    <Panel
      code="TECH"
      title="Major Tech Stocks · Mag 7 + AVGO"
      learn="The eight mega-cap tech names that dominate the S&P 500 (~35% of the index by weight). Watching them together reveals leadership: when MSFT/AAPL/GOOGL hold up but NVDA/AMD/AVGO sell off, the market is rotating to quality within tech; when all eight sell off together, it's risk-off. Hover any ticker for what the company does and the key narratives driving it. Refreshes every 60 seconds."
      meta={<span>YAHOO · 60s</span>}
    >
      <TechStocksClient
        assets={ASSETS}
        initialRange={INITIAL_RANGE}
        initialSeriesBySymbol={initialSeriesBySymbol}
        quoteBySymbol={quoteBySymbol}
      />
    </Panel>
  );
}
