import Panel from "@/components/panel";
import PaperDeskChart from "@/components/paper-desk-chart";
import {
  costBasis,
  holdingsValue,
  positionPnL,
  type AiLean,
  type AiPortfolio,
} from "@/lib/ai-portfolio";
import type { TradeQuote } from "@/lib/markets";

// Server component: renders the AI Conviction Book marked to whatever live
// quotes the page passed in. Pure formatting + derived numbers, no state.

function usd(v: number, dp = 2): string {
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}
function qtyFmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}
function pctClass(n: number): string {
  return n > 0 ? "text-[var(--up)]" : n < 0 ? "text-[var(--down)]" : "text-[var(--dim)]";
}
function signed(v: number, dp = 0): string {
  return `${v >= 0 ? "+" : ""}${usd(v, dp)}`;
}

const CATEGORY_LABEL: Record<string, string> = {
  "ai-semis": "AI / Semis",
  "big-tech": "Big Tech",
  crypto: "Crypto",
  financials: "Financials",
  consumer: "Consumer",
};

const LEAN_STYLE: Record<AiLean, string> = {
  buy: "border-[var(--up)] text-[var(--up)]",
  add: "border-[var(--up)] text-[var(--up)]",
  hold: "border-[var(--border-strong)] text-[var(--amber)]",
  trim: "border-[var(--down)] text-[var(--down)]",
  sell: "border-[var(--down)] text-[var(--down)]",
};

function LeanBadge({ lean }: { lean: AiLean }) {
  return (
    <span
      className={`inline-block border px-1 py-px text-[9px] font-bold uppercase tracking-widest ${LEAN_STYLE[lean]}`}
    >
      {lean}
    </span>
  );
}

const CONVICTION_STYLE: Record<string, string> = {
  high: "text-[var(--up)]",
  medium: "text-[var(--amber)]",
  low: "text-[var(--dim)]",
};

