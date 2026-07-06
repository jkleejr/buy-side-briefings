import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  AssetDaily,
  AssetId,
  DayWinner,
  TradeAction,
  NewsItem,
  KeyLevel,
} from "@/lib/asset-daily";
import { cn, formatLevel, formatPct } from "@/lib/utils";
import LevelsGauge from "./levels-gauge";
import OptionsStructureCard from "./options-structure-card";
import ScenarioPayoffCard from "./scenario-payoff-card";
import Panel from "./panel";

// ---- small presentational helpers -----------------------------------------

function changeTone(n: number): string {
  return n > 0 ? "text-[var(--up)]" : n < 0 ? "text-[var(--down)]" : "text-[var(--dim)]";
}

// Cross-desk reads: the other surfaces an investor in this name should glance at.
const RELATED: Partial<Record<AssetId, { label: string; href: string }[]>> = {
  nvda: [{ label: "SK Hynix · HBM supplier", href: "/skhynix" }],
  skhynix: [{ label: "NVIDIA · key customer", href: "/nvidia" }],
  btc: [{ label: "Crypto desk", href: "/crypto" }],
};

const WINNER_META: Record<
  DayWinner,
  { emoji: string; label: string; text: string; glow: string; border: string; bg: string }
> = {
  bulls: {
    emoji: "🐂",
    label: "BULLS WON TODAY",
    text: "text-[var(--up)]",
    glow: "glow-up",
    border: "border-[var(--up)]",
    bg: "bg-[rgba(34,197,94,0.08)]",
  },
  bears: {
    emoji: "🐻",
    label: "BEARS WON TODAY",
    text: "text-[var(--down)]",
    glow: "glow-down",
    border: "border-[var(--down)]",
    bg: "bg-[rgba(239,68,68,0.08)]",
  },
  flat: {
    emoji: "➖",
    label: "FLAT — A WASH",
    text: "text-[var(--dim)]",
    glow: "",
    border: "border-[var(--border-strong)]",
    bg: "bg-[var(--panel-head)]",
  },
};

const ACTION_META: Record<
  TradeAction,
  { label: string; text: string; glow: string; border: string; bg: string }
> = {
  buy: {
    label: "BUY",
    text: "text-[var(--up)]",
    glow: "glow-up",
    border: "border-[var(--up)]",
    bg: "bg-[rgba(34,197,94,0.08)]",
  },
  hold: {
    label: "HOLD",
    text: "text-[var(--amber)]",
    glow: "glow-amber",
    border: "border-[var(--amber)]",
    bg: "bg-[rgba(255,165,0,0.08)]",
  },
  sell: {
    label: "SELL",
    text: "text-[var(--down)]",
    glow: "glow-down",
    border: "border-[var(--down)]",
    bg: "bg-[rgba(239,68,68,0.08)]",
  },
  step_aside: {
    label: "STEP ASIDE",
    text: "text-[var(--amber)]",
    glow: "glow-amber",
    border: "border-[var(--amber)]",
    bg: "bg-[rgba(255,165,0,0.08)]",
  },
};

function sentimentDot(s?: NewsItem["sentiment"]): string {
  return s === "positive"
    ? "text-[var(--up)]"
    : s === "negative"
      ? "text-[var(--down)]"
      : "text-[var(--dim)]";
}

function levelTone(kind: KeyLevel["kind"]): string {
  return kind === "support"
    ? "text-[var(--up)]"
    : kind === "resistance"
      ? "text-[var(--down)]"
      : "text-[var(--amber)]";
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "neutral";
}) {
  const toneCls =
    tone === "up"
      ? "text-[var(--up)]"
      : tone === "down"
        ? "text-[var(--down)]"
        : "text-[var(--foreground)]";
  return (
    <div className="border border-[var(--border)] bg-black px-2 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
        {label}
      </div>
      <div className={cn("mt-0.5 font-mono text-[13px]", toneCls)}>{value}</div>
    </div>
  );
}

// ---- main view -------------------------------------------------------------

// ---- "what changed since yesterday" ----------------------------------------

