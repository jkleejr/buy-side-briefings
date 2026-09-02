/**
 * The footer under a data visual: where the numbers come from on the left,
 * how fresh they are on the right. Same row, same face, same size as the line
 * the levels chart already prints under itself, so every visual on the site
 * signs off the same way.
 *
 * Kept as one component rather than a class string so the wording of the two
 * recurring notes lives in one place — a reader who sees "Quotes delayed
 * ~15 min" under the chart should see exactly that under the sector table.
 */
export const YAHOO = "Source: Yahoo Finance";
export const DELAYED = "Quotes delayed ~15 min";

export default function SourceLine({
  left,
  right,
}: {
  left: string;
  right?: string;
}) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-[var(--border)] px-2 py-1.5 font-mono text-[9px] text-[var(--faint)]">
      <span>{left}</span>
      {right && <span className="whitespace-nowrap">{right}</span>}
    </div>
  );
}
