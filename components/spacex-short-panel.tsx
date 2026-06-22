import {
  getSpacexLockup,
  SPCX_IPO_DATE,
  SPCX_IPO_PRICE,
  SPCX_TRIGGER_PCT,
  SPCX_TRIGGER_PRICE,
  type UnlockStatus,
} from "@/lib/spacex-lockup";
import { cn } from "@/lib/utils";
import Panel from "./panel";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-08-20" -> "Aug 20" / "Aug 20 ’26"
function fmt(iso: string, withYear = false): string {
  const [y, m, d] = iso.split("-").map(Number);
  const base = `${MONTHS[m - 1]} ${d}`;
  return withYear ? `${base} ’${String(y).slice(2)}` : base;
}

function statusTone(s: UnlockStatus): string {
  return s === "released" ? "text-[var(--dim)]" : "text-[var(--down)]";
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-[var(--border)] bg-black px-2 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-[13px] text-[var(--foreground)]">{value}</div>
      {sub && <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">{sub}</div>}
    </div>
  );
}

/**
 * Shorting SPCX — the insider-lockup supply overhang.
 *
 * SpaceX freed its pre-IPO insiders on an unusual *staggered* early-release
 * schedule inside the 180-day window, so insider stock reaches the float in
 * waves. This panel lays out exactly when each wave of sellable supply lands —
 * the spine of the bear / short case — plus how to express it and what the
 * borrow / squeeze risks are. Educational, not advice.
 */
