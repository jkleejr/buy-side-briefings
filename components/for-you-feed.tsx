"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { SymbolSearchResult, TradeQuote, CompanyProfile } from "@/lib/markets";
import type { HolderRelevance } from "@/lib/relevance";
import type { MacroSignal } from "@/lib/macro-signals";
import { FACTOR_META, materialFactors, factorsFromProfile, type Factor } from "@/lib/factors";
import { useHoldings, type Holding } from "@/lib/holdings";
import { formatPct } from "@/lib/utils";
import Panel from "./panel";

// ---------------------------------------------------------------------------
// "For You" — the so-what-for-me layer. Reads the user's holdings (this browser)
// and answers what today means for THEIR book, in three tiers:
//   • deep desk  — a hand-built daily dossier (NVDA, BTC, …): full call + P&L
//   • lite desk  — a routine-written read for a requested name: call + bull/bear
//   • uncovered  — live price + macro factor chips, with a "request a desk" ask
// Pure client composition over data the build already produced; the request
// button posts to the coverage queue the daily routine reads.
// ---------------------------------------------------------------------------

const REQUESTS_KEY = "bsb_coverage_requests_v1";
const LITE_READ_KEY = "bsb_lite_read_v1";

// Shape returned by /api/lite-read (mirrors lib/lite-read LiteRead; typed here
// so the client never imports that server module / the Anthropic SDK).
type LiteReadDTO = {
  symbol: string;
  name: string;
  action: HolderRelevance["action"];
  conviction: HolderRelevance["conviction"];
  rationale: string;
  bull: string;
  bear: string;
  price: number | null;
  changePct: number | null;
  date: string;
};

function readToRelevance(r: LiteReadDTO): HolderRelevance {
  const sym = r.symbol.toUpperCase();
  return {
    tier: "lite",
    sourceLabel: "AI",
    symbol: sym,
    name: r.name,
    href: undefined,
    aliases: [sym],
    action: r.action,
    conviction: r.conviction,
    dayWinner: "flat",
    price: r.price ?? NaN,
    changePct: r.changePct ?? NaN,
    currencySymbol: "$",
    holderLine: r.rationale,
    topBull: r.bull,
    topBear: r.bear,
    date: r.date,
  };
}

// Today in the user's local (≈ET) date, for a once-per-day read cache.
function clientToday(): string {
  return new Date().toLocaleDateString("en-CA");
}

function loadCachedReads(): Record<string, HolderRelevance> {
  try {
    const raw = localStorage.getItem(LITE_READ_KEY);
    const obj: Record<string, LiteReadDTO> = raw ? JSON.parse(raw) : {};
    const today = clientToday();
    const out: Record<string, HolderRelevance> = {};
    for (const [sym, r] of Object.entries(obj)) {
      if (r && r.date === today) out[sym.toUpperCase()] = readToRelevance(r);
    }
    return out;
  } catch {
    return {};
  }
}

