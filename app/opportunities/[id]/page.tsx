import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllOpportunities, getOpportunity, type Opportunity } from "@/lib/data";
import { getDailyCloses } from "@/lib/markets";
import { checkOpenOpportunities, yahooSymbolFor } from "@/lib/opportunity-check";
import LevelsChart from "@/components/levels-chart";
import LiveCheckBadges from "@/components/live-check-badges";
import Panel from "@/components/panel";

export const revalidate = 300;

export async function generateStaticParams() {
  return getAllOpportunities().map((o) => ({ id: o.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const o = getOpportunity(id);
  if (!o) return { title: "Opportunity not found" };
  return { title: `${o.title} — Opportunities` };
}

function directionColor(d: Opportunity["direction"]): string {
  if (d === "long" || d === "long_vol") return "text-[var(--up)]";
  if (d === "short" || d === "short_vol") return "text-[var(--down)]";
  return "text-[var(--amber)]";
}

function convictionColor(c: Opportunity["conviction"]): string {
  if (c === "high") return "text-[var(--up)]";
  if (c === "medium") return "text-[var(--amber)]";
  return "text-[var(--dim)]";
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const o = getOpportunity(id);
  if (!o) notFound();

  // Live plan-vs-price check for open ideas (empty map for closed ones).
  const live = (await checkOpenOpportunities([o]))[o.id];

  // Price history for the plan chart — only fetched when levels exist to draw.
  const series = o.levels ? await getDailyCloses(yahooSymbolFor(o.ticker), 3) : [];

  return (
    <article className="mx-auto max-w-4xl space-y-3">
      <Link
        href="/opportunities"
        className="font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] hover:underline"
      >
        ◂ ALL OPPORTUNITIES
      </Link>

      <header className="space-y-2 border-b border-[var(--border)] pb-4">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
          <span className={directionColor(o.direction)}>{o.direction.replace("_", " ")}</span>
          <span className="text-[var(--amber)]">{o.ticker}</span>
          <span className="text-[var(--dim)]">·</span>
          <span className="text-[var(--dim)]">{o.category.replace("_", " ")}</span>
          <span className="text-[var(--dim)]">·</span>
          <span className="text-[var(--dim)]">{o.asset_class.replace("_", " ")}</span>
          <span className="text-[var(--dim)]">·</span>
          <span className={convictionColor(o.conviction)}>{o.conviction} conviction</span>
          <span className="text-[var(--dim)]">·</span>
          <span className="text-[var(--dim)]">{o.time_horizon}</span>
        </div>
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          {o.title}
        </h1>
        <p className="font-mono text-[12px] leading-relaxed text-[var(--dim)]">
          <span className="text-[var(--amber-dim)]">CATALYST · </span>
          {o.catalyst}
        </p>
        {live && (
          <div className="border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
            <LiveCheckBadges price={live.price} badges={live.badges} />
            {live.badges.length === 0 && (
              <span className="ml-2 font-mono text-[9px] uppercase tracking-wider text-[var(--dim)]">
                no level crossed — plan intact
              </span>
            )}
          </div>
        )}
      </header>

      {/* The plan, drawn: price vs entry zone / stop / targets */}
      {o.levels && series.length > 0 && (
        <Panel
          code="PLAN"
          title="Price vs Plan"
          learn="Three months of daily closes with the published plan drawn on top: the shaded amber band is the entry zone, the red dashed line is the stop, the green dashed lines are the targets. One glance answers whether price is drifting toward your entry or your stop."
          meta={<span>3MO · DAILY</span>}
        >
          <LevelsChart series={series} levels={o.levels} />
        </Panel>
      )}

      {/* Trade card */}
      <Panel code="TRADE" title="Trade Specs">
        <div className="grid grid-cols-1 divide-y divide-[var(--border)] sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
          <div className="space-y-1.5 p-3 font-mono text-[11px]">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
                Entry
              </div>
              <div className="leading-snug text-[var(--foreground)]">{o.entry}</div>
            </div>
            <div className="pt-1">
              <div className="text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
                Stop Loss
              </div>
              <div className="leading-snug text-[var(--down)]">{o.stop_loss}</div>
            </div>
            <div className="pt-1">
              <div className="text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
                Invalidation
              </div>
              <div className="leading-snug text-[var(--foreground)]">{o.invalidation}</div>
            </div>
          </div>
          <div className="space-y-1.5 p-3 font-mono text-[11px]">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
                Targets
              </div>
              <ul className="mt-0.5 space-y-0.5 text-[var(--up)]">
                {o.targets.map((t, i) => (
                  <li key={i} className="leading-snug">
                    <span className="text-[var(--amber-dim)]">T{i + 1} ▸</span> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-3 gap-1 border-t border-[var(--border)] pt-2">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
                  R/R
                </div>
                <div className="text-[var(--foreground)]">{o.risk_reward}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
                  Size
                </div>
                <div className="text-[var(--foreground)]">{o.position_size_pct}%</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
                  Status
                </div>
                <div
                  className={
                    o.status === "active"
                      ? "text-[var(--up)]"
                      : o.status === "target_hit"
                        ? "text-[var(--up)]"
                        : o.status === "stopped_out" || o.status === "thesis_broken"
                          ? "text-[var(--down)]"
                          : "text-[var(--dim)]"
                  }
                >
                  {o.status.replace("_", " ")}
                </div>
              </div>
            </div>
            {o.current_price != null && (
              <div className="border-t border-[var(--border)] pt-1 text-[10px] text-[var(--dim)]">
                Reference price at idea creation: ${o.current_price.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </Panel>

      <Panel code="WHY" title="Thesis">
        <p className="p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          {o.thesis}
        </p>
      </Panel>

      <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
        <Panel code="BULL" title="Bull Case">
          <p className="p-3 font-mono text-[11px] leading-relaxed text-[var(--up)]">
            {o.bull_case}
          </p>
        </Panel>
        <Panel code="BEAR" title="Bear Case">
          <p className="p-3 font-mono text-[11px] leading-relaxed text-[var(--down)]">
            {o.bear_case}
          </p>
        </Panel>
      </div>

      <Panel code="REF" title="Sources">
        <ul className="divide-y divide-[var(--border)]">
          {o.sources.map((s, i) => (
            <li key={i} className="px-3 py-1.5 font-mono text-[11px]">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--cyan-term)] underline underline-offset-4 hover:text-[var(--amber)]"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="flex flex-wrap items-center gap-2 px-1 font-mono text-[10px] uppercase tracking-widest text-[var(--dim)]">
        <span className="text-[var(--amber-dim)]">created</span>
        <span>{o.created_at}</span>
        {o.expires_at && (
          <>
            <span className="text-[var(--amber-dim)]">· expires</span>
            <span>{o.expires_at}</span>
          </>
        )}
        <span className="ml-auto">
          {o.tags.map((t) => (
            <span
              key={t}
              className="ml-1 border border-[var(--border)] bg-black px-1 py-0.5 text-[var(--dim)]"
            >
              {t}
            </span>
          ))}
        </span>
      </div>

      <div className="border border-[var(--border)] bg-[var(--panel)] p-3 font-mono text-[10px] leading-snug text-[var(--dim)]">
        <span className="text-[var(--amber-dim)]">Disclosure ▸</span> Educational analysis
        only — not investment advice. Position sizes are illustrative; adjust to your own
        risk budget. Past performance and stated targets are not guarantees of future
        returns. Verify all data independently before acting.
      </div>
    </article>
  );
}
