import Anthropic from "@anthropic-ai/sdk";
import { getProfiles, getTradeQuotes } from "@/lib/markets";
import { getMacroSignals } from "@/lib/macro-signals";
import type { TradeAction, Conviction } from "@/lib/asset-daily";

// ---------------------------------------------------------------------------
// On-demand AI read for ANY ticker the user holds but we don't run a desk on.
// Gathers the same structured context the feed already has (sector/beta, live
// quote, today's regime pressures) and asks Claude for a tight holder read:
// standing call + the so-what + the strongest bull/bear line. Returns null when
// no API key is configured, so the feed falls back to its templated read.
//
// SERVER-ONLY: imports the Anthropic SDK — never import this from client code.
// ---------------------------------------------------------------------------

export type LiteRead = {
  symbol: string;
  name: string;
  action: TradeAction;
  conviction: Conviction;
  rationale: string;
  bull: string;
  bear: string;
  price: number | null;
  changePct: number | null;
  date: string;
  generatedAt: string;
};

// Defaults to the most capable model; override to a cheaper tier (e.g.
// claude-haiku-4-5) via env to cut per-read cost.
const MODEL = process.env.LITE_READ_MODEL || "claude-opus-4-8";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: { type: "string", enum: ["buy", "hold", "sell", "step_aside"] },
    conviction: { type: "string", enum: ["low", "medium", "high"] },
    rationale: {
      type: "string",
      description: "1–2 plain sentences: what today's call means for a holder.",
    },
    bull: { type: "string", description: "The single strongest bull point." },
    bear: { type: "string", description: "The single strongest bear point." },
  },
  required: ["action", "conviction", "rationale", "bull", "bear"],
} as const;

const SYSTEM = [
  "You are a buy-side analyst writing a tight, one-glance read for an investor who already holds this stock.",
  "Be honest and concrete: no hype, no hedging boilerplate, no disclaimers, no jargon.",
  "Ground any macro comment in the regime context provided — don't invent macro.",
  "If the name is genuinely outside your competence or you lack a real view, say so plainly in the rationale and lean to a low-conviction hold or step_aside rather than fabricating conviction.",
].join(" ");

export async function generateLiteRead(
  symbol: string,
  today: string,
): Promise<LiteRead | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const sym = symbol.toUpperCase();
  const [profiles, quotes] = await Promise.all([
    getProfiles([sym]),
    getTradeQuotes([sym]),
  ]);
  const p = profiles[0];
  const q = quotes[0];
  const name = p?.name ?? q?.name ?? sym;

  const pressures = getMacroSignals().filter((s) => s.state === "pressure");
  const macroLine = pressures.length
    ? pressures.map((s) => `${s.label} (${s.factor})`).join("; ")
    : "no major regime pressures flagged today";

  const context = [
    `Ticker: ${sym}`,
    `Name: ${name}`,
    p?.sector ? `Sector: ${p.sector}` : null,
    p?.industry ? `Industry: ${p.industry}` : null,
    p?.beta != null ? `Beta: ${p.beta.toFixed(2)}` : null,
    q?.price != null
      ? `Last price: $${q.price} (${q.changePct != null ? q.changePct.toFixed(2) + "% today" : "change n/a"})`
      : null,
    `Today's active macro pressures: ${macroLine}`,
  ]
    .filter(Boolean)
    .join("\n");

  const client = new Anthropic({ apiKey });
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Write the holder read for this stock.\n\n${context}\n\nReturn action, conviction, a 1–2 sentence rationale (the so-what for a holder), and one bull and one bear line.`,
      },
    ],
  });

  const block = resp.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );
  if (!block?.text) return null;

  let parsed: Pick<LiteRead, "action" | "conviction" | "rationale" | "bull" | "bear">;
  try {
    parsed = JSON.parse(block.text);
  } catch {
    return null;
  }

  return {
    symbol: sym,
    name,
    action: parsed.action,
    conviction: parsed.conviction,
    rationale: parsed.rationale,
    bull: parsed.bull,
    bear: parsed.bear,
    price: q?.price ?? null,
    changePct: q?.changePct ?? null,
    date: today,
    generatedAt: new Date().toISOString(),
  };
}
