import { getMacroSnapshot } from "@/lib/macro";
import { todayET } from "@/lib/utils";
import Panel from "./panel";
import Tooltip from "./tooltip";

export const revalidate = 3600;

function daysBetween(a: string, b: string): number {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  return Math.round(Math.abs(tb - ta) / 86_400_000);
}

export default async function CyclePanel() {
  const m = await getMacroSnapshot();
  const today = todayET();
  const sinceHalving = daysBetween(m.crypto_cycle.last_btc_halving_date, today);
  const untilHalving = daysBetween(today, m.crypto_cycle.next_btc_halving_date);

  const tile = (
    label: string,
    tip: string,
    value: React.ReactNode,
    hint: string,
    cls = "text-[var(--foreground)]",
  ) => (
    <div className="px-2 py-1.5">
      <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--amber-dim)]">
        <Tooltip text={tip}>{label}</Tooltip>
      </div>
      <div className={`mt-0.5 font-mono text-[14px] ${cls}`}>{value}</div>
      <div className="font-mono text-[10px] text-[var(--dim)]">{hint}</div>
    </div>
  );

  const ismMfgCls =
    m.growth.ism_manufacturing === null
      ? "text-[var(--foreground)]"
      : m.growth.ism_manufacturing >= 50
        ? "text-[var(--up)]"
        : "text-[var(--down)]";
  const ismSvcCls =
    m.growth.ism_services === null
      ? "text-[var(--foreground)]"
      : m.growth.ism_services >= 50
        ? "text-[var(--up)]"
        : "text-[var(--down)]";

  return (
    <Panel
      code="CYCLE"
      title="Cycle Position & Real Economy"
      learn="Long-horizon indicators — where we are in the broader economic and crypto cycles. Useful for the 'big picture' question: is this early-cycle expansion, late-cycle euphoria, or recession setup? Doesn't change day-to-day, but sets the backdrop for everything else."
    >
      <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
        {tile(
          "ISM Mfg",
          "Institute for Supply Management Manufacturing PMI. A survey of factory purchasing managers covering new orders, production, employment, and prices. Above 50 = manufacturing expanding. Below 50 = contracting. Leading indicator for the goods economy.",
          m.growth.ism_manufacturing ?? "—",
          m.growth.ism_manufacturing === null
            ? ""
            : m.growth.ism_manufacturing >= 50
              ? "Expansion"
              : "Contraction",
          ismMfgCls,
        )}
        {tile(
          "ISM Svc",
          "ISM Services PMI — same survey methodology as Manufacturing but for the services economy (~70% of US GDP). Above 50 = expansion, below = contraction. Watched alongside Mfg PMI to gauge breadth of growth or weakness.",
          m.growth.ism_services ?? "—",
          m.growth.ism_services === null
            ? ""
            : m.growth.ism_services >= 50
              ? "Expansion"
              : "Contraction",
          ismSvcCls,
        )}
        {tile(
          "GDP q/q ann.",
          "Gross Domestic Product growth, quarter-over-quarter, annualized (i.e., what the rate would be if that quarter's pace held for a full year). The headline 'how fast is the economy growing' number. Reported by the BEA roughly a month after the quarter ends.",
          m.growth.gdp_qoq_annualized_pct === null
            ? "—"
            : `${m.growth.gdp_qoq_annualized_pct.toFixed(1)}%`,
          m.growth.gdp_release_date,
        )}
      </div>
      <div className="border-t border-[var(--border)] px-2 py-1.5">
        <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--amber-dim)]">
          <Tooltip text="Every ~4 years (roughly every 210,000 blocks), the Bitcoin mining reward is cut in half — the 'halving'. Historically, BTC has rallied 12–18 months after each halving, peaked, then crashed. Tracking T+days since the last halving is a rough shorthand for where we are in the crypto cycle.">
            BTC Halving Cycle
          </Tooltip>
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-[var(--foreground)]">
          {m.crypto_cycle.cycle_position_label}
        </div>
        <div className="font-mono text-[10px] text-[var(--dim)]">
          T+{sinceHalving}d since {m.crypto_cycle.last_btc_halving_date} · T-{untilHalving}d to{" "}
          {m.crypto_cycle.next_btc_halving_date}
        </div>
      </div>
    </Panel>
  );
}
