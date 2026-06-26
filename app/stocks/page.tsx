import Link from "next/link";
import {
  getLatestAssetDaily,
  type AssetDaily,
  type AssetId,
  type DayWinner,
  type TradeAction,
} from "@/lib/asset-daily";
import { getNextEarnings, countdownBadge, type EarningsEntry } from "@/lib/earnings";
import { cn, formatLevel, formatPct } from "@/lib/utils";

export const metadata = {
  title: "Stocks — Buy-Side Briefings",
  description:
    "Single-name desks: our standing buy/hold/sell call and full daily analysis for NVIDIA, Bitcoin, SK Hynix, and SpaceX.",
};

export const revalidate = 300;

type StockDef = { id: AssetId; href: string; name: string; symbol: string; blurb: string };

// The single-name desks, in reading order. Names/symbols here are fallbacks for
// when a desk has no dossier on file yet; live dossiers override them.
const STOCKS: StockDef[] = [
  { id: "nvda", href: "/nvidia", name: "NVIDIA", symbol: "NVDA", blurb: "AI accelerators — the index's center of gravity" },
  { id: "btc", href: "/bitcoin", name: "Bitcoin", symbol: "BTC", blurb: "The macro risk barometer, trading 24/7" },
  { id: "skhynix", href: "/skhynix", name: "SK Hynix", symbol: "HYNIX", blurb: "HBM memory for the AI buildout" },
  { id: "mu", href: "/micron", name: "Micron", symbol: "MU", blurb: "HBM/DRAM memory — the AI-memory super-cycle" },
  { id: "nbis", href: "/nebius", name: "Nebius", symbol: "NBIS", blurb: "AI neocloud — compute & power, the AI bottleneck" },
  { id: "be", href: "/bloom-energy", name: "Bloom Energy", symbol: "BE", blurb: "Fuel cells powering AI data centers — the power bottleneck" },
  { id: "crwv", href: "/coreweave", name: "CoreWeave", symbol: "CRWV", blurb: "Flagship AI neocloud — GPUs for OpenAI & Anthropic" },
  { id: "spcx", href: "/spacex", name: "SpaceX", symbol: "SPCX", blurb: "Pre-IPO space & satellite franchise" },
];

// Yahoo symbol to fetch each desk's next earnings date from. SK Hynix is the
// Korean listing. BTC (crypto) and SPCX (pre-IPO) have no standard earnings —
// they get an explicit note instead, in NO_EARNINGS.
const EARNINGS_SYMBOL: Partial<Record<AssetId, string>> = {
  nvda: "NVDA",
  skhynix: "000660.KS",
  mu: "MU",
  nbis: "NBIS",
  be: "BE",
  crwv: "CRWV",
};
const NO_EARNINGS: Partial<Record<AssetId, string>> = {
  btc: "Crypto — no earnings",
  spcx: "Pre-IPO — no scheduled report",
};

function EarningsLine({ entry, note }: { entry?: EarningsEntry | null; note?: string }) {
  if (entry) {
    const d = entry.daysUntil;
    const tone =
      d <= 7 ? "text-[var(--amber)]" : d <= 30 ? "text-[var(--cyan-term)]" : "text-[var(--dim)]";
    return (
      <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest">
        <span className="text-[var(--dim)]">Next earnings</span>
        <span className={cn("font-semibold", tone)}>{entry.date}</span>
        <span className={tone}>· {countdownBadge(d)}</span>
        {entry.isEstimate && <span className="text-[var(--dim)]">est.</span>}
      </div>
    );
  }
  if (note) {
    return (
      <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-[var(--dim)]">
        <span className="text-[var(--dim)]">Next earnings</span> · {note}
      </div>
    );
  }
  return null;
}

const WINNER: Record<DayWinner, { emoji: string; label: string; text: string }> = {
  bulls: { emoji: "🐂", label: "Bulls", text: "text-[var(--up)]" },
  bears: { emoji: "🐻", label: "Bears", text: "text-[var(--down)]" },
  flat: { emoji: "➖", label: "Flat", text: "text-[var(--dim)]" },
};

const ACTION: Record<TradeAction, { text: string; border: string; bg: string }> = {
  buy: { text: "text-[var(--up)]", border: "border-[var(--up)]", bg: "bg-[rgba(34,197,94,0.10)]" },
  hold: { text: "text-[var(--amber)]", border: "border-[var(--amber)]", bg: "bg-[rgba(255,165,0,0.10)]" },
  sell: { text: "text-[var(--down)]", border: "border-[var(--down)]", bg: "bg-[rgba(239,68,68,0.10)]" },
  step_aside: { text: "text-[var(--amber)]", border: "border-[var(--amber)]", bg: "bg-[rgba(255,165,0,0.10)]" },
};

