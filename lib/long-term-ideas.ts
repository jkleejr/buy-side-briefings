import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "data");

// ---------------------------------------------------------------------------
// Long-term ideas — structural, thesis-driven positions measured in quarters to
// years (the patient counterpart to /short-term-ideas, which is next-session
// tactics). Same focus: NVIDIA, big tech, SpaceX, crypto. Read for perspective
// on where the secular trends point; explicitly not advice. One JSON file per
// authoring day at data/long-term-ideas/<YYYY-MM-DD>.json.
// ---------------------------------------------------------------------------

export type IdeaLean = "buy" | "sell" | "watch";
export type IdeaConviction = "low" | "medium" | "high";
export type IdeaCategory = "ai-semis" | "big-tech" | "crypto" | "space";

export type LongTermIdea = {
  ticker: string;
  name: string;
  category: IdeaCategory;
  /** Structural lean: accumulate (buy), avoid/reduce (sell), or watch. */
  lean: IdeaLean;
  conviction: IdeaConviction;
  /** Holding window, e.g. "1-3 years". */
  timeframe: string;
  /** One-line thesis. */
  idea: string;
  /** 2-4 sentences on the structural reasoning. */
  why: string;
  /** The secular driver expected to play out. Optional. */
  driver?: string;
  /** What would break the thesis. Optional. */
  risk?: string;
};

export type LongTermIdeaSet = {
  /** Day the ideas were written (YYYY-MM-DD). */
  date: string;
  generated_at: string;
  is_seed?: boolean;
  /** Short framing of the structural backdrop. */
  intro: string;
  ideas: LongTermIdea[];
};

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

/** All idea sets, newest first. */
export function getAllLongTermIdeaSets(): LongTermIdeaSet[] {
  const dir = path.join(DATA_DIR, "long-term-ideas");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<LongTermIdeaSet>(path.join(dir, f)))
    .filter((s): s is LongTermIdeaSet => s !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getLatestLongTermIdeas(): LongTermIdeaSet | null {
  return getAllLongTermIdeaSets()[0] ?? null;
}
