import { ImageResponse } from "next/og";
import { OgMark } from "@/lib/og-mark";
import { getBriefing, getAllMarketsVerdicts } from "@/lib/data";
import { formatBriefingDateLine } from "@/lib/utils";
import { verdictHeadline } from "@/lib/verdict-headline";

export const runtime = "nodejs"; // needs fs to read briefing files
export const alt = "Buy-Side Briefings — Markets briefing";
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
            background: "#000",
            color: "#ffa500",
            fontFamily: "monospace",
            fontSize: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Briefing not found
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

  const rationale = verdict?.verdict.rationale_short ?? "";
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
          background: "#000",
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
            <OgMark height={46} />
            <span style={{ color: "#71717a" }}>Buy-Side Briefings</span>
          </div>
          <span style={{ color: "#b45309" }}>{title}</span>
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
            BRIEFING
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
                // Clamp to ~2 lines visually
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {rationale}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            fontSize: 20,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#71717a",
            paddingTop: 20,
            borderTop: `1px solid ${accentColor}`,
          }}
        >
          <span>Buy-side analyst voice · every claim sourced</span>
          <span>Cited, auditable</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