export default function SpacexShortPanel() {
  // Reference "today" in UTC (yyyy-mm-dd). Server-rendered; ISR re-runs it.
  const now = new Date();
  const refIso = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
    now.getUTCDate(),
  ).padStart(2, "0")}`;

  const { events, freedPct, next, daysToNext, daysToFull } = getSpacexLockup(refIso);

  return (
    <Panel
      code="SHORT"
      title="Shorting SPCX · insider lockup"
      learn={`SpaceX priced its IPO at $${SPCX_IPO_PRICE} on Jun 11, 2026 (~$1.77T) and, instead of a single 180-day lockup cliff, freed insiders on a staggered early-release schedule. The bear/short thesis: each release is fresh pre-IPO supply hitting a thin post-IPO float, and concentrated waves (the Q2 and Q3 earnings cliffs, then the full day-180 expiry) can swamp demand and pressure the price. The schedule below tracks when that supply lands. Founder Elon Musk (12.3% of Class A) is exempt from every early release. Estimated dates apply to the two earnings cliffs; day-count tranches are exact. Educational only — not investment advice.`}
      meta={<span>SUPPLY OVERHANG · IPO ${SPCX_IPO_PRICE}</span>}
    >
      {/* ---- thesis line ---- */}
      <div className="border-b border-[var(--border)] px-3 py-2.5">
        <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
          The short thesis
        </div>
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
          Insiders hold <span className="text-[var(--down)]">&gt;20% of Class A</span>, and SpaceX
          unlocks them in waves rather than one cliff. Every release is fresh pre-IPO supply landing on
          a thin float — bears bet those waves, especially the two earnings cliffs and the full day-180
          expiry, swamp demand and drag the price. The risk on the other side: a hard-to-borrow,
          retail-loved name with a small float is exactly where a short squeeze can rip.
        </p>
      </div>

      {/* ---- headline stats ---- */}
      <div className="grid grid-cols-2 gap-1 border-b border-[var(--border)] p-2 sm:grid-cols-4">
        <Stat label="Insider stake" value=">20%" sub="of Class A" />
        <Stat label="Supply freed" value={`${freedPct}%`} sub="of pre-IPO shares" />
        <Stat
          label="Next unlock"
          value={next ? fmt(next.date) : "—"}
          sub={next ? `in ${daysToNext}d · +${next.pct}%` : "fully unlocked"}
        />
        <Stat label="Full release" value={fmt("2026-12-08", true)} sub={`day 180 · in ${daysToFull}d`} />
      </div>

      {/* ---- cumulative supply-unlock curve ---- */}
      <div className="border-b border-[var(--border)] px-3 py-3">
        <div className="flex items-baseline justify-between font-mono text-[9px] uppercase tracking-widest">
          <span className="text-[var(--amber-dim)]">Cumulative supply unlocked</span>
          <span className="text-[var(--dim)]">{fmt(SPCX_IPO_DATE)} → {fmt("2026-12-08")}</span>
        </div>
        <div className="mt-2 flex h-20 items-end gap-1">
          {events.map((e) => {
            const released = e.status === "released";
            return (
              <div key={e.id} className="flex flex-1 flex-col items-center justify-end" title={`${fmt(e.date, true)} · +${e.pct}% → ${e.cumulative}% freed`}>
                <span className={cn("mb-0.5 font-mono text-[8px] tabular-nums", released ? "text-[var(--dim)]" : "text-[var(--down)]")}>
                  {e.cumulative}
                </span>
                <div
                  className="w-full"
                  style={{
                    height: `${e.cumulative}%`,
                    background: released ? "var(--dim)" : "var(--down)",
                    opacity: released ? 0.4 : 0.75,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex gap-1">
          {events.map((e) => (
            <div key={e.id} className="flex-1 text-center font-mono text-[7px] uppercase tracking-wide text-[var(--dim)]">
              {fmt(e.date)}
            </div>
          ))}
        </div>
      </div>

      {/* ---- the schedule, event by event ---- */}
      <ul className="divide-y divide-[var(--border)]">
        {events.map((e) => (
          <li key={e.id} className="flex gap-3 px-3 py-2">
            <div className="w-16 shrink-0">
              <div className={cn("font-mono text-[11px] tabular-nums", e.status === "released" ? "text-[var(--dim)]" : "text-[var(--foreground)]")}>
                {fmt(e.date)}
              </div>
              <div className="font-mono text-[8px] uppercase tracking-widest text-[var(--dim)]">
                {e.dayOffset != null ? `day ${e.dayOffset}` : e.estimated ? "est." : ""}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[11px] font-semibold text-[var(--foreground)]">
                  {e.label}
                </span>
                <span className={cn("shrink-0 font-mono text-[11px] font-bold tabular-nums", e.status === "released" ? "text-[var(--dim)]" : "text-[var(--down)]")}>
                  +{e.pct}%
                </span>
              </div>
              <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-[var(--dim)]">{e.detail}</p>
            </div>
            <div className="w-14 shrink-0 text-right">
              <span className={cn("font-mono text-[8px] uppercase tracking-widest", statusTone(e.status))}>
                {e.status === "released" ? "freed" : "pending"}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* ---- price-trigger wildcard ---- */}
      <div className="border-t border-[var(--border)] bg-[rgba(239,68,68,0.05)] px-3 py-2">
        <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
          Wildcard accelerator
        </div>
        <p className="mt-1 font-mono text-[10px] leading-relaxed text-[var(--foreground)]">
          An extra <span className="text-[var(--down)]">+{SPCX_TRIGGER_PCT}%</span> frees early — with no
          set date — if Class A trades at least 30% above the IPO price
          (<span className="tabular-nums">≥ ${SPCX_TRIGGER_PRICE.toFixed(2)}</span>) on 5 of any 10
          trading days. It pulls supply forward into strength but doesn&apos;t change the day-180
          endpoint — a built-in brake on rallies.
        </p>
      </div>

      {/* ---- how to express it + risks ---- */}
      <div className="grid grid-cols-1 gap-1 border-t border-[var(--border)] p-2 sm:grid-cols-2">
        <div className="border border-[var(--border)] bg-black px-2 py-1.5">
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Ways to express a short
          </div>
          <ul className="mt-1 space-y-0.5 font-mono text-[10px] leading-relaxed text-[var(--foreground)]">
            <li>· Borrow &amp; short the stock — timed into an unlock window.</li>
            <li>· Long puts / put spreads — defined risk, no borrow needed.</li>
            <li>· Fade strength near the ${SPCX_TRIGGER_PRICE.toFixed(0)} trigger that pulls supply forward.</li>
          </ul>
        </div>
        <div className="border border-[var(--border)] bg-black px-2 py-1.5">
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--amber-dim)]">
            Why it can hurt
          </div>
          <ul className="mt-1 space-y-0.5 font-mono text-[10px] leading-relaxed text-[var(--foreground)]">
            <li>· Thin float + retail demand = squeeze risk.</li>
            <li>· Borrow may be scarce and expensive (high fee).</li>
            <li>· Insiders <span className="text-[var(--foreground)]">can</span> sell — many may not.</li>
            <li>· Musk (12.3%) is exempt — no founder supply.</li>
          </ul>
        </div>
      </div>

      <p className="border-t border-[var(--border)] px-2 py-1.5 font-mono text-[9px] leading-relaxed text-[var(--dim)]">
        Schedule per SpaceX&apos;s S-1 lockup terms as summarized by CNBC, The Motley Fool and wealth
        advisors (May–Jun 2026). Earnings-cliff dates are estimates; day-count tranches are exact off
        the Jun 11 pricing. An unlock is permission to sell, not a forced sale. Educational context —
        not investment advice.
      </p>
    </Panel>
  );
}
