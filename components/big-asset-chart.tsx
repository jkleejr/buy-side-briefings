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
  learn?: string;
  /** Right-side meta text in the panel header (e.g., "COINBASE"). */
  metaLabel?: string;
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
  learn,
  metaLabel,
}: Props) {
  const [series, quote] = await Promise.all([
    getChartSeries(symbol, INITIAL_RANGE),
    getQuote(symbol),
  ]);

  return (
    <Panel
      code={code}
      title={title}
      learn={learn}
      meta={metaLabel ? <span>{metaLabel}</span> : undefined}
    >
      <div className="min-h-[320px]">
        <SpyChartClient
          initialRange={INITIAL_RANGE}
          initialSeries={series}
          initialQuote={{
            price: quote?.price ?? null,
            changePct: quote?.changePct ?? null,
          }}
          symbol={symbol}
          color={color}
        />
      </div>
    </Panel>
  );
}
