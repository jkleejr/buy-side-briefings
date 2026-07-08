import { getMacroSnapshot } from "@/lib/macro";
import { todayET } from "@/lib/utils";
import Panel from "./panel";

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
    value: React.ReactNode,
    hint: string,
    cls = "text-[var(--foreground)]",
  ) => (
    <div className="px-2 py-1.5">
      <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--amber-dim)]">
        {label}
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
    >
      <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
        {tile(
          "ISM Mfg",
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
          m.growth.gdp_qoq_annualized_pct === null
            ? "—"
            : `${m.growth.gdp_qoq_annualized_pct.toFixed(1)}%`,
          m.growth.gdp_release_date,
        )}
      </div>
      <div className="border-t border-[var(--border)] px-2 py-1.5">
        <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--amber-dim)]">
          BTC Halving Cycle
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
