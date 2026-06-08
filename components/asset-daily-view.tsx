import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  AssetDaily,
  DayWinner,
  TradeAction,
  NewsItem,
  KeyLevel,
} from "@/lib/asset-daily";
import { cn, formatLevel, formatPct } from "@/lib/utils";
import Panel from "./panel";

// ---- small presentational helpers -----------------------------------------

function changeTone(n: number): string {
  return n > 0 ? "text-[var(--up)]" : n < 0 ? "text-[var(--down)]" : "text-[var(--dim)]";
}

const WINNER_META: Record<
  DayWinner,
  { emoji: string; label: string; text: string; border: string; bg: string }
> = {
  bulls: {
    emoji: "🐂",
    label: "BULLS WON TODAY",
    text: "text-[var(--up)]",
    border: "border-[var(--up)]/40",
    bg: "bg-[var(--up-soft)]",
  },
  bears: {
    emoji: "🐻",
    label: "BEARS WON TODAY",
    text: "text-[var(--down)]",
    border: "border-[var(--down)]/40",
    bg: "bg-[var(--down-soft)]",
  },
  flat: {
    emoji: "➖",
    label: "FLAT — A WASH",
    text: "text-[var(--dim)]",
    border: "border-[var(--border-strong)]",
    bg: "bg-[var(--panel-head)]",
  },
};

const ACTION_META: Record<
  TradeAction,
  { label: string; text: string; border: string; bg: string }
> = {
  buy: {
    label: "BUY",
    text: "text-[var(--up)]",
    border: "border-[var(--up)]/40",
    bg: "bg-[var(--up-soft)]",
  },
  hold: {
    label: "HOLD",
    text: "text-[var(--amber)]",
    border: "border-[var(--amber)]/40",
    bg: "bg-[var(--amber-soft)]",
  },
  sell: {
    label: "SELL",
    text: "text-[var(--down)]",
    border: "border-[var(--down)]/40",
    bg: "bg-[var(--down-soft)]",
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
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--panel-head)]/50 px-2.5 py-2">
      <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
        {label}
      </div>
      <div className={cn("mt-1 font-mono text-[14px] font-medium tabular-nums", toneCls)}>{value}</div>
    </div>
  );
}

// ---- main view -------------------------------------------------------------

