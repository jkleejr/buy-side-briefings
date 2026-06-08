import { getChartSeries, getQuote } from "@/lib/markets";
import type { ChartPoint } from "@/lib/chart-ranges";
import Panel from "./panel";
import UsIndicesClient, {
  type IndexAsset,
  type IndexQuote,
} from "./us-indices-client";

export const revalidate = 60;

const DEFAULT_ASSETS: IndexAsset[] = [
  { symbol: "SPY", label: "SPY", sublabel: "S&P 500", color: "#38bdf8" },
  { symbol: "QQQ", label: "QQQ", sublabel: "Nasdaq 100", color: "#ffb224" },
  { symbol: "IWM", label: "IWM", sublabel: "Russell 2000", color: "#84cc16" },
];

const DEFAULT_LEARN =
  "The three most-watched US equity benchmarks on one row: SPY (S&P 500 — the broad market), QQQ (Nasdaq 100 — tech-heavy growth), IWM (Russell 2000 — small-cap domestic economy). Watching all three reveals what SPY alone hides — when SPY rises but IWM lags, the rally is narrow; when IWM leads, the rally is broad.";

const INITIAL_RANGE = "3M" as const;

type Props = {
  assets?: IndexAsset[];
  code?: string;
  title?: string;
  learn?: string;
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
  learn = DEFAULT_LEARN,
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
    <Panel
      code={code}
      title={title}
      learn={learn}
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
