import { getChartSeries, getQuote } from "@/lib/markets";
import Panel from "./panel";
import SpyChartClient from "./spy-chart-client";

type Props = {
  symbol: string;
  /** Bracket code shown in the panel title-bar (e.g., "BTC", "GLD"). */
  code: string;
  /** Panel title (e.g., "Bitcoin", "Gold ETF"). */
  title: string;
  /** Hex color for the line. */
  color: string;
  /** Learn-mode hover explanation. */
  /** Right-side meta text in the panel header (e.g., "COINBASE"). */
  metaLabel?: string;
  /** Currency prefix for the price header (default "$"). e.g. "₩" for KRW. */
  currencySymbol?: string;
};

const INITIAL_RANGE = "3M" as const;

/**
 * Server component: fetches initial 3M data for a single asset and delegates
 * to the existing client-side chart shell (price header + range selector +
 * AssetChart). Used on the dedicated detail pages (/crypto, /metals, etc.)
 * where we want a bigger chart per asset.
 */
export default async function BigAssetChart({
  symbol,
  code,
  title,
  color,
  metaLabel,
  currencySymbol,
}: Props) {
  const [series, quote] = await Promise.all([
    getChartSeries(symbol, INITIAL_RANGE),
    getQuote(symbol),
  ]);

  return (
    <Panel
      code={code}
      title={title}
      meta={metaLabel ? <span>{metaLabel}</span> : undefined}
    >
      <div className="min-h-[240px] sm:min-h-[320px]">
        <SpyChartClient
          initialRange={INITIAL_RANGE}
          initialSeries={series}
          initialQuote={{
            price: quote?.price ?? null,
            changePct: quote?.changePct ?? null,
          }}
          symbol={symbol}
          color={color}
          currencySymbol={currencySymbol}
        />
      </div>
    </Panel>
  );
}
