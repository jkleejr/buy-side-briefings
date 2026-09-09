import { ImageResponse } from "next/og";
import { OgLogo } from "@/lib/og-logo";
import { getBriefing, getAllMarketsVerdicts } from "@/lib/data";
import { formatBriefingDateLine } from "@/lib/utils";
import { clampText, verdictHeadline } from "@/lib/verdict-headline";

export const runtime = "nodejs"; // needs fs to read briefing files
export const alt = "Buy Side — Markets report";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";


export default async function BriefingOgImage({
  params,
}: {
  params: Promise<{ routine: string; slug: string }>;
}) {
  const { routine, slug } = await params;
  const briefing = getBriefing(routine, slug);
  if (!briefing) {
    // Fallback to the default site OG composition if the briefing isn't found.
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#0d0d0b",
            color: "#93a9e2",
            fontFamily: "monospace",
            fontSize: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Report not found
        </div>
      ),
      { ...size },
    );
  }

  const verdict = briefing.verdict_ref
    ? getAllMarketsVerdicts().find(
        (v) => `${v.routine}-${v.date}-${v.window}` === briefing.verdict_ref,
      )
    : null;

  // Clamped here, in the string. Satori does not implement -webkit-line-clamp,
  // so the CSS version of this clamped nothing and a long summary ran off the
  // bottom of the card — invisible until the bar below it was removed. ~120
  // characters is two lines at this size and measure.
  const rationaleFull = verdict?.verdict.rationale_short ?? "";
  const rationale = rationaleFull ? clampText(rationaleFull, 120) : "";
  // The share card now leads with the news headline instead of a stance.
  const headline = verdictHeadline(verdict?.verdict, 90) ?? "Briefing";
  // One accent for every card now that the stance no longer colours it.
  const accentColor = "#93a9e2";
  const title = formatBriefingDateLine(briefing);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0d0d0b",
          color: "#e4e4e7",
          fontFamily: "monospace",
          display: "flex",
          flexDirection: "column",
          padding: 56,
          justifyContent: "space-between",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 24,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <OgLogo height={46} />
            <span style={{ color: "#71717a" }}>Buy Side</span>
          </div>
          <span style={{ color: "#71717a" }}>{title}</span>
        </div>

        {/* Headline: verdict */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 32,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: accentColor,
            }}
          >
            REPORT
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1.0,
              color: accentColor,
              textTransform: "uppercase",
            }}
          >
            <span>{headline}</span>
          </div>
          {rationale && (
            <div
              style={{
                fontSize: 30,
                lineHeight: 1.35,
                color: "#e4e4e7",
                maxWidth: 1080,
                marginTop: 12,
              }}
            >
              {rationale}
            </div>
          )}
        </div>

      </div>
    ),
    { ...size },
  );
}
