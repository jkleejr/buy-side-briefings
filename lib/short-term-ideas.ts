import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "data");

// ---------------------------------------------------------------------------
// Short-term ideas — a daily, next-session-focused list of trade *perspectives*
// (not the journaled, sized opportunities in /opportunities). Each idea is a
// quick directional lean with a short "why", aimed at NVIDIA, big tech, SpaceX,
// and crypto. Read for perspective; explicitly not advice. One JSON file per
// authoring day at data/short-term-ideas/<YYYY-MM-DD>.json.
// ---------------------------------------------------------------------------

export type IdeaLean = "buy" | "sell" | "watch";
export type IdeaConviction = "low" | "medium" | "high";
export type IdeaCategory = "ai-semis" | "big-tech" | "crypto" | "space";

export type ShortTermIdea = {
  ticker: string;
  name: string;
  category: IdeaCategory;
  /** Directional lean for the next session: long (buy), short (sell), or just watch. */
  lean: IdeaLean;
  conviction: IdeaConviction;
  /** Rough holding window, e.g. "1-3 days". */
  timeframe: string;
  /** One-line statement of the idea. */
  idea: string;
  /** 2-4 sentences on the reasoning — the "why buy / why sell". */
  why: string;
  /** What would confirm/trigger the idea (a level, a catalyst). Optional. */
  trigger?: string;
  /** What invalidates it / the main risk. Optional. */
  risk?: string;
};

export type ShortTermIdeaSet = {
  /** Day the ideas were written (YYYY-MM-DD). */
  date: string;
  /** The next market session these target (YYYY-MM-DD). */
  for_session: string;
  generated_at: string;
  is_seed?: boolean;
  /** Short overall framing of the setup into the next session. */
  intro: string;
  ideas: ShortTermIdea[];
};

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

/** All idea sets, newest first. */
export function getAllShortTermIdeaSets(): ShortTermIdeaSet[] {
  const dir = path.join(DATA_DIR, "short-term-ideas");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<ShortTermIdeaSet>(path.join(dir, f)))
    .filter((s): s is ShortTermIdeaSet => s !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getLatestShortTermIdeas(): ShortTermIdeaSet | null {
  return getAllShortTermIdeaSets()[0] ?? null;
}