function saveCachedRead(r: LiteReadDTO) {
  try {
    const raw = localStorage.getItem(LITE_READ_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[r.symbol.toUpperCase()] = r;
    localStorage.setItem(LITE_READ_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

const ACTION_LABEL: Record<HolderRelevance["action"], string> = {
  buy: "BUY",
  hold: "HOLD",
  sell: "SELL",
  step_aside: "STEP ASIDE",
};

function actionClasses(action: HolderRelevance["action"]): string {
  switch (action) {
    case "buy":
      return "border-[var(--up)] text-[var(--up)]";
    case "sell":
      return "border-[var(--down)] text-[var(--down)]";
    case "hold":
      return "border-[var(--amber-dim)] text-[var(--amber)]";
    default:
      return "border-[var(--border-strong)] text-[var(--dim)]";
  }
}

function pctTone(n: number | null | undefined): string {
  return n == null || !Number.isFinite(n)
    ? "text-[var(--dim)]"
    : n > 0
      ? "text-[var(--up)]"
      : n < 0
        ? "text-[var(--down)]"
        : "text-[var(--dim)]";
}

function winnerChip(w: HolderRelevance["dayWinner"]) {
  const map = {
    bulls: { label: "BULLS PAID", cls: "text-[var(--up)]" },
    bears: { label: "BEARS PAID", cls: "text-[var(--down)]" },
    flat: { label: "FLAT", cls: "text-[var(--dim)]" },
  } as const;
  return map[w];
}

function fmtPrice(n: number, sym: string): string {
  return `${sym}${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

// P&L vs the user's cost basis, using the best price available.
function pnl(price: number | null | undefined, h: Holding) {
  if (price == null || !Number.isFinite(price) || h.costBasis == null || h.costBasis <= 0)
    return null;
  const pct = ((price - h.costBasis) / h.costBasis) * 100;
  const abs = h.shares != null ? (price - h.costBasis) * h.shares : null;
  return { pct, abs };
}

/** Inline, optional position-size editor (shares + average cost). */
function SizeEditor({
  h,
  onSave,
  onClose,
}: {
  h: Holding;
  onSave: (patch: Partial<Pick<Holding, "shares" | "costBasis">>) => void;
  onClose: () => void;
}) {
  const [shares, setShares] = useState(h.shares?.toString() ?? "");
  const [cost, setCost] = useState(h.costBasis?.toString() ?? "");
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-2 font-mono text-[11px]">
      <label className="flex items-center gap-1 text-[var(--dim)]">
        shares
        <input
          inputMode="decimal"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          className="w-20 border border-[var(--border)] bg-black px-1.5 py-0.5 text-[var(--foreground)] focus:border-[var(--amber)] focus:outline-none"
          placeholder="—"
        />
      </label>
      <label className="flex items-center gap-1 text-[var(--dim)]">
        avg cost
        <input
          inputMode="decimal"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="w-24 border border-[var(--border)] bg-black px-1.5 py-0.5 text-[var(--foreground)] focus:border-[var(--amber)] focus:outline-none"
          placeholder="—"
        />
      </label>
      <button
        type="button"
        onClick={() => {
          const s = parseFloat(shares);
          const c = parseFloat(cost);
          onSave({
            shares: Number.isFinite(s) && s > 0 ? s : undefined,
            costBasis: Number.isFinite(c) && c > 0 ? c : undefined,
          });
          onClose();
        }}
        className="border border-[var(--amber-dim)] px-2 py-0.5 text-[var(--amber)] hover:bg-[rgba(255,165,0,0.1)]"
      >
        save
      </button>
      <button
        type="button"
        onClick={onClose}
        className="px-1 text-[var(--dim)] hover:text-[var(--foreground)]"
      >
        cancel
      </button>
    </div>
  );
}

function PnlLine({
  price,
  priceNote,
  h,
  sym,
}: {
  price: number | null | undefined;
  priceNote?: string;
  h: Holding;
  sym: string;
}) {
  const p = pnl(price, h);
  if (!p) return null;
  const arrow = p.pct > 0 ? "▲" : p.pct < 0 ? "▼" : "■";
  return (
    <div className={`mt-1.5 font-mono text-[11px] ${pctTone(p.pct)}`}>
      {arrow} {formatPct(p.pct)} vs your {fmtPrice(h.costBasis as number, sym)} basis
      {p.abs != null && (
        <span>
          {" · "}
          {p.abs >= 0 ? "+" : "−"}
          {fmtPrice(Math.abs(p.abs), sym)}
        </span>
      )}
      {priceNote && <span className="text-[var(--dim)]"> · {priceNote}</span>}
    </div>
  );
}

// A one-line, data-grounded read for an uncovered name: sector/industry + beta,
// plus which of today's active macro pressures actually touch it.
function explainUncovered(
  profile: CompanyProfile | undefined,
  activeChips: Factor[],
): string | null {
  if (!profile || (!profile.sector && !profile.industry)) return null;
  const desc = [profile.sector, profile.industry].filter(Boolean).join(" · ");
  const betaNote =
    profile.beta == null
      ? null
      : profile.beta >= 1.3
        ? `high-beta (β ${profile.beta.toFixed(1)})`
        : profile.beta <= 0.8
          ? `low-beta (β ${profile.beta.toFixed(1)})`
          : `β ${profile.beta.toFixed(1)}`;
  const head = [desc, betaNote].filter(Boolean).join(" · ");
  if (activeChips.length) {
    const names = activeChips.map((f) => FACTOR_META[f].pressureHeadline.toLowerCase());
    const joined =
      names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
    return `${head} — today's ${joined} weigh on it.`;
  }
  return `${head} — macro is quiet for it today.`;
}

/** Small amber pressure chips for the macro factors hitting a given name. */
function FactorChips({ factors }: { factors: Factor[] }) {
  if (factors.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {factors.map((f) => (
        <span
          key={f}
          title={`${FACTOR_META[f].pressureHeadline} — active in today's regime`}
          className="border border-[var(--amber-dim)] px-1 py-px text-[8.5px] font-bold tracking-widest text-[var(--amber)]"
        >
          {FACTOR_META[f].chip}
        </span>
      ))}
    </span>
  );
}

/** Full "so what" card — shared by deep desks and lite reads. */
function RelevanceCard({
  rel,
  h,
  chips,
  liveQuote,
  onRemove,
  isEditing,
  onEdit,
  onCloseEdit,
  onSaveSize,
}: {
  rel: HolderRelevance;
  h: Holding;
  chips: Factor[];
  liveQuote?: TradeQuote;
  onRemove: () => void;
  isEditing: boolean;
  onEdit: () => void;
  onCloseEdit: () => void;
  onSaveSize: (patch: Partial<Pick<Holding, "shares" | "costBasis">>) => void;
}) {
  const isLite = rel.tier === "lite";
  // Deep desks carry a last-close from the dossier; lite reads may need a quote.
  const price = Number.isFinite(rel.price) ? rel.price : liveQuote?.price ?? null;
  const changePct = Number.isFinite(rel.changePct)
    ? rel.changePct
    : liveQuote?.changePct ?? null;
  const win = winnerChip(rel.dayWinner);
  const priceNote = isLite
    ? `${(rel.sourceLabel ?? "lite").toLowerCase()} read · ${rel.date}`
    : `at ${rel.date} close`;

  return (
    <div className="border border-[var(--border)] bg-black p-2.5">
      {/* header: ticker + standing call */}
      <div className="flex items-baseline justify-between gap-2">
        {rel.href ? (
          <Link
            href={rel.href}
            className="flex items-baseline gap-1.5 hover:underline"
            title={`Open the ${rel.name} desk`}
          >
            <span className="text-[13px] font-bold text-[var(--foreground)]">{rel.symbol}</span>
            <span className="truncate text-[9px] uppercase tracking-widest text-[var(--dim)]">
              {rel.name}
            </span>
          </Link>
        ) : (
          <span className="flex items-baseline gap-1.5">
            <span className="text-[13px] font-bold text-[var(--foreground)]">{rel.symbol}</span>
            <span className="truncate text-[9px] uppercase tracking-widest text-[var(--dim)]">
              {rel.name}
            </span>
          </span>
        )}
        <div className="flex shrink-0 items-center gap-1.5">
          {isLite && rel.sourceLabel && (
            <span className="border border-[var(--border-strong)] px-1 py-0.5 text-[8.5px] font-bold tracking-widest text-[var(--dim)]">
              {rel.sourceLabel}
            </span>
          )}
          <span
            className={`border px-1.5 py-0.5 text-[10px] font-bold tracking-widest ${actionClasses(rel.action)}`}
          >
            {ACTION_LABEL[rel.action]}
          </span>
          <button
            type="button"
            onClick={onRemove}
            title={`Remove ${rel.symbol}`}
            className="text-[11px] text-[var(--dim)] hover:text-[var(--down)]"
          >
            ✕
          </button>
        </div>
      </div>

      {/* price + day read */}
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[14px] font-bold tabular-nums text-[var(--foreground)]">
          {price != null ? fmtPrice(price, rel.currencySymbol) : "—"}
        </span>
        <span className={`text-[11px] font-semibold tabular-nums ${pctTone(changePct)}`}>
          {changePct == null ? "—" : formatPct(changePct)}
        </span>
        {!isLite && (
          <span className={`ml-auto text-[9px] tracking-widest ${win.cls}`}>{win.label}</span>
        )}
      </div>

      {/* macro pressures hitting this name today */}
      {chips.length > 0 && (
        <div className="mt-1.5">
          <FactorChips factors={chips} />
        </div>
      )}

      {/* the so-what */}
      <div className="mt-1.5 text-[12px] leading-snug text-[var(--foreground)]">
        {rel.holderLine}
      </div>

      {/* strongest bull / bear */}
      <div className="mt-2 space-y-1 text-[10.5px] leading-snug">
        {rel.topBull && (
          <div className="flex gap-1.5">
            <span className="shrink-0 font-bold text-[var(--up)]">BULL</span>
            <span className="text-[var(--dim)]">{rel.topBull}</span>
          </div>
        )}
        {rel.topBear && (
          <div className="flex gap-1.5">
            <span className="shrink-0 font-bold text-[var(--down)]">BEAR</span>
            <span className="text-[var(--dim)]">{rel.topBear}</span>
          </div>
        )}
      </div>

      {/* P&L + size editor */}
      <PnlLine price={price} priceNote={priceNote} h={h} sym={rel.currencySymbol} />
      {isEditing ? (
        <SizeEditor h={h} onSave={onSaveSize} onClose={onCloseEdit} />
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="mt-1.5 text-[10px] text-[var(--amber-dim)] hover:text-[var(--amber)]"
        >
          {h.costBasis != null ? "edit size" : "+ add shares / cost basis"}
        </button>
      )}
    </div>
  );
}

type BookDigestData = {
  total: number;
  uncoveredCount: number;
  counts: Record<HolderRelevance["action"], number>;
  pnl: { abs: number; n: number } | null;
  standout: {
    symbol: string;
    href?: string;
    action: HolderRelevance["action"];
    conviction: HolderRelevance["conviction"];
    line: string;
  } | null;
};

/** Top-of-feed synthesis: the whole book in a glance. */
function BookDigest({ d }: { d: BookDigestData }) {
  const posture = (
    [
      ["BUY", d.counts.buy, "text-[var(--up)]"],
      ["HOLD", d.counts.hold, "text-[var(--amber)]"],
      ["SELL", d.counts.sell, "text-[var(--down)]"],
      ["STAND ASIDE", d.counts.step_aside, "text-[var(--dim)]"],
    ] as const
  ).filter(([, n]) => n > 0);

  return (
    <div className="border border-[var(--amber-dim)] bg-black">
      <div className="flex items-baseline justify-between border-b border-[var(--amber-dim)] px-2 py-1">
        <span className="text-[9px] uppercase tracking-widest text-[var(--amber)]">
          ▣ Your book today
        </span>
        <span className="text-[9px] tracking-widest text-[var(--dim)]">
          {d.total} HOLDING{d.total === 1 ? "" : "S"}
        </span>
      </div>
      <div className="space-y-1.5 px-2 py-1.5">
        {/* posture */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px]">
          <span className="text-[9px] uppercase tracking-widest text-[var(--dim)]">posture</span>
          {posture.map(([label, n, cls], i) => (
            <span key={label} className="tabular-nums">
              {i > 0 && <span className="mr-2 text-[var(--border-strong)]">·</span>}
              <span className={`font-bold ${cls}`}>{n}</span>{" "}
              <span className={cls}>{label}</span>
            </span>
          ))}
          {d.uncoveredCount > 0 && (
            <span className="text-[var(--dim)]">
              <span className="mr-2 text-[var(--border-strong)]">·</span>
              {d.uncoveredCount} no desk
            </span>
          )}
        </div>

        {/* aggregate unrealized P&L (USD positions with shares + cost basis) */}
        {d.pnl && (
          <div className="text-[11px]">
            <span className="text-[9px] uppercase tracking-widest text-[var(--dim)]">
              unrealized
            </span>{" "}
            <span className={`font-bold tabular-nums ${pctTone(d.pnl.abs)}`}>
              {d.pnl.abs >= 0 ? "+" : "−"}${Math.abs(d.pnl.abs).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>{" "}
            <span className="text-[var(--dim)]">
              across {d.pnl.n} position{d.pnl.n === 1 ? "" : "s"} with a cost basis
            </span>
          </div>
        )}

        {/* the one thing that wants attention */}
        {d.standout && (
          <div className="flex items-start gap-1.5 text-[11px] leading-snug">
            <span className="shrink-0 text-[var(--amber)]">▶</span>
            <span>
              <span
                className={`mr-1 border px-1 py-px text-[9px] font-bold tracking-widest ${actionClasses(d.standout.action)}`}
              >
                {ACTION_LABEL[d.standout.action]}
              </span>
              {d.standout.href ? (
                <Link href={d.standout.href} className="font-bold text-[var(--foreground)] hover:underline">
                  {d.standout.symbol}
                </Link>
              ) : (
                <span className="font-bold text-[var(--foreground)]">{d.standout.symbol}</span>
              )}{" "}
              <span className="text-[var(--dim)]">{d.standout.line}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForYouFeed({
  relevance,
  liteRelevance = [],
  macroSignals = [],
}: {
  relevance: HolderRelevance[];
  liteRelevance?: HolderRelevance[];
  macroSignals?: MacroSignal[];
}) {
  const { mounted, holdings, add, remove, update } = useHoldings();

  // search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const [quotes, setQuotes] = useState<Record<string, TradeQuote>>({});
  // Sector / industry / beta per uncovered symbol — drives a generic factor
  // read so any held ticker gets an explanation, not just the curated names.
  const [profiles, setProfiles] = useState<Record<string, CompanyProfile>>({});
  const [editing, setEditing] = useState<string | null>(null);
  // Symbols the user has asked for a desk on (mirrored to localStorage so the
  // ask survives a read-only prod runtime that can't write the queue file).
  const [requested, setRequested] = useState<Set<string>>(new Set());
  // On-demand AI holder reads for uncovered names, keyed by uppercase symbol.
  const [aiReads, setAiReads] = useState<Record<string, HolderRelevance>>({});
  const [aiLoading, setAiLoading] = useState<Set<string>>(new Set());
  const aiAttempted = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REQUESTS_KEY);
      const arr: Array<{ symbol: string }> = raw ? JSON.parse(raw) : [];
      setRequested(new Set(arr.map((r) => r.symbol.toUpperCase())));
    } catch {
      /* ignore */
    }
    const cached = loadCachedReads();
    if (Object.keys(cached).length) {
      setAiReads(cached);
      for (const s of Object.keys(cached)) aiAttempted.current.add(s);
    }
  }, []);

  // Bucket holdings into deep desk → lite desk → uncovered.
  const { deep, lite, uncovered } = useMemo(() => {
    const dp: Array<{ h: Holding; rel: HolderRelevance }> = [];
    const lt: Array<{ h: Holding; rel: HolderRelevance }> = [];
    const unc: Holding[] = [];
    for (const h of holdings) {
      const sym = h.symbol.toUpperCase();
      const deepRel = relevance.find((r) => r.aliases.includes(sym));
      if (deepRel) {
        dp.push({ h, rel: deepRel });
        continue;
      }
      const liteRel = liteRelevance.find((r) => r.aliases.includes(sym));
      if (liteRel) {
        lt.push({ h, rel: liteRel });
        continue;
      }
      unc.push(h);
    }
    return { deep: dp, lite: lt, uncovered: unc };
  }, [holdings, relevance, liteRelevance]);

  // An uncovered name upgrades to a full card once its on-demand AI read lands;
  // the rest stay as bare rows with a "get an AI read" ask.
  const { aiCovered, stillUncovered } = useMemo(() => {
    const cov: Array<{ h: Holding; rel: HolderRelevance }> = [];
    const rest: Holding[] = [];
    for (const h of uncovered) {
      const rel = aiReads[h.symbol.toUpperCase()];
      if (rel) cov.push({ h, rel });
      else rest.push(h);
    }
    return { aiCovered: cov, stillUncovered: rest };
  }, [uncovered, aiReads]);

  // Request an on-demand AI read for one uncovered name. Caches per-day in
  // localStorage; degrades silently (row stays uncovered) when unavailable.
  const fetchAiRead = useCallback(
    async (symbol: string) => {
      const sym = symbol.toUpperCase();
      if (aiReads[sym] || aiLoading.has(sym)) return;
      aiAttempted.current.add(sym);
      setAiLoading((p) => new Set(p).add(sym));
      try {
        const res = await fetch(`/api/lite-read?symbol=${encodeURIComponent(sym)}`, {
          cache: "no-store",
        });
        const data: { ok: boolean; read?: LiteReadDTO } = await res.json();
        if (data?.ok && data.read) {
          saveCachedRead(data.read);
          setAiReads((p) => ({ ...p, [sym]: readToRelevance(data.read!) }));
        }
      } catch {
        /* ignore — row stays uncovered */
      } finally {
        setAiLoading((p) => {
          const n = new Set(p);
          n.delete(sym);
          return n;
        });
      }
    },
    [aiReads, aiLoading],
  );

  // A name's factor exposure: the curated map first, else inferred from its
  // sector/beta profile. This is what lets any held ticker get a macro read.
  const factorsForSym = useCallback(
    (symbol: string): Factor[] => {
      const curated = materialFactors(symbol);
      if (curated.length) return curated;
      const p = profiles[symbol.toUpperCase()];
      return p ? factorsFromProfile(p) : [];
    },
    [profiles],
  );

  // Cross active macro pressures with each holding's factor exposure.
  const { chipsFor, bookMacro } = useMemo(() => {
    const pressures = macroSignals.filter((s) => s.state === "pressure");
    const noteByFactor = new Map<Factor, string>();
    for (const s of pressures) if (!noteByFactor.has(s.factor)) noteByFactor.set(s.factor, s.note);
    const activeFactors = new Set(pressures.map((s) => s.factor));

    const chipsFor = (symbol: string): Factor[] =>
      factorsForSym(symbol).filter((f) => activeFactors.has(f));

    const bookMacro = Array.from(activeFactors)
      .map((factor) => ({
        factor,
        note: noteByFactor.get(factor) ?? "",
        names: holdings
          .filter((h) => factorsForSym(h.symbol).includes(factor))
          .map((h) => h.symbol.toUpperCase()),
      }))
      .filter((row) => row.names.length > 0)
      .sort((a, b) => b.names.length - a.names.length);

    return { chipsFor, bookMacro };
  }, [macroSignals, holdings, factorsForSym]);

  // Resolve a best price + currency per holding (dossier close, else live quote).
  const resolved = useMemo(() => {
    const m = new Map<string, { price: number | null; currency: string }>();
    for (const { h, rel } of deep)
      m.set(h.symbol.toUpperCase(), {
        price: Number.isFinite(rel.price) ? rel.price : null,
        currency: rel.currencySymbol,
      });
    for (const { h, rel } of lite)
      m.set(h.symbol.toUpperCase(), {
        price: Number.isFinite(rel.price) ? rel.price : quotes[rel.symbol]?.price ?? null,
        currency: rel.currencySymbol,
      });
    for (const h of uncovered)
      m.set(h.symbol.toUpperCase(), {
        price: quotes[h.symbol.toUpperCase()]?.price ?? null,
        currency: "$",
      });
    return m;
  }, [deep, lite, uncovered, quotes]);

  // Synthesize the whole book: posture mix, aggregate unrealized P&L, and the
  // single most actionable call. The glance that reduces the rest to detail.
  const digest = useMemo<BookDigestData>(() => {
    const calls = [...deep, ...lite, ...aiCovered];
    const counts: Record<HolderRelevance["action"], number> = {
      buy: 0,
      hold: 0,
      sell: 0,
      step_aside: 0,
    };
    for (const { rel } of calls) counts[rel.action] += 1;

    const aRank: Record<HolderRelevance["action"], number> = {
      sell: 3,
      buy: 2,
      step_aside: 1,
      hold: 0,
    };
    const cRank: Record<HolderRelevance["conviction"], number> = { high: 3, medium: 2, low: 1 };
    let standout: BookDigestData["standout"] = null;
    let best = 0;
    for (const { rel } of calls) {
      if (aRank[rel.action] === 0) continue; // a plain hold isn't a callout
      const score = aRank[rel.action] * 10 + cRank[rel.conviction];
      if (score > best) {
        best = score;
        standout = {
          symbol: rel.symbol,
          href: rel.href,
          action: rel.action,
          conviction: rel.conviction,
          line: rel.holderLine,
        };
      }
    }

    // Aggregate unrealized only across USD positions that have shares + basis.
    let abs = 0;
    let n = 0;
    for (const h of holdings) {
      if (h.costBasis == null || h.shares == null) continue;
      const r = resolved.get(h.symbol.toUpperCase());
      if (!r || r.price == null || r.currency !== "$") continue;
      abs += (r.price - h.costBasis) * h.shares;
      n += 1;
    }

    return {
      total: holdings.length,
      uncoveredCount: stillUncovered.length,
      counts,
      pnl: n > 0 ? { abs, n } : null,
      standout,
    };
  }, [deep, lite, aiCovered, stillUncovered, holdings, resolved]);

  // Fetch live quotes for names without a dossier price: all uncovered, plus
  // any lite read missing a snapshot.
  const quoteSyms = useMemo(() => {
    const s = new Set(uncovered.map((h) => h.symbol.toUpperCase()));
    for (const { rel } of lite) if (!Number.isFinite(rel.price)) s.add(rel.symbol);
    return Array.from(s);
  }, [uncovered, lite]);

  useEffect(() => {
    if (quoteSyms.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/price?symbols=${encodeURIComponent(quoteSyms.join(","))}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data: { quotes: TradeQuote[] } = await res.json();
        if (cancelled) return;
        const map: Record<string, TradeQuote> = {};
        for (const q of data.quotes) map[q.symbol.toUpperCase()] = q;
        setQuotes((p) => ({ ...p, ...map }));
      } catch {
        /* ignore — row just shows no price */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteSyms]);

  // Fetch sector/beta profiles for uncovered names not already in the curated
  // factor map — that's what gives them a real macro read + explanation.
  const profileSyms = useMemo(
    () =>
      uncovered
        .map((h) => h.symbol.toUpperCase())
        .filter((sym) => materialFactors(sym).length === 0 && !profiles[sym]),
    [uncovered, profiles],
  );

  useEffect(() => {
    if (profileSyms.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/profile?symbols=${encodeURIComponent(profileSyms.join(","))}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data: { profiles: CompanyProfile[] } = await res.json();
        if (cancelled) return;
        const map: Record<string, CompanyProfile> = {};
        for (const p of data.profiles) map[p.symbol.toUpperCase()] = p;
        setProfiles((prev) => ({ ...prev, ...map }));
      } catch {
        /* ignore — row just falls back to "no desk yet" */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileSyms]);

  // search (debounced)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const data: { results: SymbolSearchResult[] } = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const onAdd = useCallback(
    (r: SymbolSearchResult) => {
      add({ symbol: r.symbol, name: r.name });
      setQuery("");
      setResults([]);
      setOpen(false);
    },
    [add],
  );

  // Ask the daily routine to start a desk on an uncovered name. Records to the
  // coverage queue (best-effort) and always mirrors to localStorage.
  const requestDesk = useCallback(async (h: Holding) => {
    const sym = h.symbol.toUpperCase();
    setRequested((prev) => new Set(prev).add(sym));
    try {
      const raw = localStorage.getItem(REQUESTS_KEY);
      const arr: Array<{ symbol: string; name: string; requestedAt: string }> = raw
        ? JSON.parse(raw)
        : [];
      if (!arr.some((r) => r.symbol.toUpperCase() === sym)) {
        arr.unshift({ symbol: sym, name: h.name, requestedAt: new Date().toISOString() });
        localStorage.setItem(REQUESTS_KEY, JSON.stringify(arr));
      }
    } catch {
      /* ignore */
    }
    try {
      await fetch("/api/coverage-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym, name: h.name }),
      });
    } catch {
      /* persisted in localStorage regardless */
    }
  }, []);

  const deepCount = relevance.length;

  return (
    <Panel
      code="FORYOU"
      title="Your book — so what for you?"
    >
      <div className="space-y-2 p-2 font-mono">
        {/* add box */}
        <div className="relative">
          <div className="flex items-center gap-2 border border-[var(--border)] bg-black px-2 py-1.5 focus-within:border-[var(--amber)]">
            <span className="text-[11px] text-[var(--amber)]">＋</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length && setOpen(true)}
              placeholder="Add a holding — ticker or company (NVDA, Nvidia, BTC-USD)"
              className="w-full bg-transparent text-[13px] text-[var(--foreground)] placeholder:text-[var(--dim)] focus:outline-none"
            />
            {searching && <span className="text-[10px] text-[var(--dim)]">…</span>}
          </div>

          {open && results.length > 0 && (
            <ul className="absolute z-20 mt-0.5 max-h-72 w-full overflow-y-auto border border-[var(--amber-dim)] bg-black shadow-[0_8px_30px_rgba(0,0,0,0.8)]">
              {results.map((r) => (
                <li key={`${r.symbol}-${r.exchange}`}>
                  <button
                    type="button"
                    onClick={() => onAdd(r)}
                    className="flex w-full items-baseline gap-2 px-2 py-1.5 text-left text-[12px] hover:bg-[rgba(255,165,0,0.1)]"
                  >
                    <span className="w-20 shrink-0 font-bold text-[var(--amber)]">{r.symbol}</span>
                    <span className="truncate text-[var(--foreground)]">{r.name}</span>
                    <span className="ml-auto shrink-0 text-[9px] uppercase tracking-widest text-[var(--dim)]">
                      {r.type} {r.exchange ? `· ${r.exchange}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* states */}
        {!mounted ? (
          <div className="py-3 text-center text-[11px] text-[var(--dim)]">Loading…</div>
        ) : holdings.length === 0 ? (
          <div className="border border-dashed border-[var(--border-strong)] px-3 py-5 text-center">
            <div className="text-[12px] text-[var(--foreground)]">
              Add what you own to see what today actually means for your book.
            </div>
            <div className="mt-1 text-[10px] text-[var(--dim)]">
              {deepCount} names have a daily desk; add anything else and request a desk for it.
              Stored in this browser only.
            </div>
          </div>
        ) : (
          <>
            {/* the glance: posture, P&L, the one thing to watch */}
            <BookDigest d={digest} />

            {/* macro on your book — which active pressures touch your names */}
            {bookMacro.length > 0 && (
              <div className="border border-[var(--amber-dim)] bg-[rgba(255,165,0,0.04)]">
                <div className="border-b border-[var(--amber-dim)] px-2 py-1 text-[9px] uppercase tracking-widest text-[var(--amber)]">
                  ⚠ Macro on your book · today's regime
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {bookMacro.map((row) => (
                    <div key={row.factor} className="px-2 py-1.5">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-[11px] font-bold tracking-wide text-[var(--amber)]">
                          {FACTOR_META[row.factor].pressureHeadline}
                        </span>
                        <span className="text-[10px] text-[var(--dim)]">
                          weighs on {row.names.length} of your names:
                        </span>
                        <span className="text-[10px] font-semibold text-[var(--foreground)]">
                          {row.names.join(" · ")}
                        </span>
                      </div>
                      {row.note && (
                        <div className="mt-0.5 text-[10px] leading-snug text-[var(--dim)]">
                          {row.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* deep + lite desks + AI reads — the rich "so what" cards */}
            {(deep.length > 0 || lite.length > 0 || aiCovered.length > 0) && (
              <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
                {[...deep, ...lite, ...aiCovered].map(({ h, rel }) => (
                  <RelevanceCard
                    key={h.symbol}
                    rel={rel}
                    h={h}
                    chips={chipsFor(h.symbol)}
                    liveQuote={quotes[rel.symbol]}
                    onRemove={() => remove(h.symbol)}
                    isEditing={editing === h.symbol}
                    onEdit={() => setEditing(h.symbol)}
                    onCloseEdit={() => setEditing(null)}
                    onSaveSize={(patch) => update(h.symbol, patch)}
                  />
                ))}
              </div>
            )}

            {/* uncovered holdings — live price, macro chips, AI read + desk ask */}
            {stillUncovered.length > 0 && (
              <div className="border border-[var(--border)] bg-black">
                <div className="border-b border-[var(--border)] px-2 py-1 text-[9px] uppercase tracking-widest text-[var(--dim)]">
                  Also in your book · no desk yet
                </div>
                {stillUncovered.map((h) => {
                  const sym = h.symbol.toUpperCase();
                  const q = quotes[sym];
                  const p = pnl(q?.price, h);
                  const asked = requested.has(sym);
                  const loadingRead = aiLoading.has(sym);
                  const chips = chipsFor(h.symbol);
                  const explanation = explainUncovered(profiles[sym], chips);
                  return (
                    <div key={h.symbol} className="px-2 py-1.5">
                      <div className="flex items-baseline gap-2 text-[12px]">
                        <span className="w-16 shrink-0 font-bold text-[var(--foreground)]">
                          {h.symbol}
                        </span>
                        <span className="truncate text-[10px] text-[var(--dim)]">{h.name}</span>
                        {chips.length > 0 && <FactorChips factors={chips} />}
                        <span className="ml-auto shrink-0 tabular-nums text-[var(--foreground)]">
                          {q?.price != null ? fmtPrice(q.price, "$") : "—"}
                        </span>
                        <span
                          className={`w-16 shrink-0 text-right text-[11px] tabular-nums ${pctTone(q?.changePct)}`}
                        >
                          {q?.changePct == null ? "—" : formatPct(q.changePct)}
                        </span>
                        <button
                          type="button"
                          onClick={() => remove(h.symbol)}
                          title={`Remove ${h.symbol}`}
                          className="shrink-0 text-[11px] text-[var(--dim)] hover:text-[var(--down)]"
                        >
                          ✕
                        </button>
                      </div>
                      {explanation && (
                        <div className="mt-1 text-[11px] leading-snug text-[var(--foreground)]">
                          {explanation}
                        </div>
                      )}
                      <div className="mt-0.5 flex items-baseline gap-2 text-[10px]">
                        {p && (
                          <span className={`tabular-nums ${pctTone(p.pct)}`}>
                            {formatPct(p.pct)} vs your basis
                          </span>
                        )}
                        <span className="ml-auto flex items-center gap-3">
                          {loadingRead ? (
                            <span className="text-[var(--cyan)]">analyzing…</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fetchAiRead(sym)}
                              className="text-[var(--cyan)] hover:text-[var(--foreground)]"
                            >
                              get an AI read →
                            </button>
                          )}
                          {asked ? (
                            <span className="text-[var(--up)]">✓ desk requested</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => requestDesk(h)}
                              className="text-[var(--amber-dim)] hover:text-[var(--amber)]"
                            >
                              request a daily desk →
                            </button>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
