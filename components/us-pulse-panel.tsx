import YahooFinance from "yahoo-finance2";
import { formatPct, nowUtcHM } from "@/lib/utils";
import { TICKER_TIPS } from "@/lib/glossary";
import Panel from "./panel";
import Tooltip from "./tooltip";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

export const revalidate = 60;

type YQ = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
};

type Tile = {
  label: string;
  tipKey: string;
  primary: string;
  primaryCls: string;
  hint: string;
};

function pctCls(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || pct === 0) return "text-[var(--dim)]";
  return pct > 0 ? "text-[var(--up)]" : "text-[var(--down)]";
}

function fmtChgBps(change: number | null | undefined): string {
  if (change === null || change === undefined) return "—";
  // ^TYX is quoted in percentage points; 0.02 change = 2 bps.
  const bps = Math.round(change * 100);
  return `${bps > 0 ? "+" : ""}${bps} bp`;
}

function fmtPctSafe(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "—";
  return formatPct(pct);
}

function fmtPrice(p: number | null | undefined, digits = 2): string {
  if (p === null || p === undefined) return "—";
  return `$${p.toLocaleString("en-US", { maximumFractionDigits: digits })}`;
}

function fmtLevel(p: number | null | undefined, digits = 2): string {
  if (p === null || p === undefined) return "—";
  return p.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export default async function UsPulsePanel() {
  const symbols = ["^RUT", "RSP", "SPY", "HG=F", "HYG", "^TYX", "TLT"];
  let bySymbol = new Map<string, YQ>();
  try {
    const quotes = (await yahooFinance.quote(symbols)) as YQ | YQ[];
    const arr: YQ[] = Array.isArray(quotes) ? quotes : [quotes];
    bySymbol = new Map(arr.filter((q) => q.symbol).map((q) => [q.symbol as string, q]));
  } catch (err) {
    console.error("[us-pulse] fetch failed:", err);
  }

  const rut = bySymbol.get("^RUT");
  const rsp = bySymbol.get("RSP");
  const spy = bySymbol.get("SPY");
  const copper = bySymbol.get("HG=F");
  const hyg = bySymbol.get("HYG");
  const tyx = bySymbol.get("^TYX");
  const tlt = bySymbol.get("TLT");

  const rspPct = rsp?.regularMarketChangePercent ?? null;
  const spyPct = spy?.regularMarketChangePercent ?? null;
  const breadthBp =
    rspPct !== null && spyPct !== null ? Math.round((rspPct - spyPct) * 100) : null;
  const breadthCls = pctCls(breadthBp);
  const breadthStr =
    breadthBp === null ? "—" : `${breadthBp > 0 ? "+" : ""}${breadthBp} bp`;
  const breadthHint =
    rspPct !== null && spyPct !== null
      ? `RSP ${formatPct(rspPct)} · SPY ${formatPct(spyPct)}`
      : "RSP vs SPY";

  const tiles: Tile[] = [
    {
      label: "Russell 2K",
      tipKey: "^RUT",
      primary: fmtPctSafe(rut?.regularMarketChangePercent),
      primaryCls: pctCls(rut?.regularMarketChangePercent),
      hint: `Lvl ${fmtLevel(rut?.regularMarketPrice)} · small caps`,
    },
    {
      label: "RSP − SPY",
      tipKey: "RSP−SPY",
      primary: breadthStr,
      primaryCls: breadthCls,
      hint: breadthHint,
    },
    {
      label: "Copper",
      tipKey: "HG=F",
      primary: fmtPctSafe(copper?.regularMarketChangePercent),
      primaryCls: pctCls(copper?.regularMarketChangePercent),
      hint: `${fmtPrice(copper?.regularMarketPrice, 3)} /lb · Dr. Copper`,
    },
    {
      label: "HYG",
      tipKey: "HYG",
      primary: fmtPctSafe(hyg?.regularMarketChangePercent),
      primaryCls: pctCls(hyg?.regularMarketChangePercent),
      hint: `${fmtPrice(hyg?.regularMarketPrice)} · credit`,
    },
    {
      label: "30Y Yield",
      tipKey: "^TYX",
      primary: fmtChgBps(tyx?.regularMarketChange),
      primaryCls: pctCls(tyx?.regularMarketChange),
      hint: `${tyx?.regularMarketPrice !== undefined ? tyx.regularMarketPrice.toFixed(2) + "%" : "—"} · long duration`,
    },
    {
      label: "TLT",
      tipKey: "TLT",
      primary: fmtPctSafe(tlt?.regularMarketChangePercent),
      primaryCls: pctCls(tlt?.regularMarketChangePercent),
      hint: `${fmtPrice(tlt?.regularMarketPrice)} · bond proxy`,
    },
  ];

  return (
    <Panel asOf={nowUtcHM()}
      code="PULSE"
      title="US Pulse · Breadth & Risk Internals"
      learn="The six numbers a US-desk trader scans first thing every morning, beyond SPX. Russell 2K = is the rally broad? RSP−SPY spread = breadth check (equal-weight vs cap-weight). Copper = global growth pulse. HYG = credit stress (early warning before stocks crack). 30Y Yield + TLT = long-duration bond sentiment. Click the title for the full US Pulse detail page with each indicator charted historically."
      href="/pulse"
      meta={<span>YAHOO · 60s</span>}
    >
      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        {tiles.map((t) => {
          const tip = TICKER_TIPS[t.tipKey] ?? "";
          return (
            <div key={t.label} className="px-2 py-1.5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--amber-dim)]">
                {tip ? <Tooltip text={tip}>{t.label}</Tooltip> : t.label}
              </div>
              <div className={`mt-0.5 font-mono text-[14px] ${t.primaryCls}`}>{t.primary}</div>
              <div className="font-mono text-[10px] text-[var(--dim)]">{t.hint}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