function StockCard({
  def,
  d,
  earnings,
  noEarnings,
}: {
  def: StockDef;
  d: AssetDaily | null;
  earnings?: EarningsEntry | null;
  noEarnings?: string;
}) {
  // No dossier on file yet — still link through, just say so.
  if (!d) {
    return (
      <Link
        href={def.href}
        className="block border border-[var(--border)] bg-[var(--panel)] px-3 py-3 transition-colors hover:border-[var(--amber-dim)] hover:bg-[rgba(255,165,0,0.04)]"
      >
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[15px] font-bold text-[var(--foreground)]">
            {def.symbol}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--dim)]">
            {def.name}
          </span>
        </div>
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-[var(--dim)]">{def.blurb}</p>
        <EarningsLine entry={earnings} note={noEarnings} />
        <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)]">
          No dossier yet · open desk ▸
        </div>
      </Link>
    );
  }

  const win = WINNER[d.day_winner] ?? WINNER.flat;
  const act = ACTION[d.decision.action] ?? ACTION.hold;
  const change = d.snapshot.change_pct;
  const changeTone =
    change > 0 ? "text-[var(--up)]" : change < 0 ? "text-[var(--down)]" : "text-[var(--dim)]";

  return (
    <Link
      href={def.href}
      className="group block border border-[var(--border)] bg-[var(--panel)] px-3 py-3 transition-colors hover:border-[var(--amber-dim)] hover:bg-[rgba(255,165,0,0.04)]"
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[15px] font-bold text-[var(--foreground)]">
            {d.symbol}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--dim)]">
            {d.name}
          </span>
        </div>
        <span
          className={cn(
            "shrink-0 border px-2 py-0.5 font-mono text-[13px] font-bold uppercase tracking-widest",
            act.text,
            act.border,
            act.bg,
          )}
        >
          {d.decision.action.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-1.5 flex items-baseline gap-2 font-mono">
        <span className="text-[17px] font-bold tabular-nums text-[var(--foreground)]">
          {d.currency_symbol ?? "$"}
          {formatLevel(d.snapshot.price)}
        </span>
        <span className={cn("text-[12px] font-semibold", changeTone)}>{formatPct(change)}</span>
        <span className={cn("ml-auto text-[10px] uppercase tracking-widest", win.text)}>
          {win.emoji} {win.label} won
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
        <span className="text-[var(--amber-dim)]">{d.decision.conviction} conv</span>
        <span>·</span>
        <span>{d.decision.horizon}</span>
        <span className="ml-auto text-[var(--dim)]">{d.date}</span>
      </div>

      <p className="mt-1.5 line-clamp-3 font-mono text-[11px] leading-relaxed text-[var(--dim)]">
        {d.decision.rationale}
      </p>

      <EarningsLine entry={earnings} note={noEarnings} />

      <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] group-hover:text-[var(--amber)]">
        Full analysis ▸
      </div>
    </Link>
  );
}

export default async function StocksHubPage() {
  // Live next-earnings dates for the desks that report (skips BTC/SPCX).
  const earningsItems = STOCKS.filter((s) => EARNINGS_SYMBOL[s.id]).map((s) => ({
    symbol: EARNINGS_SYMBOL[s.id]!,
    label: s.name,
  }));
  const earnings = await getNextEarnings(earningsItems);

  const stocks = STOCKS.map((def) => ({ def, d: getLatestAssetDaily(def.id) }));

  return (
    <div className="space-y-1">
      <header className="space-y-1 px-1 pb-2">
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] hover:underline"
        >
          ◂ DASHBOARD
        </Link>
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Stocks
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          Single-name desks · standing call + full daily analysis
        </p>
      </header>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {stocks.map(({ def, d }) => (
          <StockCard
            key={def.id}
            def={def}
            d={d}
            earnings={EARNINGS_SYMBOL[def.id] ? earnings.get(EARNINGS_SYMBOL[def.id]!) : null}
            noEarnings={NO_EARNINGS[def.id]}
          />
        ))}
      </div>

      <p className="px-1 pt-2 font-mono text-[10px] leading-snug text-[var(--dim)]">
        Each desk is a once-per-day dossier: who made money today, the standing
        buy/hold/sell call, positioning, news, outlook, key levels, and catalysts.
        Click any card for the full read. Next-earnings dates are live from Yahoo — see
        the{" "}
        <Link href="/earnings" className="text-[var(--cyan-term)] hover:underline">
          full earnings calendar
        </Link>{" "}
        for the whole watchlist with EPS &amp; revenue consensus.
      </p>
    </div>
  );
}
