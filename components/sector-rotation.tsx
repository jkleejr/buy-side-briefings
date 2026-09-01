import YahooFinance from "yahoo-finance2";
import { formatPct } from "@/lib/utils";
import Panel from "./panel";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

const SECTORS = [
  { symbol: "XLK", label: "Tech" },
  { symbol: "XLF", label: "Financials" },
  { symbol: "XLE", label: "Energy" },
  { symbol: "XLV", label: "Health" },
  { symbol: "XLY", label: "Cons Disc" },
  { symbol: "XLP", label: "Cons Stpl" },
  { symbol: "XLI", label: "Indust" },
  { symbol: "XLU", label: "Utilities" },
  { symbol: "XLB", label: "Materials" },
  { symbol: "XLRE", label: "Real Est" },
  { symbol: "XLC", label: "Comms" },
];

export const revalidate = 300;

type Row = { label: string; symbol: string; pct: number | null; m1: number | null };

export default async function SectorRotation() {
  const symbols = SECTORS.map((s) => s.symbol);
  let rows: Row[] = SECTORS.map((s) => ({
    label: s.label,
    symbol: s.symbol,
    pct: null,
    m1: null,
  }));

  try {
    type YQ = {
      symbol?: string;
      regularMarketChangePercent?: number;
      fiftyDayAverageChangePercent?: number;
    };
    const quotes = (await yahooFinance.quote(symbols)) as YQ | YQ[];
    const arr: YQ[] = Array.isArray(quotes) ? quotes : [quotes];
    rows = SECTORS.map((s) => {
      const q = arr.find((r) => r.symbol === s.symbol);
      return {
        label: s.label,
        symbol: s.symbol,
        pct: q?.regularMarketChangePercent ?? null,
        m1: q?.fiftyDayAverageChangePercent ?? null,
      };
    });
  } catch (err) {
    console.error("[sector-rotation] fetch failed:", err);
  }

  rows.sort((a, b) => (b.pct ?? -999) - (a.pct ?? -999));

  return (
    <Panel title="Sector Rotation · 11 ETFs" meta={<span>SORT ▾ TODAY</span>}>
      <table className="w-full font-mono text-[11px]">
        <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
          <tr>
            <th className="px-2 py-1 text-left font-normal">Sector</th>
            <th className="px-2 py-1 text-left font-normal">ETF</th>
            <th className="px-2 py-1 text-right font-normal">Today</th>
            <th className="px-2 py-1 text-right font-normal">~50d</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const upToday = (r.pct ?? 0) > 0;
            const downToday = (r.pct ?? 0) < 0;
            const upTrend = (r.m1 ?? 0) > 0;
            const downTrend = (r.m1 ?? 0) < 0;
            return (
              <tr key={r.symbol} className="border-t border-[var(--border)]">
                <td className="px-2 py-0.5 text-[var(--foreground)]">
                  {r.label}
                </td>
                <td className="px-2 py-0.5 text-[var(--amber-dim)]">
                  {r.symbol}
                </td>
                <td
                  className={
                    upToday
                      ? "px-2 py-0.5 text-right text-[var(--up)]"
                      : downToday
                        ? "px-2 py-0.5 text-right text-[var(--down)]"
                        : "px-2 py-0.5 text-right text-[var(--dim)]"
                  }
                >
                  {r.pct === null ? "—" : formatPct(r.pct)}
                </td>
                <td
                  className={
                    upTrend
                      ? "px-2 py-0.5 text-right text-[var(--up)]"
                      : downTrend
                        ? "px-2 py-0.5 text-right text-[var(--down)]"
                        : "px-2 py-0.5 text-right text-[var(--dim)]"
                  }
                >
                  {r.m1 === null ? "—" : formatPct(r.m1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
