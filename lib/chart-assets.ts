// ---------------------------------------------------------------------------
// The assets the homepage chart can show, and how the picker groups them.
//
// Shared because two sides need it: the server gathers a quote for each symbol
// (so the picker can print a price beside every name) and the client renders
// the grouped menu. Keeping one list means the two can never disagree about
// which symbols exist.
// ---------------------------------------------------------------------------

export type ChartAssetGroup = { label: string; symbols: string[] };

export const CHART_ASSET_GROUPS: ChartAssetGroup[] = [
  { label: "Equities", symbols: ["^GSPC", "NVDA", "AAPL", "MU"] },
  {
    label: "Macro & commodities",
    symbols: ["BTC-USD", "^VIX", "DX-Y.NYB", "JPY=X", "GC=F", "CL=F"],
  },
  { label: "Global", symbols: ["^KS11", "000660.KS"] },
];

export const CHART_SYMBOLS: string[] = CHART_ASSET_GROUPS.flatMap((g) => g.symbols);

export const CHART_LABELS: Record<string, string> = {
  "^GSPC": "S&P 500",
  NVDA: "Nvidia",
  AAPL: "Apple",
  MU: "Micron",
  "BTC-USD": "Bitcoin",
  "^VIX": "VIX",
  // Same symbol the ticker strip and /macro use — one dollar number sitewide.
  // Named in full here because the picker has the room the old button row
  // didn't, and "Dollar" alone doesn't say which dollar index it is.
  "DX-Y.NYB": "US Dollar (DXY)",
  // Labelled as the pair, not "Yen", because the quote is dollars-per-yen: the
  // line going up is the yen getting *weaker*. "Yen ▲" would read backwards.
  "JPY=X": "USD/JPY",
  "GC=F": "Gold",
  // WTI front-month, which is the barrel the briefings quote ("WTI settled
  // $82.21"). Spelled out rather than "WTI" so the row stays readable to
  // someone who doesn't trade crude; the ticker is in the chart's source line.
  "CL=F": "Crude Oil",
  // Both Korean lines are quoted in won, unlike every other price chart here,
  // and both say so — a bare "570,000" or "3,240" reads as dollars sitting next
  // to Nvidia and Micron.
  "^KS11": "KOSPI (KRW)",
  "000660.KS": "SK Hynix (KRW)",
};
