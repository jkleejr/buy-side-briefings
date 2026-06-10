import { getChartSeries, getQuote, type DailyClose } from "@/lib/markets";
import { nowUtcHM } from "@/lib/utils";
import Panel from "./panel";
import MultiAssetSparkPanel from "./multi-asset-spark-panel";

export const revalidate = 60;

const METALS = [
  { symbol: "GLD", label: "GLD" },
  { symbol: "SLV", label: "SLV" },
];

const INITIAL_RANGE = "5D" as const;

export default async function MetalsPanel() {
  const [seriesArr, quoteArr] = await Promise.all([
    Promise.all(METALS.map((m) => getChartSeries(m.symbol, INITIAL_RANGE))),
    Promise.all(METALS.map((m) => getQuote(m.symbol))),
  ]);

  const seriesMap: Record<string, DailyClose[]> = {};
  const quoteMap: Record<string, { price: number | null; changePct: number | null }> = {};
  METALS.forEach((m, i) => {
    seriesMap[m.symbol] = seriesArr[i];
    quoteMap[m.symbol] = {
      price: quoteArr[i]?.price ?? null,
      changePct: quoteArr[i]?.changePct ?? null,
    };
  });

  return (
    <Panel asOf={nowUtcHM()}
      code="METAL"
      title="Metals"
      learn="Live GLD (gold ETF) and SLV (silver ETF) prices. Gold = classic inflation hedge and crisis asset. Silver = 'high-beta gold' (smaller market + industrial demand amplify moves). Click the title to open the full metals detail page. Refreshes every 60 seconds."
      href="/metals"
      meta={<span>YAHOO</span>}
    >
      <MultiAssetSparkPanel
        assets={METALS}
        initialRange={INITIAL_RANGE}
        initialSeriesBySymbol={seriesMap}
        initialQuoteBySymbol={quoteMap}
        priceDigits={2}
      />
    </Panel>
  );
}
