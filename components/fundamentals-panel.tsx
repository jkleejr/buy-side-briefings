import { getFundamentals, type Fundamentals } from "@/lib/fundamentals";
import { cn } from "@/lib/utils";
import Panel from "./panel";

// ---- formatters ------------------------------------------------------------

const dash = "—";
const ratio = (n: number | null, d = 1) => (n === null ? dash : n.toFixed(d));
const pctStr = (n: number | null, d = 1) => (n === null ? dash : `${n.toFixed(d)}%`);
const eps = (n: number | null) =>
  n === null ? dash : `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(2)}`;

function money(n: number | null): string {
  if (n === null) return dash;
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  return `${sign}$${a.toLocaleString("en-US")}`;
}

const signTone = (n: number | null) =>
  n === null
    ? "text-[var(--dim)]"
    : n > 0
      ? "text-[var(--up)]"
      : n < 0
        ? "text-[var(--down)]"
        : "text-[var(--foreground)]";

const signedPct = (n: number | null, d = 1) =>
  n === null ? dash : `${n > 0 ? "+" : ""}${n.toFixed(d)}%`;

// recommendationKey → tone/label; recommendationMean is 1 (strong buy) … 5 (sell)
function ratingMeta(key: string | null, mean: number | null): { label: string; tone: string } {
  const k = (key ?? "").toLowerCase();
  if (k.includes("strong_buy")) return { label: "STRONG BUY", tone: "text-[var(--up)]" };
  if (k.includes("buy")) return { label: "BUY", tone: "text-[var(--up)]" };
  if (k.includes("hold") || k.includes("neutral"))
    return { label: "HOLD", tone: "text-[var(--amber)]" };
  if (k.includes("under") || k.includes("sell"))
    return { label: "SELL", tone: "text-[var(--down)]" };
  if (mean !== null) {
    if (mean <= 2) return { label: "BUY", tone: "text-[var(--up)]" };
    if (mean <= 3.4) return { label: "HOLD", tone: "text-[var(--amber)]" };
    return { label: "SELL", tone: "text-[var(--down)]" };
  }
  return { label: dash, tone: "text-[var(--dim)]" };
}

// ---- small presentational pieces -------------------------------------------

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
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

