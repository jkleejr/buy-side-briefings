import { getTechnicals, type SrLevel, type Trend } from "@/lib/technicals";
import { cn, formatPct } from "@/lib/utils";
import Panel from "./panel";

function fmtPrice(n: number, currency: string): string {
  const decimals = n >= 1000 ? 0 : 2;
  return `${currency}${n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function trendTone(t: Trend): string {
  return t === "uptrend"
    ? "text-[var(--up)]"
    : t === "downtrend"
      ? "text-[var(--down)]"
      : "text-[var(--amber)]";
}

function rsiRead(rsi: number): { label: string; tone: string } {
  if (rsi >= 70) return { label: "overbought", tone: "text-[var(--down)]" };
  if (rsi <= 30) return { label: "oversold", tone: "text-[var(--up)]" };
  return { label: "neutral", tone: "text-[var(--dim)]" };
}

function SrRow({ l, kind, currency }: { l: SrLevel; kind: "support" | "resistance"; currency: string }) {
  const tone = kind === "support" ? "text-[var(--up)]" : "text-[var(--down)]";
  return (
    <tr className="border-t border-[var(--border)]">
      <td className={cn("px-2 py-0.5 text-[9px] uppercase tracking-widest", tone)}>{kind}</td>
      <td className={cn("px-2 py-0.5 text-right tabular-nums", tone)}>
        {fmtPrice(l.level, currency)}
      </td>
      <td className="px-2 py-0.5 text-right tabular-nums text-[var(--dim)]">
        {formatPct(l.distance_pct)}
      </td>
      <td className="px-2 py-0.5 text-right text-[var(--dim)]">
        {l.source === "swing" ? `${l.touches} touch${l.touches > 1 ? "es" : ""}` : l.source}
      </td>
    </tr>
  );
}

/**
 * Live, mechanically computed technical analysis for one symbol: trend via
 * the 50/200-DMA stack, RSI-14, moving-average distances, and a
 * support/resistance ladder from swing-point clustering over 1Y of daily
 * bars. Complements (never replaces) the dossier's hand-written key levels.
 */
export default async function TechnicalsPanel({
  symbol,
  currency = "$",
}: {
  symbol: string;
  currency?: string;
}) {
  const t = await getTechnicals(symbol);
  if (!t) return null;

  const rsi = t.rsi14 === null ? null : rsiRead(t.rsi14);
  const rangePos =
    ((t.last_close - t.week52_low) / (t.week52_high - t.week52_low)) * 100;

  return (
    <Panel
      code="TA"
      title={`Technical Analysis · ${symbol}`}
      learn="Computed live from one year of daily bars — no opinion involved. Trend = where price sits relative to the 50- and 200-day moving averages. RSI-14 above 70 = overbought (rallies tend to stall), below 30 = oversold (bounces tend to start). Support/resistance levels come from clustering the swing highs and lows the market actually respected — more touches = stronger level — plus the major moving averages and 52-week extremes. Use them with the hand-written Key Levels panel: this one is mechanical and always current; that one carries judgment."
      meta={<span>1Y DAILY · AS OF {t.as_of}</span>}
    >
      {/* ---- headline strip: trend, RSI, 52W position ---- */}
      <div className="grid grid-cols-2 divide-x divide-[var(--border)] border-b border-[var(--border)] font-mono sm:grid-cols-4">
        <div className="px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">Trend</div>
          <div className={cn("mt-0.5 text-[14px] font-bold uppercase", trendTone(t.trend))}>
            {t.trend}
          </div>
        </div>
        <div className="px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">RSI-14</div>
          <div className="mt-0.5 text-[14px] font-bold tabular-nums text-[var(--foreground)]">
            {t.rsi14 === null ? "—" : t.rsi14.toFixed(0)}
            {rsi && <span className={cn("ml-1.5 text-[10px] font-normal uppercase", rsi.tone)}>{rsi.label}</span>}
          </div>
        </div>
        <div className="px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">Last</div>
          <div className="mt-0.5 text-[14px] font-bold tabular-nums text-[var(--foreground)]">
            {fmtPrice(t.last_close, currency)}
          </div>
        </div>
        <div className="px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">52W Range</div>
          <div className="mt-0.5 text-[11px] tabular-nums text-[var(--foreground)]">
            {fmtPrice(t.week52_low, currency)} – {fmtPrice(t.week52_high, currency)}
            <span className="ml-1.5 text-[10px] text-[var(--dim)]">({rangePos.toFixed(0)}%)</span>
          </div>
        </div>
      </div>

      <p className="border-b border-[var(--border)] px-2 py-1.5 font-mono text-[11px] leading-snug text-[var(--foreground)]">
        {t.trend_note}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* ---- moving averages ---- */}
        <div className="border-b border-[var(--border)] lg:border-b-0 lg:border-r">
          <div className="bg-[var(--panel-head)] px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
            Moving averages
          </div>
          <table className="w-full font-mono text-[11px]">
            <tbody>
              {t.ma.map((m) => (
                <tr key={m.period} className="border-t border-[var(--border)] first:border-t-0">
                  <td className="px-2 py-0.5 text-[var(--amber-dim)]">{m.period}-DMA</td>
                  <td className="px-2 py-0.5 text-right tabular-nums text-[var(--foreground)]">
                    {fmtPrice(m.value, currency)}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-0.5 text-right tabular-nums",
                      m.vs_price_pct > 0 ? "text-[var(--up)]" : "text-[var(--down)]",
                    )}
                  >
                    price {m.vs_price_pct > 0 ? "above" : "below"} {formatPct(m.vs_price_pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ---- support / resistance ladder ---- */}
        <div>
          <div className="bg-[var(--panel-head)] px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
            Support / resistance ladder
          </div>
          <table className="w-full font-mono text-[11px]">
            <tbody>
              {[...t.resistance].reverse().map((l, i) => (
                <SrRow key={`r${i}`} l={l} kind="resistance" currency={currency} />
              ))}
              <tr className="border-t border-[var(--border-strong)] bg-[rgba(255,165,0,0.06)]">
                <td className="px-2 py-0.5 text-[9px] uppercase tracking-widest text-[var(--amber)]">
                  last
                </td>
                <td className="px-2 py-0.5 text-right font-bold tabular-nums text-[var(--amber)]">
                  {fmtPrice(t.last_close, currency)}
                </td>
                <td className="px-2 py-0.5" colSpan={2} />
              </tr>
              {t.support.map((l, i) => (
                <SrRow key={`s${i}`} l={l} kind="support" currency={currency} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}