function DeltaStrip({ series }: { series: AssetDaily[] }) {
  const today = series[0];
  const prev = series[1];
  if (!prev) return null;

  // Consecutive days (incl. today) the standing call has been the same.
  let streak = 1;
  for (let i = 1; i < series.length; i++) {
    if (series[i].decision.action === today.decision.action) streak += 1;
    else break;
  }

  const changes: React.ReactNode[] = [];
  if (prev.decision.action !== today.decision.action) {
    changes.push(
      <span key="call" className="font-bold text-[var(--amber)]">
        CALL CHANGED: {prev.decision.action.toUpperCase()} ▸ {today.decision.action.toUpperCase()}
      </span>,
    );
  }
  if (prev.decision.conviction !== today.decision.conviction) {
    changes.push(
      <span key="conv" className="text-[var(--foreground)]">
        conviction {prev.decision.conviction} ▸ {today.decision.conviction}
      </span>,
    );
  }
  if (prev.day_winner !== today.day_winner) {
    changes.push(
      <span key="win" className="text-[var(--foreground)]">
        session winner {prev.day_winner} ▸ {today.day_winner}
      </span>,
    );
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 font-mono text-[11px]">
      <span className="text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
        Δ vs {prev.date}
      </span>
      {changes}
      {prev.decision.action === today.decision.action ? (
        <span className="text-[var(--dim)]">
          {changes.length === 0 ? "no change — " : ""}
          {today.decision.action.toUpperCase()} ({today.decision.conviction}) reaffirmed
          {streak > 1 ? `, day ${streak} in a row` : ""}
        </span>
      ) : (
        <span className="text-[var(--dim)]">first day of the new call</span>
      )}
    </div>
  );
}

