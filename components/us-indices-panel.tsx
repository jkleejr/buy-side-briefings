import { getChartSeries, getQuote } from "@/lib/markets";
import { nowUtcHM } from "@/lib/utils";
import type { ChartPoint } from "@/lib/chart-ranges";
import Panel from "./panel";
import UsIndicesClient, {
  type IndexAsset,
  type IndexQuote,
} from "./us-indices-client";

export const revalidate = 60;

const DEFAULT_ASSETS: IndexAsset[] = [
  { symbol: "SPY", label: "SPY", sublabel: "S&P 500", color: "#22d3ee" },
  { symbol: "QQQ", label: "QQQ", sublabel: "Nasdaq 100", color: "#fbbf24" },
  { symbol: "IWM", label: "IWM", sublabel: "Russell 2000", color: "#84cc16" },
];

const INITIAL_RANGE = "3M" as const;

type Props = {
  assets?: IndexAsset[];
  code?: string;
  title?: string;
};

/**
 * Major US-index ETFs side-by-side with a shared timeframe selector.
 * Defaults to SPY · QQQ · IWM but can be passed a custom asset list so
 * the home page can render a SPY-only variant while the /indices page
 * keeps the full set.
 */
export default async function UsIndicesPanel({
  assets = DEFAULT_ASSETS,
  code = "INDX",
  title = "US Indices · SPY · QQQ · IWM",
}: Props = {}) {
  const [seriesArr, quoteArr] = await Promise.all([
    Promise.all(assets.map((a) => getChartSeries(a.symbol, INITIAL_RANGE))),
    Promise.all(assets.map((a) => getQuote(a.symbol))),
  ]);

  const initialSeriesBySymbol: Record<string, ChartPoint[]> = {};
  const quoteBySymbol: Record<string, IndexQuote> = {};
  assets.forEach((a, i) => {
    initialSeriesBySymbol[a.symbol] = seriesArr[i];
    quoteBySymbol[a.symbol] = {
      price: quoteArr[i]?.price ?? null,
      changePct: quoteArr[i]?.changePct ?? null,
    };
  });

  return (
    <Panel asOf={nowUtcHM()}
      code={code}
      title={title}
      meta={<span>NYSE ARCA · YAHOO</span>}
    >
      <UsIndicesClient
        assets={assets}
        initialRange={INITIAL_RANGE}
        initialSeriesBySymbol={initialSeriesBySymbol}
        quoteBySymbol={quoteBySymbol}
      />
    </Panel>
  );
}