export default function AssetDailyView({ series }: { series: AssetDaily[] }) {
  const today = series[0];
  const history = series.slice(1);
  const win = WINNER_META[today.day_winner];
  const act = ACTION_META[today.decision.action];
  const snap = today.snapshot;
  const isCrypto = today.asset === "btc";
  const cur = today.currency_symbol ?? "$";
  const px = (n: number) => `${cur}${formatLevel(n)}`;

  return (
    <div className="space-y-2">
      {/* ============================= HERO ============================= */}
      <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-gradient-to-b from-[var(--panel-head)] to-[var(--panel)] shadow-[var(--shadow-2)]">
        {/* Price header */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] px-4 py-3.5">
          <div>
            <div className="flex items-baseline gap-2.5">
              <h1 className="font-mono text-3xl font-bold tracking-tight text-[var(--foreground)]">
                {today.symbol}
              </h1>
              <span className="text-[13px] font-medium text-[var(--dim)]">{today.name}</span>
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
              Daily investor brief · {today.date}
              {today.is_seed ? " · seed" : ""}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-3xl font-bold tabular-nums text-[var(--foreground)]">
              {px(snap.price)}
            </div>
            <div
              className={cn(
                "font-mono text-[14px] font-semibold tabular-nums",
                changeTone(snap.change_pct),
              )}
            >
              {snap.change_pct > 0 ? "▲ " : snap.change_pct < 0 ? "▼ " : ""}
              {snap.change_abs !== undefined
                ? `${snap.change_abs >= 0 ? "+" : ""}${formatLevel(Math.abs(snap.change_abs))} `
                : ""}
              {formatPct(snap.change_pct)} today
            </div>
          </div>
        </div>

        {/* The two answers the reader came for */}
        <div className="grid grid-cols-1 gap-2.5 p-2.5 sm:grid-cols-2">
          {/* Who made money today */}
          <div className={cn("rounded-[var(--radius)] border px-3.5 py-3", win.border, win.bg)}>
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
              Who made money today
            </div>
            <div className={cn("mt-1.5 text-xl font-bold tracking-tight", win.text)}>
              {win.emoji} {win.label}
            </div>
            <div className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed">
              <div>
                <span className="text-[var(--dim)]">LONGS / CALLS </span>
                <span className={today.day_winner === "bulls" ? "text-[var(--up)]" : "text-[var(--down)]"}>
                  {today.long_pnl ?? (today.day_winner === "bulls" ? "in the money" : "underwater")}
                </span>
              </div>
              <div>
                <span className="text-[var(--dim)]">SHORTS / PUTS </span>
                <span className={today.day_winner === "bears" ? "text-[var(--up)]" : "text-[var(--down)]"}>
                  {today.short_pnl ?? (today.day_winner === "bears" ? "in the money" : "underwater")}
                </span>
              </div>
            </div>
          </div>

          {/* Today's decision */}
          <div className={cn("rounded-[var(--radius)] border px-3.5 py-3", act.border, act.bg)}>
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
              Today&apos;s decision
            </div>
            <div className={cn("mt-1.5 flex items-baseline gap-2", act.text)}>
              <span className="text-xl font-bold tracking-tight">{act.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--dim)]">
                {today.decision.conviction} conviction · {today.decision.horizon}
              </span>
            </div>
            <p className="prose-read mt-2 text-[13px] leading-relaxed">
              {today.decision.rationale}
            </p>
          </div>
        </div>

        {/* Session one-liner */}
        <div className="flex gap-2 border-t border-[var(--border)] bg-[var(--panel)]/40 px-4 py-2.5">
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Tape
          </span>
          <p className="prose-read text-[13px] leading-relaxed">{today.day_summary}</p>
        </div>
      </section>

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
            {today.positioning.iv !== undefined && (
              <Stat label={isCrypto ? "Implied vol" : "ATM IV"} value={`${today.positioning.iv}%`} />
            )}
            {today.positioning.put_call !== undefined && (
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
            <p className="prose-read text-[13px] leading-relaxed">
              <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
                Notable flow ·{" "}
              </span>
              {today.positioning.notable_flow}
            </p>
          )}
          <p className="prose-read text-[13px] leading-relaxed">
            {today.what_traders_are_doing}
          </p>
        </div>
      </Panel>

      {/* ===================== BULL vs BEAR ===================== */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <Panel code="BULL" title="Bull case">
          <ul className="space-y-2 p-2.5">
            {today.bull_case.map((b, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-0.5 shrink-0 text-[11px] text-[var(--up)]">▲</span>
                <span className="prose-read text-[13px] leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel code="BEAR" title="Bear case">
          <ul className="space-y-2 p-2.5">
            {today.bear_case.map((b, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-0.5 shrink-0 text-[11px] text-[var(--down)]">▼</span>
                <span className="prose-read text-[13px] leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* ===================== OUTLOOK ===================== */}
      <Panel code="VIEW" title="Outlook">
        <div className="grid grid-cols-1 gap-2 p-2.5 sm:grid-cols-2">
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--panel-head)]/50 px-3 py-2.5">
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--cyan-term)]">
              Short term · days–weeks
            </div>
            <p className="prose-read mt-1.5 text-[13px] leading-relaxed">
              {today.outlook.short_term}
            </p>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--panel-head)]/50 px-3 py-2.5">
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--cyan-term)]">
              Long term · months+
            </div>
            <p className="prose-read mt-1.5 text-[13px] leading-relaxed">
              {today.outlook.long_term}
            </p>
          </div>
        </div>
      </Panel>

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
                      className="prose-read text-[13px] leading-relaxed text-[var(--foreground)] hover:text-[var(--cyan-term)]"
                    >
                      {n.label}
                    </a>
                  ) : (
                    <span className="prose-read text-[13px] leading-relaxed text-[var(--foreground)]">
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
          <div className="prose-read px-4 py-3 text-[14px]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => (
                  <h2 className="mt-5 mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-[var(--amber)]">
                    {children}
                  </h2>
                ),
                p: ({ children }) => (
                  <p className="my-2.5 leading-[1.7] text-[var(--muted)]">{children}</p>
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
                  <ul className="my-2.5 list-disc space-y-1.5 pl-5 text-[var(--muted)]">
                    {children}
                  </ul>
                ),
                li: ({ children }) => <li className="leading-[1.7]">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-[var(--foreground)]">{children}</strong>
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