export default function AssetDailyView({
  series,
  chart,
  fundamentals,
  technicals,
  callRecord,
  extra,
}: {
  series: AssetDaily[];
  /** Optional live price chart (range selector), rendered right under the hero. */
  chart?: React.ReactNode;
  /** Optional live fundamentals/earnings panel, rendered before Technicals. */
  fundamentals?: React.ReactNode;
  /** Optional live technical-analysis panel, rendered between Outlook and Key levels. */
  technicals?: React.ReactNode;
  /** Optional scored call-record panel, rendered after the hero. */
  callRecord?: React.ReactNode;
  /** Optional asset-specific panel, rendered after the positioning/flow block. */
  extra?: React.ReactNode;
}) {
  const today = series[0];
  const history = series.slice(1);
  // Fall back gracefully if a dossier ever carries an unmapped value, so one
  // stray field can never crash the whole static build again.
  const win = WINNER_META[today.day_winner] ?? WINNER_META.flat;
  const act = ACTION_META[today.decision.action] ?? ACTION_META.hold;
  const snap = today.snapshot;
  const isCrypto = today.asset === "btc";
  const cur = today.currency_symbol ?? "$";
  const px = (n: number) => `${cur}${formatLevel(n)}`;

  return (
    <div className="space-y-2">
      {/* ============================= HERO ============================= */}
      <section className="term-corners border border-[var(--border-strong)] bg-[var(--panel)]">
        {/* Price header */}
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--border)] px-3 py-2.5">
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-[var(--foreground)]">
                {today.symbol}
              </h1>
              <span className="font-mono text-[12px] uppercase tracking-widest text-[var(--dim)]">
                {today.name}
              </span>
            </div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
              Daily investor brief · {today.date}
              {today.is_seed ? " · seed" : ""}
            </div>
            {RELATED[today.asset]?.length ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
                  Related
                </span>
                {RELATED[today.asset]!.map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    className="border border-[var(--border)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)] transition-colors hover:border-[var(--amber-dim)] hover:text-[var(--amber)]"
                  >
                    {r.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <div className="text-right">
            <div className="glow-fg font-mono text-3xl font-bold tabular-nums text-[var(--foreground)]">
              {px(snap.price)}
            </div>
            <div className={cn("font-mono text-[13px] font-semibold", changeTone(snap.change_pct))}>
              {snap.change_abs !== undefined
                ? `${snap.change_abs >= 0 ? "+" : ""}${formatLevel(Math.abs(snap.change_abs))} `
                : ""}
              {formatPct(snap.change_pct)} today
            </div>
          </div>
        </div>

        {/* Spatial read of where price sits in its level structure. */}
        <LevelsGauge price={snap.price} currency={cur} levels={today.key_levels} />

        {/* The two answers the reader came for */}
        <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2">
          {/* Who made money today */}
          <div className={cn("border px-3 py-2.5", win.border, win.bg)}>
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
              Who made money today
            </div>
            <div className={cn("mt-1 font-mono text-lg font-bold tracking-wide", win.text, win.glow)}>
              {win.emoji} {win.label}
            </div>
            <div className="mt-1.5 space-y-0.5 font-mono text-[11px] leading-relaxed">
              <div>
                <span className="text-[var(--amber-dim)]">LONGS / CALLS </span>
                <span className={today.day_winner === "bulls" ? "text-[var(--up)]" : "text-[var(--down)]"}>
                  {today.long_pnl ?? (today.day_winner === "bulls" ? "in the money" : "underwater")}
                </span>
              </div>
              <div>
                <span className="text-[var(--amber-dim)]">SHORTS / PUTS </span>
                <span className={today.day_winner === "bears" ? "text-[var(--up)]" : "text-[var(--down)]"}>
                  {today.short_pnl ?? (today.day_winner === "bears" ? "in the money" : "underwater")}
                </span>
              </div>
            </div>
          </div>

          {/* Today's decision */}
          <div className={cn("border px-3 py-2.5", act.border, act.bg)}>
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
              Today&apos;s decision
            </div>
            <div className={cn("mt-1 flex items-baseline gap-2 font-mono", act.text)}>
              <span className={cn("text-3xl font-bold leading-none tracking-wide", act.glow)}>
                {act.label}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[var(--dim)]">
                {today.decision.conviction} conviction
              </span>
            </div>
            <div className="mt-1 inline-flex items-center gap-1.5 border border-[var(--border)] bg-black px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest">
              <span className="text-[var(--amber-dim)]">Hold for</span>
              <span className="text-[var(--foreground)]">{today.decision.horizon}</span>
            </div>
            <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
              {today.decision.rationale}
            </p>
          </div>
        </div>

        {/* Session one-liner */}
        <div className="border-t border-[var(--border)] px-3 py-1.5 font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
          <span className="text-[var(--amber-dim)]">TAPE · </span>
          {today.day_summary}
        </div>
      </section>

      {/* ===================== PRICE CHART ===================== */}
      {chart}

      {/* ================= WHAT CHANGED SINCE YESTERDAY ================= */}
      <DeltaStrip series={series} />

      {/* ===================== CALL RECORD (scored) ===================== */}
      {callRecord}

      {/* ============================= SNAPSHOT ============================= */}
      <Panel code="SNAP" title="Snapshot">
        <div className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Last" value={px(snap.price)} />
          <Stat
            label="Change"
            value={formatPct(snap.change_pct)}
            tone={snap.change_pct > 0 ? "up" : snap.change_pct < 0 ? "down" : "neutral"}
          />
          {snap.prev_close !== undefined && <Stat label="Prev close" value={px(snap.prev_close)} />}
          {snap.day_low !== undefined && snap.day_high !== undefined && (
            <Stat label="Day range" value={`${px(snap.day_low)} – ${px(snap.day_high)}`} />
          )}
          {snap.week52_low !== undefined && snap.week52_high !== undefined && (
            <Stat label="52-wk range" value={`${px(snap.week52_low)} – ${px(snap.week52_high)}`} />
          )}
          {snap.volume && <Stat label="Volume" value={snap.volume} />}
          {snap.market_cap && <Stat label="Market cap" value={snap.market_cap} />}
          {snap.extra?.map((e) => (
            <Stat key={e.label} label={e.label} value={e.value} tone={e.tone} />
          ))}
        </div>
      </Panel>

      {/* ===================== POSITIONING / FLOW ===================== */}
      <Panel
        code="FLOW"
        title={isCrypto ? "Positioning & on-chain — what traders are doing" : "Options & positioning — what traders are doing"}
      >
        <div className="space-y-2 p-2">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            {today.positioning.iv != null && (
              <Stat label={isCrypto ? "Implied vol" : "ATM IV"} value={`${today.positioning.iv}%`} />
            )}
            {today.positioning.put_call != null && (
              <Stat
                label="Put/Call"
                value={today.positioning.put_call.toFixed(2)}
                tone={today.positioning.put_call > 1 ? "down" : "up"}
              />
            )}
            {today.positioning.short_interest && (
              <Stat
                label={isCrypto ? "Perp funding / SI" : "Short interest"}
                value={today.positioning.short_interest}
              />
            )}
            {today.positioning.max_pain && (
              <Stat label="Max pain / pin" value={today.positioning.max_pain} />
            )}
          </div>
          {today.positioning.notable_flow && (
            <p className="font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
              <span className="text-[var(--amber-dim)]">NOTABLE FLOW · </span>
              {today.positioning.notable_flow}
            </p>
          )}
          <p className="font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
            {today.what_traders_are_doing}
          </p>
        </div>
      </Panel>

      {/* #7 — defined-risk options structure from IV + levels ($-quoted desks).
          Skipped on a "step aside" call: a directional spread would contradict
          a stand-down. */}
      {cur === "$" && today.decision.action !== "step_aside" && (
        <OptionsStructureCard
          price={snap.price}
          action={today.decision.action}
          ivPct={today.positioning.iv}
          levels={today.key_levels}
          currency={cur}
        />
      )}

      {/* Scenario payoff into the next catalyst — uses IV, else nearest levels.
          Also directional, so skipped when the call is to step aside. */}
      {today.decision.action !== "step_aside" && (
        <ScenarioPayoffCard
          price={snap.price}
          action={today.decision.action}
          ivPct={today.positioning.iv}
          levels={today.key_levels}
          catalysts={today.catalysts}
          currency={cur}
        />
      )}

      {/* ===== ASSET-SPECIFIC PANEL (optional per-desk extra) ===== */}
      {extra}

      {/* ===================== BULL vs BEAR ===================== */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <Panel code="BULL" title="Bull case">
          <ul className="space-y-1.5 p-2">
            {today.bull_case.map((b, i) => (
              <li key={i} className="flex gap-2 font-mono text-[11px] leading-relaxed">
                <span className="shrink-0 text-[var(--up)]">▲</span>
                <span className="text-[var(--foreground)]">{b}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel code="BEAR" title="Bear case">
          <ul className="space-y-1.5 p-2">
            {today.bear_case.map((b, i) => (
              <li key={i} className="flex gap-2 font-mono text-[11px] leading-relaxed">
                <span className="shrink-0 text-[var(--down)]">▼</span>
                <span className="text-[var(--foreground)]">{b}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* ===================== OUTLOOK ===================== */}
      <Panel code="VIEW" title="Outlook">
        <div className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-2">
          <div className="border border-[var(--border)] bg-black px-2 py-1.5">
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
              Short term · days–weeks
            </div>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
              {today.outlook.short_term}
            </p>
          </div>
          <div className="border border-[var(--border)] bg-black px-2 py-1.5">
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
              Long term · months+
            </div>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
              {today.outlook.long_term}
            </p>
          </div>
        </div>
      </Panel>

      {/* ===================== FUNDAMENTALS (live, evidence layer) ============= */}
      {fundamentals}

      {/* ===================== TECHNICALS (live, computed) ===================== */}
      {technicals}

      {/* ===================== KEY LEVELS + CATALYSTS ===================== */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <Panel code="LVLS" title="Key levels">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-[11px]">
              <tbody>
                {today.key_levels.map((l, i) => (
                  <tr key={i} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-2 py-1 text-[var(--foreground)]">{l.label}</td>
                    <td className={cn("px-2 py-1 text-right tabular-nums", levelTone(l.kind))}>
                      {l.level}
                    </td>
                    <td className="px-2 py-1 text-right text-[9px] uppercase tracking-widest text-[var(--dim)]">
                      {l.kind}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel code="CAT" title="Catalysts ahead">
          <ul className="divide-y divide-[var(--border)]">
            {today.catalysts.map((c, i) => (
              <li key={i} className="flex items-baseline gap-2 px-2 py-1.5 font-mono text-[11px]">
                <span
                  className={cn(
                    "shrink-0 tabular-nums",
                    c.importance === "high" ? "text-[var(--amber)]" : "text-[var(--dim)]",
                  )}
                >
                  {c.date}
                </span>
                <span className="text-[var(--foreground)]">{c.label}</span>
                {c.importance === "high" && (
                  <span className="ml-auto shrink-0 text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                    key
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* ===================== NEWS ===================== */}
      <Panel code="NEWS" title={`${today.symbol} news & what's happening`}>
        <ul className="divide-y divide-[var(--border)]">
          {today.news.map((n, i) => (
            <li key={i} className="px-2 py-1.5">
              <div className="flex gap-2">
                <span className={cn("shrink-0 font-mono text-[11px]", sentimentDot(n.sentiment))}>●</span>
                <div className="min-w-0">
                  {n.url ? (
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] leading-relaxed text-[var(--foreground)] hover:text-[var(--cyan-term)]"
                    >
                      {n.label}
                    </a>
                  ) : (
                    <span className="font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
                      {n.label}
                    </span>
                  )}
                  {n.source && (
                    <span className="ml-1 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
                      · {n.source}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      {/* ===================== DEEP-DIVE ANALYSIS ===================== */}
      {today.analysis && (
        <Panel code="DEEP" title="The full read">
          <div className="px-3 py-2">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => (
                  <h2 className="mt-4 mb-1.5 font-mono text-sm font-semibold uppercase tracking-wider text-[var(--amber)]">
                    {children}
                  </h2>
                ),
                p: ({ children }) => (
                  <p className="my-2 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
                    {children}
                  </p>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--cyan-term)] underline underline-offset-4 hover:text-[var(--amber)]"
                  >
                    {children}
                  </a>
                ),
                ul: ({ children }) => (
                  <ul className="my-2 list-disc space-y-1 pl-5 font-mono text-[12px] text-[var(--foreground)]">
                    {children}
                  </ul>
                ),
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-[var(--amber)]">{children}</strong>
                ),
              }}
            >
              {today.analysis}
            </ReactMarkdown>
          </div>
        </Panel>
      )}

      {/* ===================== HISTORY / TRACK RECORD ===================== */}
      {history.length > 0 && (
        <Panel code="HIST" title="Daily record">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-[11px]">
              <thead>
                <tr className="bg-[var(--panel-head)] text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                  <th className="px-2 py-1 text-left">Date</th>
                  <th className="px-2 py-1 text-right">Close</th>
                  <th className="px-2 py-1 text-right">Day</th>
                  <th className="px-2 py-1 text-center">Who won</th>
                  <th className="px-2 py-1 text-center">Call</th>
                </tr>
              </thead>
              <tbody>
                {history.map((d) => {
                  const w = WINNER_META[d.day_winner];
                  const a = ACTION_META[d.decision.action];
                  return (
                    <tr key={d.date} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-2 py-1 text-[var(--foreground)]">{d.date}</td>
                      <td className="px-2 py-1 text-right tabular-nums text-[var(--foreground)]">
                        {px(d.snapshot.price)}
                      </td>
                      <td className={cn("px-2 py-1 text-right tabular-nums", changeTone(d.snapshot.change_pct))}>
                        {formatPct(d.snapshot.change_pct)}
                      </td>
                      <td className={cn("px-2 py-1 text-center", w.text)}>
                        {w.emoji} {d.day_winner}
                      </td>
                      <td className={cn("px-2 py-1 text-center font-bold", a.text)}>{a.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <p className="px-1 pb-2 font-mono text-[10px] leading-relaxed text-[var(--dim)]">
        Educational analysis only — not investment advice. &ldquo;Who made money today&rdquo; describes
        the session&apos;s direction for simple long vs. short exposure; your actual P&amp;L depends on
        strike, expiry, and entry. Always do your own research and manage risk.
      </p>
    </div>
  );
}
