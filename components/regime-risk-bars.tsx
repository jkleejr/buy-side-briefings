import type { RegimeIndicator } from "@/lib/data";
import Panel from "./panel";

export default function RegimeRiskBars({ indicators }: { indicators: RegimeIndicator[] }) {
  return (
    <Panel
      code="RISK"
      title="Regime Risk Indicators"
      learn="Warning lights — gauges that signal when the market mood is overheating. Each bar fills toward a trigger threshold (green = fine, amber = approaching, red = triggered). Multiple bars hot at once = take the next bullish call with more skepticism. Not buy/sell signals on their own."
    >
      <ul className="divide-y divide-[var(--border)]">
        {indicators.map((r) => {
          const trigger = r.trigger_above ?? r.trigger_below ?? 100;
          const pct = Math.min(100, Math.max(0, (r.value / trigger) * 100));
          const triggered = r.trigger_above !== undefined && r.value >= r.trigger_above;
          const barColor = triggered
            ? "bg-[var(--down)]"
            : pct > 80
              ? "bg-[var(--amber)]"
              : "bg-[var(--up)]";
          return (
            <li key={r.name} className="px-2 py-1.5">
              <div className="flex items-baseline justify-between font-mono text-[11px]">
                <span className="truncate text-[var(--foreground)]">{r.name}</span>
                <span className="text-[var(--foreground)]">
                  {r.value}
                  {r.unit ?? ""}
                  <span className="ml-1.5 text-[10px] text-[var(--dim)]">
                    {r.trigger_above !== undefined
                      ? `▸${r.trigger_above}${r.unit ?? ""}`
                      : r.trigger_below !== undefined
                        ? `◂${r.trigger_below}${r.unit ?? ""}`
                        : null}
                  </span>
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden bg-[var(--panel-head)]">
                <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
