import { getChartSeries, getQuote } from "@/lib/markets";
import type { ChartPoint } from "@/lib/chart-ranges";
import Panel from "./panel";
import UsIndicesClient, {
  type IndexAsset,
  type IndexQuote,
} from "./us-indices-client";

export const revalidate = 60;

const ASSETS: IndexAsset[] = [
  { symbol: "SPY", label: "SPY", sublabel: "S&P 500", color: "#22d3ee" },
  { symbol: "QQQ", label: "QQQ", sublabel: "Nasdaq 100", color: "#fbbf24" },
  { symbol: "IWM", label: "IWM", sublabel: "Russell 2000", color: "#84cc16" },
];

const INITIAL_RANGE = "3M" as const;

/**
 * Three major US-index ETFs side-by-side with a shared timeframe selector.
 * Initial 3M data is server-fetched in parallel; subsequent range switches
 * re-fetch all three via /api/chart from the client wrapper.
 */
export default async function UsIndicesPanel() {
  const [seriesArr, quoteArr] = await Promise.all([
    Promise.all(ASSETS.map((a) => getChartSeries(a.symbol, INITIAL_RANGE))),
    Promise.all(ASSETS.map((a) => getQuote(a.symbol))),
  ]);

  const initialSeriesBySymbol: Record<string, ChartPoint[]> = {};
  const quoteBySymbol: Record<string, IndexQuote> = {};
  ASSETS.forEach((a, i) => {
    initialSeriesBySymbol[a.symbol] = seriesArr[i];
    quoteBySymbol[a.symbol] = {
      price: quoteArr[i]?.price ?? null,
      changePct: quoteArr[i]?.changePct ?? null,
    };
  });

  return (
    <Panel
      code="INDX"
      title="US Indices · SPY · QQQ · IWM"
      learn="The three most-watched US equity benchmarks on one row: SPY (S&P 500 — the broad market), QQQ (Nasdaq 100 — tech-heavy growth), IWM (Russell 2000 — small-cap domestic economy). Watching all three reveals what SPY alone hides — when SPY rises but IWM lags, the rally is narrow; when IWM leads, the rally is broad."
      meta={<span>NYSE ARCA · YAHOO</span>}
    >
      <UsIndicesClient
        assets={ASSETS}
        initialRange={INITIAL_RANGE}
        initialSeriesBySymbol={initialSeriesBySymbol}
        quoteBySymbol={quoteBySymbol}
      />
    </Panel>
  );
}
