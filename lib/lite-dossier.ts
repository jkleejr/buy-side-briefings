import fs from "node:fs";
import path from "node:path";
import type { TradeAction, Conviction } from "@/lib/asset-daily";
import type { Factor } from "@/lib/factors";

// ---------------------------------------------------------------------------
// Lite dossiers (Phase 3 of the "so what for me?" layer).
//
// The eight deep desks are a closed set with hand-built pages. To let the feed
// say something real about ANY ticker a user holds, the daily routine can write
// a much lighter, generic, symbol-keyed dossier: a standing call, one holder
// line, and the strongest bull/bear point — no positioning, levels, or page.
// These are seeded by user requests via the coverage queue (data/coverage-
// queue.json) and rendered as the middle tier between a deep desk and a bare
// live-price row.
//
// One file per name: data/asset-lite/<SYMBOL>.json (uppercase, latest only).
// ---------------------------------------------------------------------------

const LITE_DIR = path.resolve(process.cwd(), "data", "asset-lite");

export type LiteDossier = {
  /** Uppercase ticker, matched against the user's holding (e.g. "PLTR"). */
  symbol: string;
  name: string;
  /** YYYY-MM-DD of the read. */
  date: string;
  generated_at: string;
  is_seed?: boolean;

  decision: {
    action: TradeAction;
    conviction: Conviction;
    /** One-to-two sentence plain-language read — the "so what." */
    rationale: string;
  };

  /** Strongest single point each side. */
  bull: string;
  bear: string;

  /** Optional last-close snapshot; the feed falls back to a live quote. */
  snapshot?: {
    price?: number;
    change_pct?: number;
    currency_symbol?: string;
  };

  /** Optional explicit factor tags; otherwise derived from lib/factors. */
  factors?: Factor[];
};

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

/** Every lite dossier on file, keyed by uppercase symbol. Never throws. */
export function getAllLiteDossiers(): LiteDossier[] {
  if (!fs.existsSync(LITE_DIR)) return [];
  return fs
    .readdirSync(LITE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<LiteDossier>(path.join(LITE_DIR, f)))
    .filter((d): d is LiteDossier => d !== null && typeof d.symbol === "string")
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}
