import { getBtcFundamentals } from "@/lib/btc-fundamentals";
import { cn } from "@/lib/utils";
import Panel from "./panel";

// ---- formatters ------------------------------------------------------------

const dash = "—";

function usd(n: number | null): string {
  if (n === null) return dash;
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

const price = (n: number | null) =>
  n === null ? dash : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const btc = (n: number | null, d = 0) =>
  n === null ? dash : `${n.toLocaleString("en-US", { maximumFractionDigits: d })} BTC`;

const pctStr = (n: number | null, d = 1) => (n === null ? dash : `${n.toFixed(d)}%`);
const signedPct = (n: number | null, d = 1) =>
  n === null ? dash : `${n > 0 ? "+" : ""}${n.toFixed(d)}%`;
const ratio = (n: number | null, d = 1) => (n === null ? dash : n.toFixed(d));

function bigNum(n: number | null): string {
  if (n === null) return dash;
  const a = Math.abs(n);
  if (a >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (a >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n.toFixed(0)}`;
}

const signTone = (n: number | null) =>
  n === null
    ? "text-[var(--dim)]"
    : n > 0
      ? "text-[var(--up)]"
      : n < 0
        ? "text-[var(--down)]"
        : "text-[var(--foreground)]";

// ---- presentational pieces -------------------------------------------------

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <tr className="border-t border-[var(--border)] first:border-t-0">
      <td className="px-2 py-0.5 text-[var(--amber-dim)]">{label}</td>
      <td className={cn("px-2 py-0.5 text-right tabular-nums", tone ?? "text-[var(--foreground)]")}>
        {value}
      </td>
    </tr>
  );
}

function HeadStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">{label}</div>
      <div className={cn("mt-0.5 text-[14px] font-bold tabular-nums", tone ?? "text-[var(--foreground)]")}>
        {value}
      </div>
      {sub && <div className="text-[9px] uppercase tracking-widest text-[var(--dim)]">{sub}</div>}
    </div>
  );
}

// ---- main panel ------------------------------------------------------------

/**
 * Bitcoin's fundamentals: monetary policy (supply, issuance, the halving clock),
 * network security and on-chain usage, and network valuation. The crypto analog
 * to the equity FA panel — pulled live from CoinGecko + blockchain.info (free).
 */
export default async function BtcFundamentalsPanel() {
  const f = await getBtcFundamentals();

  return (
    <Panel
      code="ONCH"
      title="Network & Valuation · BTC"
      learn="Bitcoin has no earnings, so its fundamentals are different from a stock's. Supply & scarcity is its monetary policy: only 21M will ever exist, new coins are issued at a fixed, ever-halving rate, and the resulting inflation rate is now well under 1%/yr — lower than gold's. The halving clock (every 210,000 blocks, ~4 years) cuts new issuance in half and has historically front-run major price cycles. Network security is the hash rate and difficulty — rising hash rate means more capital defending the chain. On-chain usage (transactions, settled USD value) is real demand. NVT — market cap ÷ daily on-chain settlement — is the rough 'crypto P/E': high NVT means the network is priced richly versus the value it actually moves (noisy; use as a trend, not a level). All live from public sources; not investment advice."
      meta={<span>ON-CHAIN · AS OF {f.asOf}</span>}
    >
      {/* ---- headline strip ---- */}
      <div className="grid grid-cols-2 divide-x divide-[var(--border)] border-b border-[var(--border)] font-mono sm:grid-cols-4">
        <HeadStat label="Market cap" value={usd(f.marketCap)} sub="network value" />
        <HeadStat
          label="Mined"
          value={pctStr(f.pctMined)}
          sub="of 21M cap"
          tone="text-[var(--amber)]"
        />
        <HeadStat label="Inflation" value={f.inflationPct === null ? dash : `${f.inflationPct.toFixed(2)}%`} sub="new supply / yr" />
        <HeadStat
          label="Next halving"
          value={f.daysToHalving !== null ? `~${Math.round(f.daysToHalving)}d` : dash}
          sub={f.nextHalvingBlock !== null ? `block ${bigNum(f.nextHalvingBlock)}` : "—"}
          tone="text-[var(--amber)]"
        />
      </div>

      {/* ---- supply/scarcity + network, side by side ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="border-b border-[var(--border)] lg:border-b-0 lg:border-r lg:border-[var(--border)]">
          <div className="bg-[var(--panel-head)] px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
            Supply & scarcity
          </div>
          <table className="w-full font-mono text-[11px] term-table">
            <tbody>
              <Row label="Circulating" value={btc(f.circulatingSupply)} />
              <Row label="Max supply" value="21,000,000 BTC" />
              <Row label="Mined" value={pctStr(f.pctMined)} tone="text-[var(--amber)]" />
              <Row label="Block subsidy" value={f.blockSubsidy === null ? dash : `${f.blockSubsidy} BTC`} />
              <Row label="Annual issuance" value={btc(f.annualIssuance)} />
              <Row
                label="Inflation rate"
                value={f.inflationPct === null ? dash : `${f.inflationPct.toFixed(2)}% / yr`}
              />
            </tbody>
          </table>
        </div>

        <div>
          <div className="bg-[var(--panel-head)] px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
            Network security & usage
          </div>
          <table className="w-full font-mono text-[11px] term-table">
            <tbody>
              <Row
                label="Hash rate"
                value={f.hashRateEh === null ? dash : `${f.hashRateEh.toFixed(0)} EH/s`}
              />
              <Row label="Difficulty" value={f.difficulty === null ? dash : bigNum(f.difficulty)} />
              <Row label="Transactions / 24h" value={f.txCount24h === null ? dash : f.txCount24h.toLocaleString("en-US")} />
              <Row label="On-chain volume" value={f.txVolumeUsd === null ? dash : `${usd(f.txVolumeUsd)} / day`} />
              <Row label="NVT ratio" value={ratio(f.nvt, 0)} />
              <Row label="BTC dominance" value={pctStr(f.dominancePct)} />
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- market structure strip ---- */}
      <div className="grid grid-cols-2 divide-x divide-[var(--border)] border-t border-[var(--border)] font-mono sm:grid-cols-5">
        <HeadStat label="Price" value={price(f.price)} />
        <HeadStat
          label="From ATH"
          value={signedPct(f.athChangePct, 0)}
          sub={f.athDate ?? undefined}
          tone={signTone(f.athChangePct)}
        />
        <HeadStat label="24h" value={signedPct(f.change24hPct)} tone={signTone(f.change24hPct)} />
        <HeadStat label="7d" value={signedPct(f.change7dPct)} tone={signTone(f.change7dPct)} />
        <HeadStat label="1y" value={signedPct(f.change1yPct, 0)} tone={signTone(f.change1yPct)} />
      </div>

      {/* ---- halving cycle ---- */}
      {f.cycleProgressPct !== null && (
        <div className="border-t border-[var(--border)] px-3 py-2">
          <div className="flex items-baseline justify-between font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            <span>Halving cycle</span>
            <span className="text-[var(--dim)]">
              {f.daysSinceHalving !== null ? `${Math.round(f.daysSinceHalving)}d since` : ""}
              {f.daysToHalving !== null ? ` · ${Math.round(f.daysToHalving)}d to go` : ""}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden border border-[var(--border)]">
            <div
              className="h-full bg-[var(--amber)]"
              style={{ width: `${Math.min(100, Math.max(0, f.cycleProgressPct)).toFixed(1)}%` }}
            />
          </div>
          <div className="mt-1 flex items-baseline justify-between font-mono text-[9px] tabular-nums text-[var(--dim)]">
            <span>
              last ▸ block {f.lastHalvingBlock === null ? dash : f.lastHalvingBlock.toLocaleString("en-US")}
            </span>
            <span className="text-[var(--amber-dim)]">{f.cycleProgressPct.toFixed(0)}% through</span>
            <span>
              next ▸ block {f.nextHalvingBlock === null ? dash : f.nextHalvingBlock.toLocaleString("en-US")}
            </span>
          </div>
        </div>
      )}

      <p className="border-t border-[var(--border)] px-2 py-1.5 font-mono text-[9px] leading-relaxed text-[var(--dim)]">
        On-chain and market data from CoinGecko & blockchain.info, cached ~5 min.
        NVT is a rough, noisy valuation gauge — read the trend, not the level.
        Educational context, not investment advice.
      </p>
    </Panel>
  );
}