/** Stacked, proportional rating-distribution bar (strong buy … sell). */
function RatingBar({ d }: { d: NonNullable<Fundamentals["analyst"]["distribution"]> }) {
  const total = d.strongBuy + d.buy + d.hold + d.sell + d.strongSell;
  if (total === 0) return null;
  const segs = [
    { n: d.strongBuy, cls: "bg-[var(--up)]" },
    { n: d.buy, cls: "bg-[rgba(34,197,94,0.55)]" },
    { n: d.hold, cls: "bg-[var(--amber)]" },
    { n: d.sell, cls: "bg-[rgba(239,68,68,0.55)]" },
    { n: d.strongSell, cls: "bg-[var(--down)]" },
  ];
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden border border-[var(--border)]">
        {segs.map((s, i) =>
          s.n > 0 ? <div key={i} className={s.cls} style={{ width: `${(s.n / total) * 100}%` }} /> : null,
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
        <span className="text-[var(--up)]">{d.strongBuy + d.buy} buy</span>
        <span className="text-[var(--amber)]">{d.hold} hold</span>
        <span className="text-[var(--down)]">{d.sell + d.strongSell} sell</span>
      </div>
    </div>
  );
}

// ---- main panel ------------------------------------------------------------

/**
 * The evidence layer behind the verdict: valuation, growth & margins, balance-
 * sheet health, Street consensus, the next earnings event, recent surprises,
 * and which way estimates are being revised. Pulled live from Yahoo (free).
 */
export default async function FundamentalsPanel({ symbol }: { symbol: string }) {
  const f = await getFundamentals(symbol);
  if (!f) return null;

  const rating = ratingMeta(f.analyst.ratingKey, f.analyst.ratingMean);

  return (
    <Panel
      code="FA"
      title={`Fundamentals · ${symbol}`}
      learn="The numbers behind the call, pulled live from public filings via Yahoo. Valuation multiples (P/E, P/S, EV/EBITDA) say how richly the business is priced — forward P/E below trailing means the Street expects earnings to grow into the price. Margins and revenue growth say whether the business is actually getting better. The analyst block is consensus (lags reality, herds — treat as context, not gospel). Earnings surprises and especially the DIRECTION of estimate revisions — are analysts raising or cutting? — are among the most predictive public signals there are. This panel is mechanical and always current; the verdict above carries the judgment."
      meta={<span>YAHOO · AS OF {f.asOf}</span>}
    >
      {/* ---- headline strip ---- */}
      <div className="grid grid-cols-2 divide-x divide-[var(--border)] border-b border-[var(--border)] font-mono sm:grid-cols-4">
        <HeadStat label="Fwd P/E" value={ratio(f.forwardPE)} sub="forward earnings" />
        <HeadStat
          label="Rev growth"
          value={signedPct(f.revenueGrowthPct)}
          sub="YoY"
          tone={signTone(f.revenueGrowthPct)}
        />
        <HeadStat label="Net margin" value={pctStr(f.netMarginPct)} sub="trailing" />
        <HeadStat
          label="Next earnings"
          value={f.nextEarningsDaysAway !== null ? `${f.nextEarningsDaysAway}d` : dash}
          sub={f.nextEarningsDate ?? "unscheduled"}
          tone={
            f.nextEarningsDaysAway !== null && f.nextEarningsDaysAway <= 7
              ? "text-[var(--amber)]"
              : undefined
          }
        />
      </div>

      {/* ---- valuation + growth/profitability, side by side ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="border-b border-[var(--border)] lg:border-b-0 lg:border-r lg:border-[var(--border)]">
          <div className="bg-[var(--panel-head)] px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
            Valuation
          </div>
          <table className="w-full font-mono text-[11px]">
            <tbody>
              <Row label="Trailing P/E" value={ratio(f.trailingPE)} />
              <Row label="Forward P/E" value={ratio(f.forwardPE)} />
              <Row label="Price / Sales" value={ratio(f.priceToSales)} />
              <Row label="EV / EBITDA" value={ratio(f.evToEbitda)} />
              <Row label="PEG ratio" value={ratio(f.peg, 2)} />
              <Row label="Price / Book" value={ratio(f.priceToBook)} />
            </tbody>
          </table>
        </div>

        <div>
          <div className="bg-[var(--panel-head)] px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
            Growth & profitability
          </div>
          <table className="w-full font-mono text-[11px]">
            <tbody>
              <Row
                label="Revenue growth"
                value={signedPct(f.revenueGrowthPct)}
                tone={signTone(f.revenueGrowthPct)}
              />
              <Row
                label="Earnings growth"
                value={signedPct(f.earningsGrowthPct)}
                tone={signTone(f.earningsGrowthPct)}
              />
              <Row label="Gross margin" value={pctStr(f.grossMarginPct)} />
              <Row label="Operating margin" value={pctStr(f.operatingMarginPct)} />
              <Row label="Net margin" value={pctStr(f.netMarginPct)} />
              <Row label="Return on equity" value={pctStr(f.roePct)} />
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- balance-sheet strip ---- */}
      <div className="grid grid-cols-2 divide-x divide-[var(--border)] border-t border-[var(--border)] font-mono sm:grid-cols-5">
        <HeadStat label="Cash" value={money(f.totalCash)} />
        <HeadStat label="Debt" value={money(f.totalDebt)} />
        <HeadStat label="Debt/Equity" value={f.debtToEquity === null ? dash : ratio(f.debtToEquity, 0)} />
        <HeadStat label="Current ratio" value={ratio(f.currentRatio, 2)} />
        <HeadStat label="Free cash flow" value={money(f.freeCashflow)} />
      </div>

      {/* ---- analyst consensus ---- */}
      {(f.analyst.targetMean !== null || f.analyst.distribution) && (
        <div className="grid grid-cols-1 border-t border-[var(--border)] sm:grid-cols-2">
          <div className="border-b border-[var(--border)] px-3 py-2 sm:border-b-0 sm:border-r sm:border-[var(--border)]">
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
              Street consensus
            </div>
            <div className="mt-1 flex items-baseline gap-2 font-mono">
              <span className={cn("text-[18px] font-bold", rating.tone)}>{rating.label}</span>
              <span className="text-[10px] text-[var(--dim)]">
                {f.analyst.ratingMean !== null ? `${f.analyst.ratingMean.toFixed(1)}/5` : ""}
                {f.analyst.numAnalysts !== null ? ` · ${f.analyst.numAnalysts} analysts` : ""}
              </span>
            </div>
            {f.analyst.distribution && (
              <div className="mt-2">
                <RatingBar d={f.analyst.distribution} />
              </div>
            )}
          </div>
          <div className="px-3 py-2">
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
              Price target
            </div>
            <div className="mt-1 flex items-baseline gap-2 font-mono">
              <span className="text-[18px] font-bold tabular-nums text-[var(--foreground)]">
                {f.analyst.targetMean === null ? dash : `$${f.analyst.targetMean.toFixed(0)}`}
              </span>
              {f.analyst.impliedUpsidePct !== null && (
                <span className={cn("text-[12px] font-semibold tabular-nums", signTone(f.analyst.impliedUpsidePct))}>
                  {signedPct(f.analyst.impliedUpsidePct, 0)} vs price
                </span>
              )}
            </div>
            <div className="mt-0.5 font-mono text-[10px] tabular-nums text-[var(--dim)]">
              range {f.analyst.targetLow === null ? dash : `$${f.analyst.targetLow.toFixed(0)}`} –{" "}
              {f.analyst.targetHigh === null ? dash : `$${f.analyst.targetHigh.toFixed(0)}`}
            </div>
          </div>
        </div>
      )}

      {/* ---- earnings: surprises + estimate revisions ---- */}
      {(f.surprises.length > 0 || f.revisions.length > 0) && (
        <div className="grid grid-cols-1 border-t border-[var(--border)] lg:grid-cols-2">
          {f.surprises.length > 0 && (
            <div className="border-b border-[var(--border)] lg:border-b-0 lg:border-r lg:border-[var(--border)]">
              <div className="bg-[var(--panel-head)] px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
                EPS surprise · last {f.surprises.length} quarters
              </div>
              <table className="w-full font-mono text-[11px]">
                <thead>
                  <tr className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                    <th className="px-2 py-0.5 text-left">Quarter</th>
                    <th className="px-2 py-0.5 text-right">Est</th>
                    <th className="px-2 py-0.5 text-right">Actual</th>
                    <th className="px-2 py-0.5 text-right">Surprise</th>
                  </tr>
                </thead>
                <tbody>
                  {f.surprises.map((s) => (
                    <tr key={s.quarter} className="border-t border-[var(--border)]">
                      <td className="px-2 py-0.5 text-[var(--foreground)]">{s.quarter}</td>
                      <td className="px-2 py-0.5 text-right tabular-nums text-[var(--dim)]">
                        {eps(s.epsEstimate)}
                      </td>
                      <td className="px-2 py-0.5 text-right tabular-nums text-[var(--foreground)]">
                        {eps(s.epsActual)}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-0.5 text-right tabular-nums",
                          s.beat === null
                            ? "text-[var(--dim)]"
                            : s.beat
                              ? "text-[var(--up)]"
                              : "text-[var(--down)]",
                        )}
                      >
                        {s.beat !== null && (s.beat ? "▲ " : "▼ ")}
                        {signedPct(s.surprisePct, 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {f.revisions.length > 0 && (
            <div>
              <div className="bg-[var(--panel-head)] px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
                Estimate revisions · are they raising or cutting?
              </div>
              <table className="w-full font-mono text-[11px]">
                <thead>
                  <tr className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                    <th className="px-2 py-0.5 text-left">Period</th>
                    <th className="px-2 py-0.5 text-right">Now</th>
                    <th className="px-2 py-0.5 text-right">30d ago</th>
                    <th className="px-2 py-0.5 text-right">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {f.revisions.map((r) => {
                    const tone =
                      r.dir === "up"
                        ? "text-[var(--up)]"
                        : r.dir === "down"
                          ? "text-[var(--down)]"
                          : "text-[var(--dim)]";
                    const arrow = r.dir === "up" ? "▲" : r.dir === "down" ? "▼" : "—";
                    return (
                      <tr key={r.label} className="border-t border-[var(--border)]">
                        <td className="px-2 py-0.5 text-[var(--amber-dim)]">{r.label}</td>
                        <td className="px-2 py-0.5 text-right tabular-nums text-[var(--foreground)]">
                          {eps(r.current)}
                        </td>
                        <td className="px-2 py-0.5 text-right tabular-nums text-[var(--dim)]">
                          {eps(r.days30Ago)}
                        </td>
                        <td className={cn("px-2 py-0.5 text-right tabular-nums", tone)}>
                          {arrow}
                          {(r.upLast30 ?? 0) + (r.downLast30 ?? 0) > 0 && (
                            <span className="ml-1 text-[9px]">
                              {r.upLast30 ?? 0}↑ {r.downLast30 ?? 0}↓
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <p className="border-t border-[var(--border)] px-2 py-1.5 font-mono text-[9px] leading-relaxed text-[var(--dim)]">
        Consensus and estimates are third-party data, delayed and occasionally
        stale. Analysts herd and lag. Educational context, not investment advice.
      </p>
    </Panel>
  );
}
