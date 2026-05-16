import { getChartSeries, getQuote } from "@/lib/markets";
import { TICKER_TIPS } from "@/lib/glossary";
import Panel from "./panel";
import SpyChartClient from "./spy-chart-client";

export const revalidate = 60;

const INITIAL_RANGE = "3M" as const;
const SYMBOL = "SPY";

export default async function SpyChart() {
  const [series, quote] = await Promise.all([
    getChartSeries(SYMBOL, INITIAL_RANGE),
    getQuote(SYMBOL),
  ]);

  return (
    <Panel
      code="SPY"
      title="S&P 500 ETF"
      learn={TICKER_TIPS["SPY"]}
      meta={<span>NYSE ARCA</span>}
    >
      <SpyChartClient
        initialRange={INITIAL_RANGE}
        initialSeries={series}
        initialQuote={{
          price: quote?.price ?? null,
          changePct: quote?.changePct ?? null,
        }}
        symbol={SYMBOL}
        color="#22d3ee"
      />
    </Panel>
  );
}
