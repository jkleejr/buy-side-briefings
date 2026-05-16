import { getChartSeries, getQuote, type DailyClose } from "@/lib/markets";
import Panel from "./panel";
import MultiAssetSparkPanel from "./multi-asset-spark-panel";

export const revalidate = 60;

const CRYPTOS = [
  { symbol: "BTC-USD", label: "BTC" },
  { symbol: "ETH-USD", label: "ETH" },
];

const INITIAL_RANGE = "5D" as const;

export default async function CryptoPanel() {
  const [seriesArr, quoteArr] = await Promise.all([
    Promise.all(CRYPTOS.map((c) => getChartSeries(c.symbol, INITIAL_RANGE))),
    Promise.all(CRYPTOS.map((c) => getQuote(c.symbol))),
  ]);

  const seriesMap: Record<string, DailyClose[]> = {};
  const quoteMap: Record<string, { price: number | null; changePct: number | null }> = {};
  CRYPTOS.forEach((c, i) => {
    seriesMap[c.symbol] = seriesArr[i];
    quoteMap[c.symbol] = {
      price: quoteArr[i]?.price ?? null,
      changePct: quoteArr[i]?.changePct ?? null,
    };
  });

  return (
    <Panel
      code="CRYPT"
      title="Crypto"
      learn="Live BTC and ETH prices from Yahoo Finance (a blended price across major exchanges). Pick a timeframe to view different windows of price action. Click the title to open the full crypto detail page. Refreshes every 60 seconds."
      href="/crypto"
      meta={<span>YAHOO</span>}
    >
      <MultiAssetSparkPanel
        assets={CRYPTOS}
        initialRange={INITIAL_RANGE}
        initialSeriesBySymbol={seriesMap}
        initialQuoteBySymbol={quoteMap}
        priceDigits={0}
      />
    </Panel>
  );
}
