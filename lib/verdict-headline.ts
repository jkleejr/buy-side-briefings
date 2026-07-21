// The one-line "what you need to know" for a verdict.
//
// The routines started writing an explicit `verdict.headline` — a plain-English,
// news-first sentence with no prices or house jargon — only recently, so most
// of the archive doesn't have one. For those, derive the newsiest clause from
// the verdict label, which packs the whole tape into one string:
//
//   "HOLD — Kyber delayed; KOSPI –4.9%; NVDA pre-mkt $197…"
//
// Everything after the em dash is the tape; the first clause with no prices or
// percentages in it is the part that actually reads as news.
//
// Shared by the homepage hero and the briefings archive so a briefing is
// described the same way wherever it appears.

export function clampText(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  const cut = t.slice(0, maxChars);
  const lastDot = cut.lastIndexOf(". ");
  if (lastDot > maxChars * 0.5) return cut.slice(0, lastDot + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, lastSpace > 0 ? lastSpace : maxChars).trim() + "…";
}

export function verdictHeadline(
  verdict: { headline?: string; label?: string } | undefined,
  maxChars = 110,
): string | undefined {
  if (!verdict) return undefined;

  const written = verdict.headline?.trim();
  if (written) return clampText(written, maxChars);

  const label = verdict.label?.trim();
  if (!label) return undefined;

  const idx = label.indexOf("—");
  const tape = (idx >= 0 ? label.slice(idx + 1) : label).trim();
  const clauses = tape
    .split(";")
    .map((c) => c.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // First clause with no price/percent tokens is the newsiest one.
  const newsy = clauses.find((c) => !/[$₩€£%]/.test(c) && !/\d[\d,]*\.\d/.test(c));
  const best = newsy ?? clauses[0] ?? tape;
  return best ? clampText(best, maxChars) : undefined;
}
