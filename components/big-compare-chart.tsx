import { getChartSeries } from "@/lib/markets";
import type { ChartPoint } from "@/lib/chart-ranges";
import Panel from "./panel";
import ComparePanelClient from "./compare-panel-client";

type AssetSpec = { symbol: string; label: string; color: string };

type Props = {
  /** Bracket code shown in the panel title bar (e.g., "BREADTH"). */
  code: string;
  /** Panel title. */
  title: string;
  /** Two (or more) assets to compare. */
  assets: AssetSpec[];
  /** Hover explanation shown on the panel title. */
  /** If true, plot the ratio (assets[0]/assets[1]) instead of two lines. */
  asRatio?: boolean;
  /** Right-side meta text. */
  metaLabel?: string;
};

const INITIAL_RANGE = "3M" as const;

/**
 * Server wrapper: fetches initial 3M data for each asset in parallel and
 * hands off to the client-side <ComparePanelClient> which manages range state.
 */
export default async function BigCompareChart({
  code,
  title,
  assets,
  asRatio,
  metaLabel,
}: Props) {
  const seriesArr = await Promise.all(
    assets.map((a) => getChartSeries(a.symbol, INITIAL_RANGE)),
  );
  const initialSeriesBySymbol: Record<string, ChartPoint[]> = {};
  assets.forEach((a, i) => {
    initialSeriesBySymbol[a.symbol] = seriesArr[i];
  });

  return (
    <Panel
      code={code}
      title={title}
      meta={metaLabel ? <span>{metaLabel}</span> : undefined}
    >
      <ComparePanelClient
        assets={assets}
        initialRange={INITIAL_RANGE}
        initialSeriesBySymbol={initialSeriesBySymbol}
        asRatio={asRatio}
      />
    </Panel>
  );
}
