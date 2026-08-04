import Link from "next/link";
import { getAllKospiVerdicts } from "@/lib/data";
import { cn, formatLevel, formatPct } from "@/lib/utils";
import KospiBriefingCard from "@/components/kospi-briefing-card";
import { FreshnessNotice } from "@/components/stale-banner";
import { getKospiFreshness } from "@/lib/freshness";
import { verdictHeadline } from "@/lib/verdict-headline";

export const metadata = {
  title: "KOSPI — Korean Market News & Updates — Buy-Side Briefings",
  description:
    "Daily KOSPI and KOSDAQ market updates and Korean stock-market news: the verdict, the won, foreign flows, the AI-memory leaders (Samsung, SK Hynix), and the macro that moves Seoul.",
};

export const revalidate = 300;

function sentimentColor(s: "positive" | "neutral" | "negative"): string {
  return s === "positive"
    ? "text-[var(--up)]"
    : s === "negative"
      ? "text-[var(--down)]"
      : "text-[var(--dim)]";
}

export default function KospiPage() {
  const verdicts = getAllKospiVerdicts();
  const latest = verdicts[0] ?? null;
  const snap = latest?.snapshot ?? {};

  return (
    <div className="space-y-3">
      <FreshnessNotice freshness={getKospiFreshness()} noun="KOSPI reads" />
      <header className="space-y-1 px-1 pb-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          KOSPI · Korean market
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          Daily · KOSPI + KOSDAQ · the won, foreign flows, and the AI-memory leaders
        </p>
        <p className="font-mono text-[11px] leading-relaxed text-[var(--dim)]">
          News and market updates for the Korea Exchange: the daily call, where the won and foreign
          flows sit, and how the semiconductor leaders (Samsung, SK Hynix) are trading the AI-memory
          cycle. Click <span className="text-[var(--cyan-term)]">FULL ▸</span> on any card for the
          long-form briefing with citations and levels.
        </p>
      </header>

      {latest === null ? (
        <div className="border border-[var(--border)] bg-[var(--panel)] p-6 text-center font-mono text-[11px] text-[var(--dim)]">
          No KOSPI briefings yet.
        </div>
      ) : (
        <>
          {/* Latest market update banner */}
          <section className="border border-[var(--border)] bg-[var(--panel)]">
            <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1 font-mono text-[10px] uppercase tracking-widest">
              <span className="text-[var(--amber)]">Latest market update</span>
              <span className="text-[var(--dim)]">·</span>
              <span className="text-[var(--foreground)]">{latest.date}</span>
              <Link
                href={`/briefings/${latest.routine}/${latest.date}-${latest.window}`}
                className="ml-auto text-[var(--cyan-term)] hover:underline"
              >
                FULL BRIEFING ▸
              </Link>
            </div>
            <div className="space-y-2 px-2 py-2">
              {/* Snapshot strip */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
                {snap.kospi && (
                  <Snap label="KOSPI" value={formatLevel(snap.kospi.level)} change={snap.kospi.change_pct} />
                )}
                {snap.kosdaq && (
                  <Snap label="KOSDAQ" value={formatLevel(snap.kosdaq.level)} change={snap.kosdaq.change_pct} />
                )}
                {snap.usdkrw && (
                  <Snap
                    label="USD/KRW"
                    value={`₩${formatLevel(snap.usdkrw.level)}`}
                    change={snap.usdkrw.change_pct}
                  />
                )}
                {snap.foreign_net && (
                  <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
                    <span className="text-[var(--amber-dim)]">FOREIGN</span>
                    <span
                      className={
                        snap.foreign_net.value < 0 ? "text-[var(--down)]" : "text-[var(--up)]"
                      }
                    >
                      {snap.foreign_net.value > 0 ? "+" : ""}₩{snap.foreign_net.value.toFixed(1)}T
                    </span>
                  </span>
                )}
                {snap.sk_hynix && (
                  <Snap
                    label="SK HYNIX"
                    value={`₩${formatLevel(snap.sk_hynix.level)}`}
                    change={snap.sk_hynix.change_pct}
                  />
                )}
                {snap.samsung && (
                  <Snap
                    label="SAMSUNG"
                    value={`₩${formatLevel(snap.samsung.level)}`}
                    change={snap.samsung.change_pct}
                  />
                )}
              </div>
              <h2 className="font-mono text-[13px] font-bold leading-snug text-[var(--foreground)]">
                {verdictHeadline(latest.verdict) ?? latest.verdict.rationale_short}
              </h2>
              <p className="font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
                {latest.verdict.rationale_short}
              </p>
            </div>
          </section>

          {/* Korean market news — headlines from the latest briefing's sources */}
          {latest.verdict.supporting_data.length > 0 && (
            <section className="border border-[var(--border)] bg-[var(--panel)]">
              <div className="border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
                  Korean market news
                </span>
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {latest.verdict.supporting_data.map((s, i) => (
                  <li key={i} className="px-2 py-1.5">
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] leading-relaxed text-[var(--foreground)] hover:text-[var(--cyan-term)]"
                      >
                        <span className="text-[var(--cyan-term)]">▸ </span>
                        {s.label}
                      </a>
                    ) : (
                      <span className="font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
                        <span className="text-[var(--dim)]">▸ </span>
                        {s.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Stock watch — leaders & levels from the latest briefing */}
          {latest.watchlist_mentions.length > 0 && (
            <section className="border border-[var(--border)] bg-[var(--panel)]">
              <div className="border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
                  Stock watch
                </span>
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {latest.watchlist_mentions.map((m, i) => (
                  <li key={i} className="flex gap-2 px-2 py-1.5">
                    <span
                      className={cn(
                        "shrink-0 font-mono text-[11px] font-bold",
                        sentimentColor(m.sentiment),
                      )}
                    >
                      {m.ticker}
                    </span>
                    <span className="font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
                      {m.note}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* All KOSPI briefings */}
          <section className="space-y-1.5">
            <div className="px-1 font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
              All KOSPI briefings
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {verdicts.map((v) => (
                <KospiBriefingCard key={`${v.date}-${v.window}`} verdict={v} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Snap({ label, value, change }: { label: string; value: string; change?: number }) {
  const changeStr = change !== undefined ? formatPct(change) : undefined;
  const changeColor =
    change === undefined
      ? ""
      : change > 0
        ? "text-[var(--up)]"
        : change < 0
          ? "text-[var(--down)]"
          : "text-[var(--dim)]";
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span className="text-[var(--amber-dim)]">{label}</span>
      <span className="text-[var(--foreground)]">{value}</span>
      {changeStr && <span className={changeColor}>{changeStr}</span>}
    </span>
  );
}
