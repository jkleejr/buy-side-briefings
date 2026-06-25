import { getBtcFearGreed, type FngReading } from "@/lib/btc-fear-greed";
import { cn } from "@/lib/utils";
import Panel from "./panel";

const dash = "—";

// Sentiment → palette. Fear is red, greed is green, neutral amber. The same
// scale used across the site (--up / --down) so it reads at a glance.
function tone(value: number | null): string {
  if (value === null) return "text-[var(--dim)]";
  if (value <= 24) return "text-[var(--down)]";
  if (value <= 44) return "text-[#f59e0b]";
  if (value <= 54) return "text-[var(--amber)]";
  if (value <= 74) return "text-[#84cc16]";
  return "text-[var(--up)]";
}

function bg(value: number): string {
  if (value <= 24) return "var(--down)";
  if (value <= 44) return "#f59e0b";
  if (value <= 54) return "var(--amber)";
  if (value <= 74) return "#84cc16";
  return "var(--up)";
}

// Contrarian read: extremes are where the crowd is usually wrong.
function interpretation(value: number): string {
  if (value <= 24)
    return "Extreme fear — the crowd is capitulating. Historically a contrarian accumulation zone, not a panic-sell one.";
  if (value <= 44)
    return "Fear is in control. Risk appetite is low; dips are being sold rather than bought.";
  if (value <= 54)
    return "Sentiment is balanced — neither side has conviction. Direction is being set by news, not mood.";
  if (value <= 74)
    return "Greed is building. Momentum is with the bulls, but chasing here carries less margin of safety.";
  return "Extreme greed — euphoria. Historically a zone to take profit into strength, not add aggressively.";
}

function Delta({ from, label }: { from: FngReading | null; label: string }) {
  return (
    <div className="px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">{label}</div>
      <div className={cn("mt-0.5 text-[14px] font-bold tabular-nums", tone(from?.value ?? null))}>
        {from ? from.value : dash}
      </div>
      <div className="truncate text-[9px] uppercase tracking-widest text-[var(--dim)]">
        {from ? from.classification : dash}
      </div>
    </div>
  );
}

/**
 * Crypto Fear & Greed Index — a 0–100 market-sentiment gauge for Bitcoin. Live
 * from alternative.me (free). Shown on the BTC dossier as the "mood" layer that
 * sits next to the on-chain fundamentals and technicals.
 */
export default async function BtcFearGreedPanel() {
  const f = await getBtcFearGreed();
  const cur = f.current;

  return (
    <Panel
      code="SENT"
      title="Fear & Greed · BTC"
      learn="The Crypto Fear & Greed Index distills market sentiment into one 0–100 number. 0 = Extreme Fear (the crowd is capitulating — volatility spikes, momentum and volume collapse); 100 = Extreme Greed (euphoria — the market is overbought and over-leveraged). It blends volatility, market momentum/volume, social media, Bitcoin dominance and search trends, refreshed daily by alternative.me. It is a contrarian gauge: history shows extreme fear has often marked good accumulation zones and extreme greed has marked tops — but it is a mood ring, not a timing signal. Use it as context alongside price, on-chain and macro. Not investment advice."
      meta={<span>SENTIMENT · AS OF {f.asOf}</span>}
    >
      {cur === null ? (
        <div className="p-6 text-center font-mono text-[11px] text-[var(--dim)]">
          Sentiment data unavailable right now.
        </div>
      ) : (
        <>
          {/* ---- headline gauge ---- */}
          <div className="border-b border-[var(--border)] px-3 py-3">
            <div className="flex items-end justify-between font-mono">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                  Index now
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-[34px] font-bold leading-none tabular-nums", tone(cur.value))}>
                    {cur.value}
                  </span>
                  <span className={cn("text-[13px] font-bold uppercase tracking-wider", tone(cur.value))}>
                    {cur.classification}
                  </span>
                </div>
              </div>
              <div className="text-right text-[9px] uppercase tracking-widest text-[var(--dim)]">
                <div>0 = extreme fear</div>
                <div>100 = extreme greed</div>
              </div>
            </div>

            {/* gauge bar: 5 sentiment bands + a marker at the current value */}
            <div className="relative mt-3">
              <div className="flex h-2.5 w-full overflow-hidden border border-[var(--border)]">
                <div className="h-full" style={{ width: "25%", background: "var(--down)", opacity: 0.55 }} />
                <div className="h-full" style={{ width: "20%", background: "#f59e0b", opacity: 0.55 }} />
                <div className="h-full" style={{ width: "10%", background: "var(--amber)", opacity: 0.55 }} />
                <div className="h-full" style={{ width: "20%", background: "#84cc16", opacity: 0.55 }} />
                <div className="h-full" style={{ width: "25%", background: "var(--up)", opacity: 0.55 }} />
              </div>
              <div
                className="absolute top-[-3px] h-[18px] w-[2px] bg-[var(--foreground)]"
                style={{ left: `calc(${Math.min(100, Math.max(0, cur.value))}% - 1px)` }}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[8px] uppercase tracking-widest text-[var(--dim)]">
              <span>Fear</span>
              <span>Neutral</span>
              <span>Greed</span>
            </div>

            <p className="mt-2.5 font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
              {interpretation(cur.value)}
            </p>
          </div>

          {/* ---- trend strip: yesterday / week / month + year extremes ---- */}
          <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-b border-[var(--border)] font-mono sm:grid-cols-5">
            <Delta from={f.yesterday} label="Yesterday" />
            <Delta from={f.weekAgo} label="Last week" />
            <Delta from={f.monthAgo} label="Last month" />
            <Delta from={f.yearLow} label="1y low" />
            <Delta from={f.yearHigh} label="1y high" />
          </div>

          {/* ---- 30-day sparkline ---- */}
          {f.history30.length > 1 && (
            <div className="px-3 py-2">
              <div className="flex items-baseline justify-between font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                <span>Last 30 days</span>
                <span className="text-[var(--dim)]">
                  {f.history30[0]?.date} → {f.history30[f.history30.length - 1]?.date}
                </span>
              </div>
              <div className="mt-1.5 flex h-12 items-end gap-[2px]">
                {f.history30.map((r, i) => (
                  <div
                    key={`${r.date}-${i}`}
                    className="flex-1"
                    title={`${r.date}: ${r.value} (${r.classification})`}
                    style={{
                      height: `${Math.max(4, r.value)}%`,
                      background: bg(r.value),
                      opacity: 0.8,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <p className="border-t border-[var(--border)] px-2 py-1.5 font-mono text-[9px] leading-relaxed text-[var(--dim)]">
            Crypto Fear &amp; Greed Index from alternative.me, refreshed daily, cached ~5 min.
            A contrarian sentiment gauge — read the extremes, not the daily wiggle.
            Educational context, not investment advice.
          </p>
        </>
      )}
    </Panel>
  );
}
