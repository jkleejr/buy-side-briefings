import YahooFinance from "yahoo-finance2";
import { formatPct, nowUtcHM } from "@/lib/utils";
import { TICKER_TIPS } from "@/lib/glossary";
import Panel from "./panel";
import Tooltip from "./tooltip";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

type Idx = { symbol: string; label: string };
type Region = { name: string; indices: Idx[] };

const REGIONS: Region[] = [
  {
    name: "Asia",
    indices: [
      { symbol: "^N225", label: "Nikkei 225" },
      { symbol: "^HSI", label: "Hang Seng" },
      { symbol: "000001.SS", label: "Shanghai" },
      { symbol: "^KS11", label: "KOSPI" },
    ],
  },
  {
    name: "Europe",
    indices: [
      { symbol: "^GDAXI", label: "DAX" },
      { symbol: "^FTSE", label: "FTSE 100" },
      { symbol: "^FCHI", label: "CAC 40" },
      { symbol: "^STOXX50E", label: "Euro Stoxx 50" },
    ],
  },
  {
    name: "EM & Americas",
    indices: [
      { symbol: "^NSEI", label: "Nifty 50" },
      { symbol: "^BVSP", label: "Bovespa" },
      { symbol: "^GSPTSE", label: "TSX" },
    ],
  },
];

export const revalidate = 60;

type YQ = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
};

export default async function GlobalMarketsPanel() {
  const allSymbols = REGIONS.flatMap((r) => r.indices.map((i) => i.symbol));
  let bySymbol = new Map<string, YQ>();
  try {
    const quotes = (await yahooFinance.quote(allSymbols)) as YQ | YQ[];
    const arr: YQ[] = Array.isArray(quotes) ? quotes : [quotes];
    bySymbol = new Map(arr.filter((q) => q.symbol).map((q) => [q.symbol as string, q]));
  } catch (err) {
    console.error("[global-markets] fetch failed:", err);
  }

  return (
    <Panel asOf={nowUtcHM()}
      code="GLBL"
      title="Global Markets · Overnight & Sessions"
      learn="The major non-US stock indices, grouped by region. Useful as overnight read: by the time the US market opens at 9:30am ET, Asia has already closed and Europe is mid-session — these tell you what futures will do at the open. Click the title for the full Global Markets detail page with per-region charts."
      href="/global"
      meta={<span>YAHOO · 60s</span>}
    >
      <div className="grid grid-cols-1 divide-y divide-[var(--border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {REGIONS.map((region) => (
          <div key={region.name} className="flex flex-col">
            <div className="border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
              {region.name}
            </div>
            <table className="w-full font-mono text-[11px]">
              <tbody>
                {region.indices.map((idx) => {
                  const q = bySymbol.get(idx.symbol);
                  const price = q?.regularMarketPrice ?? null;
                  const pct = q?.regularMarketChangePercent ?? null;
                  const up = (pct ?? 0) > 0;
                  const down = (pct ?? 0) < 0;
                  const tip = TICKER_TIPS[idx.symbol] ?? TICKER_TIPS[idx.label] ?? "";
                  const pctCls = up
                    ? "text-[var(--up)]"
                    : down
                      ? "text-[var(--down)]"
                      : "text-[var(--dim)]";
                  return (
                    <tr key={idx.symbol} className="border-t border-[var(--border)] first:border-t-0">
                      <td className="px-2 py-0.5 text-[var(--foreground)]">
                        {tip ? <Tooltip text={tip}>{idx.label}</Tooltip> : idx.label}
                      </td>
                      <td className="px-2 py-0.5 text-right text-[var(--foreground)]">
                        {price === null
                          ? "—"
                          : price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </td>
                      <td className={`px-2 py-0.5 text-right ${pctCls}`}>
                        {pct === null ? "—" : formatPct(pct)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </Panel>
  );
}
