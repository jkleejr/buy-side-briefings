import YahooFinance from "yahoo-finance2";
import { formatPct } from "@/lib/utils";
import SourceLine, { YAHOO, DELAYED } from "./source-line";

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
    <>
    <section className="border border-[var(--border)] bg-[var(--panel)]">
      <div className="grid grid-cols-1 divide-y divide-[var(--border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {REGIONS.map((region) => (
          <div key={region.name} className="flex flex-col">
            <div className="border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-[var(--amber)]">
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
                  const pctCls = up
                    ? "text-[var(--up)]"
                    : down
                      ? "text-[var(--down)]"
                      : "text-[var(--dim)]";
                  return (
                    <tr key={idx.symbol} className="border-t border-[var(--border)] first:border-t-0">
                      <td className="px-2 py-1 text-[var(--foreground)]">
                        {idx.label}
                      </td>
                      <td className="px-2 py-1 text-right text-[var(--foreground)]">
                        {price === null
                          ? "—"
                          : price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </td>
                      <td className={`px-2 py-1 text-right ${pctCls}`}>
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
    </section>
    <SourceLine left={YAHOO} right={DELAYED} />
    </>
  );
}
