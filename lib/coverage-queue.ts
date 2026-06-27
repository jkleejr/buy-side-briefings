import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// The coverage queue: tickers a user asked the feed to start a desk on. Lives
// at data/coverage-queue.json (committed). The daily routine reads it, writes a
// lite dossier per queued name, and flips status to "lite". Writes are best-
// effort: they succeed on a writable filesystem (local dev, where coverage is
// actually curated) and no-op on a read-only one (Vercel runtime) — the client
// keeps a localStorage mirror so nothing is lost.
// ---------------------------------------------------------------------------

const QUEUE_PATH = path.resolve(process.cwd(), "data", "coverage-queue.json");

export type CoverageStatus = "queued" | "lite" | "deep";

export type CoverageRequest = {
  symbol: string;
  name: string;
  requestedAt: string;
  status: CoverageStatus;
};

type QueueFile = { _comment?: string; requests: CoverageRequest[] };

function read(): QueueFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf-8"));
    return {
      _comment: parsed._comment,
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
    };
  } catch {
    return { requests: [] };
  }
}

export function getCoverageRequests(): CoverageRequest[] {
  return read().requests;
}

/** Append a request if it isn't already queued. */
export function appendCoverageRequest(
  symbol: string,
  name: string,
): { persisted: boolean; alreadyQueued: boolean } {
  const sym = symbol.toUpperCase();
  const file = read();
  if (file.requests.some((r) => r.symbol === sym)) {
    return { persisted: true, alreadyQueued: true };
  }
  const requests: CoverageRequest[] = [
    { symbol: sym, name, requestedAt: new Date().toISOString(), status: "queued" },
    ...file.requests,
  ];
  try {
    fs.writeFileSync(
      QUEUE_PATH,
      JSON.stringify({ _comment: file._comment, requests }, null, 2) + "\n",
    );
    return { persisted: true, alreadyQueued: false };
  } catch {
    return { persisted: false, alreadyQueued: false };
  }
}
