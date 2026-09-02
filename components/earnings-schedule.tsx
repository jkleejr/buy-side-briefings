import Panel from "@/components/panel";
import SourceLine, { YAHOO } from "./source-line";
import {
  type EarningsEntry,
  type EarningsSchedule as Schedule,
  fmtRevenue,
  countdownBadge,
} from "@/lib/earnings";

const HORIZON = 90; // days shown on the timeline chart axis

// Colour the countdown by how imminent the report is.
function tone(days: number): { text: string } {
  if (days <= 7) return { text: "text-[var(--amber)]" };
  if (days <= 30) return { text: "text-[var(--cyan-term)]" };
  return { text: "text-[var(--dim)]" };
}

/**
 * The timeline marker reads the same as the schedule table's Status column:
 * green for a date the company has confirmed, grey for one Yahoo is estimating.
 * It used to take the countdown's amber/cyan/grey instead, which meant the dot
 * and the number beside it both said "how soon" and nothing said "how sure".
 * Filled vs hollow still carries it for anyone who can't separate the two hues.
 */
function dotColor(isEstimate: boolean): string {
  return isEstimate ? "var(--dim)" : "var(--up)";
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * What to print wherever this page shows a symbol — the timeline axis and the
 * schedule table's ticker column both. A US ticker is the clearest label it
 * has, but a foreign listing is an exchange code: "000660.KS" and "005930.KS"
 * name SK Hynix and Samsung to nobody. Those carry the watchlist label instead.
 * Keyed on the dot, which is what separates a plain ticker from an
 * exchange-suffixed one, the same rule the levels chart's switcher uses.
 */
function displayTicker(e: EarningsEntry): string {
  return e.symbol.includes(".") ? e.label : e.symbol;
}

/**
 * Company names arrive from Yahoo in registry form — "Micron Technology, Inc.",
 * "Samsung Electronics Co., Ltd." — where the legal suffix is the same on every
 * row and identifies nothing. Stripping it is what lets the column stay narrow
 * enough for the estimates beside it to matter.
 *
 * Applied repeatedly from the end, so a stacked suffix unwinds in order:
 * "Co., Ltd." drops Ltd then Co, and TSMC's "Company Limited" drops both. A
 * separator is required before the token, which is why "Amazon.com" keeps its
 * ".com" — there is no comma or space in front of it.
 */
const LEGAL_SUFFIX =
  /[\s,&]+(?:inc(?:orporated)?|corp(?:oration)?|co(?:mpany)?|ltd|limited|plc|ag|s\.?a|n\.?v)\.?$/i;

function stripLegalSuffix(name: string): string {
  let out = name.trim();
  // Bounded rather than while(true): three passes clears the longest form on
  // file ("Co., Ltd."), and a name that is nothing but suffixes keeps itself.
  for (let i = 0; i < 3; i++) {
    const next = out.replace(LEGAL_SUFFIX, "").trim();
    if (!next || next === out) break;
    out = next;
  }
  return out;
}

// ---- The "chart": a horizontal gantt of when each name reports ------------
function TimelineChart({ entries }: { entries: EarningsEntry[] }) {
  const onAxis = entries.filter((e) => e.daysUntil <= HORIZON);
  if (onAxis.length === 0) return null;

  return (
    <div className="p-2">
      {/* Axis header. The +90d tick is deliberately absent: it sits at
          left:100%, and centring a label on the container's right edge hangs
          half of it outside the panel. The gridline still marks the boundary,
          and the horizon is named in the section above. */}
      <div className="relative mb-1 ml-16 h-4 border-b border-[var(--border)]">
        {[0, 30, 60].map((d) => (
          <div
            key={d}
            className="absolute top-0 flex h-full flex-col items-center"
            style={{ left: `${(d / HORIZON) * 100}%` }}
          >
            <span className="-translate-x-1/2 font-mono text-[9px] uppercase tracking-widest text-[var(--dim)]">
              {d === 0 ? "TODAY" : `+${d}d`}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {onAxis.map((e) => {
          const t = tone(e.daysUntil);
          const left = `${(Math.max(e.daysUntil, 0) / HORIZON) * 100}%`;
          return (
            <div key={e.symbol} className="flex items-center gap-2">
              <span
                title={e.symbol}
                className="w-14 shrink-0 truncate text-right font-mono text-[11px] font-bold text-[var(--foreground)]"
              >
                {displayTicker(e)}
              </span>
              <div className="relative h-4 flex-1">
                {/* gridlines */}
                {[30, 60, 90].map((d) => (
                  <span
                    key={d}
                    className="absolute inset-y-0 w-px bg-[var(--border)]"
                    style={{ left: `${(d / HORIZON) * 100}%` }}
                  />
                ))}
                {/* the report marker */}
                <span
                  className="absolute top-1/2 flex -translate-y-1/2 items-center gap-1"
                  style={{ left }}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 -translate-x-1/2 rounded-full"
                    style={{
                      background: e.isEstimate
                        ? "transparent"
                        : dotColor(e.isEstimate),
                      border: `1.5px solid ${dotColor(e.isEstimate)}`,
                    }}
                  />
                  <span className={`whitespace-nowrap font-mono text-[9px] ${t.text}`}>
                    {countdownBadge(e.daysUntil)}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- The detail schedule table -------------------------------------------
function ScheduleTable({ entries }: { entries: EarningsEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-[11px]">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--panel-head)] text-[10px] uppercase tracking-wider text-[var(--dim)]">
            <th className="px-2 py-1 text-left font-normal">When</th>
            <th className="px-2 py-1 text-left font-normal">Date</th>
            <th className="px-2 py-1 text-left font-normal">Ticker</th>
            <th className="px-2 py-1 text-left font-normal">Name</th>
            <th className="px-2 py-1 text-right font-normal">Price</th>
            <th className="px-2 py-1 text-right font-normal">EPS est</th>
            <th className="px-2 py-1 text-right font-normal">Rev est</th>
            <th className="px-2 py-1 text-left font-normal">Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const t = tone(e.daysUntil);
            return (
              <tr key={e.symbol} className="border-b border-[var(--border)] last:border-0">
                <td className={`px-2 py-1 font-bold ${t.text}`}>
                  {countdownBadge(e.daysUntil)}
                </td>
                <td className="px-2 py-1 text-[var(--foreground)]">{fmtDate(e.date)}</td>
                <td className="px-2 py-1 font-bold text-[var(--amber)]">
                  {displayTicker(e)}
                </td>
                <td className="px-2 py-1 text-[var(--dim)]">
                  {stripLegalSuffix(e.name ?? e.label)}
                </td>
                <td className="px-2 py-1 text-right text-[var(--foreground)]">
                  {e.price != null ? `$${e.price.toLocaleString()}` : "—"}
                </td>
                <td className="px-2 py-1 text-right text-[var(--foreground)]">
                  {e.epsEstimate != null ? `$${e.epsEstimate.toFixed(2)}` : "—"}
                </td>
                <td className="px-2 py-1 text-right text-[var(--foreground)]">
                  {fmtRevenue(e.revenueEstimate)}
                </td>
                <td className="px-2 py-1 text-[9px] uppercase tracking-widest">
                  {e.isEstimate ? (
                    <span className="text-[var(--dim)]">○ est</span>
                  ) : (
                    <span className="text-[var(--up)]">● confirmed</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function EarningsSchedule({ schedule }: { schedule: Schedule }) {
  const { entries } = schedule;

  if (entries.length === 0) {
    return (
      <Panel title="Upcoming earnings">
        <p className="p-4 text-center font-mono text-[11px] text-[var(--dim)]">
          No upcoming earnings dates available right now.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-1">
      <Panel
        title="Earnings timeline"
        /* The key reads as a header label, not a footnote: it explains the
           column of dots below it, so it belongs level with the title rather
           than stranded under the last row where the eye arrives after it has
           already needed it. */
        meta={
          <span className="whitespace-nowrap">
            <span className="text-[var(--up)]">●</span> confirmed ·{" "}
            <span className="text-[var(--dim)]">○</span> estimated
          </span>
        }
      >
        <TimelineChart entries={entries} />
      </Panel>

      <Panel title="Full schedule">
        <ScheduleTable entries={entries} />
      </Panel>
      <SourceLine left={YAHOO} right="Refreshed hourly" />
    </div>
  );
}
