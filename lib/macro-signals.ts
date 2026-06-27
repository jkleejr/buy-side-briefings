import { getLatestMarketsVerdict, type RegimeIndicator } from "@/lib/data";
import type { Factor } from "@/lib/factors";

// ---------------------------------------------------------------------------
// Turn the market verdict's regime indicators into active macro SIGNALS keyed
// to a factor. The feed crosses these with each holding's factor exposure to
// answer "does today's macro actually touch MY book?" Read at build time from
// data we already generate — serializable, passed to the client feed as a prop.
// ---------------------------------------------------------------------------

export type SignalState = "pressure" | "tailwind";

export type MacroSignal = {
  /** Stable id, e.g. "rates", "risk-vix". */
  id: string;
  label: string;
  factor: Factor;
  state: SignalState;
  value: number;
  unit?: string;
  /** One-line read, distilled from the indicator's status narrative. */
  note: string;
};

// How each regime indicator maps to a factor. `near` widens "pressure" to
// include values approaching (not yet past) an upper trigger — a 30Y yield at
// 4.85 with a 5.00 gate is already weighing on duration, not benign.
const RULES: Array<{
  match: RegExp;
  factor: Factor;
  label: string;
  near?: number;
}> = [
  { match: /vix/i, factor: "risk", label: "Volatility (VIX)" },
  { match: /30y|10y|yield|treasury/i, factor: "rates", label: "Long rates", near: 0.3 },
  { match: /dxy|dollar/i, factor: "dollar", label: "US dollar (DXY)" },
  { match: /spx|s&p|7,?460/i, factor: "risk", label: "S&P regime line" },
  { match: /btc|bitcoin/i, factor: "crypto", label: "Bitcoin" },
  { match: /brent|wti|oil/i, factor: "oil", label: "Oil (Brent)" },
];

/** First sentence / clause of the status narrative, capped for a chip-line. */
function shortNote(status: string | undefined, cap = 150): string {
  if (!status) return "";
  const clean = status.trim().replace(/\s+/g, " ");
  // Status lines lead with the verdict ("BREACH — …", "15-BPS BUFFER — …").
  const sentence = clean.split(/(?<=[.!?;])\s+/)[0] ?? clean;
  return sentence.length > cap ? sentence.slice(0, cap - 1).trimEnd() + "…" : sentence;
}

function classify(
  ind: RegimeIndicator,
  near: number,
): SignalState | null {
  if (ind.trigger_below != null && ind.value < ind.trigger_below) return "pressure";
  if (ind.trigger_above != null) {
    if (ind.value > ind.trigger_above) return "pressure";
    if (ind.value > ind.trigger_above - near) return "pressure"; // approaching the gate
    // Comfortably below an upper trigger (e.g. oil far from its spike level)
    // reads as a tailwind for that factor.
    if (ind.value < ind.trigger_above * 0.85) return "tailwind";
  }
  return null;
}

export function getMacroSignals(): MacroSignal[] {
  const verdict = getLatestMarketsVerdict();
  if (!verdict) return [];
  const out: MacroSignal[] = [];
  for (const ind of verdict.regime_risk) {
    const rule = RULES.find((r) => r.match.test(ind.name));
    if (!rule) continue;
    const state = classify(ind, rule.near ?? 0);
    if (!state) continue;
    out.push({
      id: `${rule.factor}-${ind.name.replace(/\s+/g, "-").toLowerCase()}`,
      label: rule.label,
      factor: rule.factor,
      state,
      value: ind.value,
      unit: ind.unit,
      note: shortNote(ind.status),
    });
  }
  return out;
}