export default function AiPortfolioView({
  portfolio,
  quotes,
  asOf,
}: {
  portfolio: AiPortfolio;
  quotes: Record<string, TradeQuote>;
  asOf: string;
}) {
  const priceMap: Record<string, number> = {};
  for (const sym of Object.keys(quotes)) {
    const p = quotes[sym]?.price;
    if (p != null) priceMap[sym] = p;
  }

  const invested = holdingsValue(portfolio.positions, priceMap);
  const totalEquity = portfolio.cash + invested;
  const totalPnl = totalEquity - portfolio.startingCash;
  const totalPnlPct = (totalPnl / portfolio.startingCash) * 100;
  const basis = costBasis(portfolio.positions);
  const unrealized = invested - basis;

  let dayPnl = 0;
  for (const p of portfolio.positions) {
    const q = quotes[p.symbol];
    if (q?.price != null && q.changePct != null) {
      const prevClose = q.price / (1 + q.changePct / 100);
      dayPnl += p.qty * (q.price - prevClose);
    }
  }

  // Equity curve: committed daily marks, with today's point overwritten by the
  // live equity so the last point reflects the current tape.
  const today = asOf.slice(0, 10);
  const points = portfolio.equity.map((m) =>
    m.date === today ? { date: m.date, equity: totalEquity } : { date: m.date, equity: m.equity },
  );

  // Allocation by category (market value), plus cash.
  const byCat = new Map<string, number>();
  for (const p of portfolio.positions) {
    const px = priceMap[p.symbol] ?? p.avgCost;
    byCat.set(p.category, (byCat.get(p.category) ?? 0) + p.qty * px);
  }
  const allocRows = [...byCat.entries()]
    .map(([cat, mv]) => ({ label: CATEGORY_LABEL[cat] ?? cat, mv }))
    .sort((a, b) => b.mv - a.mv);
  allocRows.push({ label: "Cash", mv: portfolio.cash });

  const daysRunning =
    Math.floor(
      (Date.parse(today) - Date.parse(portfolio.inception)) / 86_400_000,
    ) + 1;

  // Best / worst open position by unrealized %.
  const ranked = portfolio.positions
    .map((p) => ({ p, pnl: positionPnL(p, priceMap[p.symbol] ?? null) }))
    .filter((x) => x.pnl != null)
    .sort((a, b) => (b.pnl!.pct - a.pnl!.pct));
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];

  const tile = "border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5";

  return (
    <div className="space-y-1">
      {/* ---- Summary tiles ---- */}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
        <div className={tile}>
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Total Equity
          </div>
          <div className="mt-0.5 font-mono text-[18px] font-bold tabular-nums text-[var(--foreground)] glow-amber">
            {usd(totalEquity, 0)}
          </div>
        </div>
        <div className={tile}>
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Total Return
          </div>
          <div className={`mt-0.5 font-mono text-[18px] font-bold tabular-nums ${pctClass(totalPnl)}`}>
            {signed(totalPnl)}
          </div>
          <div className={`font-mono text-[10px] ${pctClass(totalPnl)}`}>
            {totalPnl >= 0 ? "+" : ""}
            {totalPnlPct.toFixed(2)}% since inception
          </div>
        </div>
        <div className={tile}>
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Day P&L
          </div>
          <div className={`mt-0.5 font-mono text-[18px] font-bold tabular-nums ${pctClass(dayPnl)}`}>
            {signed(dayPnl)}
          </div>
        </div>
        <div className={tile}>
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Cash
          </div>
          <div className="mt-0.5 font-mono text-[18px] font-bold tabular-nums text-[var(--foreground)]">
            {usd(portfolio.cash, 0)}
          </div>
          <div className="font-mono text-[10px] text-[var(--dim)]">
            {((portfolio.cash / totalEquity) * 100).toFixed(1)}% dry powder
          </div>
        </div>
        <div className={tile}>
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Invested
          </div>
          <div className="mt-0.5 font-mono text-[18px] font-bold tabular-nums text-[var(--foreground)]">
            {usd(invested, 0)}
          </div>
          <div className={`font-mono text-[10px] ${pctClass(unrealized)}`}>
            {signed(unrealized)} unreal.
          </div>
        </div>
        <div className={tile}>
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Realized P&L
          </div>
          <div className={`mt-0.5 font-mono text-[18px] font-bold tabular-nums ${pctClass(portfolio.realizedPnL)}`}>
            {signed(portfolio.realizedPnL)}
          </div>
          <div className="font-mono text-[10px] text-[var(--dim)]">
            {portfolio.positions.length} positions · day {daysRunning}
          </div>
        </div>
      </div>

      {/* ---- Equity curve + allocation ---- */}
      <div className="grid grid-cols-1 gap-1 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Panel
            code="EQTY"
            title="Equity Curve"
            learn="The AI book's total value (cash + positions marked to the live price), snapshotted once per day. The dashed line is the $1,000,000 starting stake."
            meta={
              <span>
                {portfolio.equity.length} {portfolio.equity.length === 1 ? "DAY" : "DAYS"} · START{" "}
                {usd(portfolio.startingCash, 0)}
              </span>
            }
          >
            <PaperDeskChart points={points} startingCash={portfolio.startingCash} />
          </Panel>
        </div>

        <div className="lg:col-span-4">
          <Panel code="ALLOC" title="Allocation" meta={<span>BY MARKET VALUE</span>}>
            <div className="space-y-1.5 p-2 font-mono">
              {allocRows.map((r) => {
                const pct = totalEquity > 0 ? (r.mv / totalEquity) * 100 : 0;
                const isCash = r.label === "Cash";
                return (
                  <div key={r.label}>
                    <div className="flex items-baseline justify-between text-[10px]">
                      <span className={isCash ? "text-[var(--dim)]" : "text-[var(--foreground)]"}>
                        {r.label}
                      </span>
                      <span className="tabular-nums text-[var(--dim)]">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-0.5 h-1 w-full bg-[var(--panel-head)]">
                      <div
                        className={isCash ? "h-1 bg-[var(--border-strong)]" : "h-1 bg-[var(--amber)]"}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>

      {/* ---- The AI's current read ---- */}
      <Panel
        code="READ"
        title="The AI's Current Read"
        meta={<span>UPDATED {portfolio.updated.slice(0, 10)}</span>}
      >
        <p className="p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          {portfolio.outlook}
        </p>
        {(best?.pnl || worst?.pnl) && portfolio.positions.length > 1 && (
          <div className="grid grid-cols-2 gap-px border-t border-[var(--border)] bg-[var(--border)] font-mono text-[11px]">
            <div className="bg-[var(--panel)] px-3 py-1.5">
              <span className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                Best position
              </span>
              <div className="mt-0.5">
                <span className="font-bold text-[var(--foreground)]">{best.p.symbol}</span>{" "}
                <span className={pctClass(best.pnl!.pct)}>
                  {best.pnl!.pct >= 0 ? "+" : ""}
                  {best.pnl!.pct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="bg-[var(--panel)] px-3 py-1.5">
              <span className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                Worst position
              </span>
              <div className="mt-0.5">
                <span className="font-bold text-[var(--foreground)]">{worst.p.symbol}</span>{" "}
                <span className={pctClass(worst.pnl!.pct)}>
                  {worst.pnl!.pct >= 0 ? "+" : ""}
                  {worst.pnl!.pct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </Panel>

      {/* ---- The book ---- */}
      <Panel code="BOOK" title="The Book" meta={<span>{portfolio.positions.length} POSITIONS</span>}>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-[11px] term-table">
            <thead className="bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
              <tr>
                <th className="px-2 py-1 text-left font-normal">Symbol</th>
                <th className="px-2 py-1 text-left font-normal">Stance</th>
                <th className="px-2 py-1 text-right font-normal">Qty</th>
                <th className="px-2 py-1 text-right font-normal">Avg Cost</th>
                <th className="px-2 py-1 text-right font-normal">Last</th>
                <th className="px-2 py-1 text-right font-normal">Mkt Value</th>
                <th className="px-2 py-1 text-right font-normal">Unreal P&L</th>
                <th className="px-2 py-1 text-right font-normal">Weight</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.positions
                .map((p) => {
                  const last = priceMap[p.symbol] ?? null;
                  const mv = last != null ? p.qty * last : p.qty * p.avgCost;
                  return { p, last, mv, pnl: positionPnL(p, last) };
                })
                .sort((a, b) => b.mv - a.mv)
                .map(({ p, last, mv, pnl }) => {
                  const weight = totalEquity > 0 ? (mv / totalEquity) * 100 : 0;
                  return (
                    <tr key={p.symbol} className="border-t border-[var(--border)] align-top">
                      <td className="px-2 py-1.5">
                        <div className="font-bold text-[var(--foreground)]">{p.symbol}</div>
                        <div className="text-[10px] text-[var(--dim)]">{p.name}</div>
                        <p className="mt-1 max-w-[42ch] text-[10px] leading-snug text-[var(--dim)]">
                          {p.thesis}
                        </p>
                      </td>
                      <td className="px-2 py-1.5">
                        <LeanBadge lean={p.lean} />
                        <div className="mt-1 text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                          {CATEGORY_LABEL[p.category] ?? p.category}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-[var(--foreground)]">
                        {qtyFmt(p.qty)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-[var(--dim)]">
                        {usd(p.avgCost)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-[var(--foreground)]">
                        {last != null ? usd(last) : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-[var(--foreground)]">
                        {usd(mv, 0)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {pnl ? (
                          <span className={pctClass(pnl.abs)}>
                            {signed(pnl.abs)}{" "}
                            <span className="text-[10px]">
                              ({pnl.pct >= 0 ? "+" : ""}
                              {pnl.pct.toFixed(1)}%)
                            </span>
                          </span>
                        ) : (
                          <span className="text-[var(--dim)]">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-[var(--dim)]">
                        {weight.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ---- Decision log ---- */}
      <Panel
        code="LOG"
        title="Decision Log"
        learn="Every buy / hold / trim / sell call the AI has made, newest first. This is the running record of how the book got to where it is."
        meta={<span>{portfolio.decisions.length} CALLS</span>}
      >
        <div className="max-h-[420px] overflow-y-auto divide-y divide-[var(--border)]">
          {portfolio.decisions.map((d, i) => (
            <div key={`${d.date}-${d.symbol}-${i}`} className="flex gap-2 px-3 py-1.5 font-mono">
              <div className="w-[68px] shrink-0 text-[10px] text-[var(--dim)]">{d.date}</div>
              <div className="w-[44px] shrink-0">
                <LeanBadge lean={d.action} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px]">
                  <span className="font-bold text-[var(--foreground)]">{d.symbol}</span>
                  {d.qty != null && d.price != null && (
                    <span className="text-[var(--dim)]">
                      {" "}
                      · {qtyFmt(d.qty)} @ {usd(d.price)}
                    </span>
                  )}
                  <span className={`ml-2 text-[9px] uppercase tracking-widest ${CONVICTION_STYLE[d.conviction]}`}>
                    {d.conviction} conviction
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] leading-snug text-[var(--dim)]">{d.rationale}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <p className="px-1 pt-1 font-mono text-[10px] leading-snug text-[var(--dim)]">
        Paper money — no real capital is at risk. This is an experiment in what the same model that
        writes the daily dossiers would do if it ran a $1,000,000 book, marked to live prices and
        updated daily. Not investment advice.
      </p>
    </div>
  );
}
