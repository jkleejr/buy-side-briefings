import { ImageResponse } from "next/og";
import { getBriefing, getAllMarketsVerdicts } from "@/lib/data";
import { formatBriefingTitle } from "@/lib/utils";

export const runtime = "nodejs"; // needs fs to read briefing files
export const alt = "Buy-Side Briefings — Markets verdict";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Verdict-code → hex color, matching the in-app palette.
const CODE_COLOR: Record<string, string> = {
  buy: "#22c55e",
  hold: "#facc15",
  step_aside: "#fb923c",
  bearish: "#ef4444",
};
const CODE_EMOJI: Record<string, string> = {
  buy: "🟢",
  hold: "🟡",
  step_aside: "🟠",
  bearish: "🔴",
};

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

  const code = verdict?.verdict.code ?? "hold";
  const label = verdict?.verdict.label ?? "Briefing";
  const emoji = verdict?.verdict.emoji ?? CODE_EMOJI[code] ?? "🟡";
  const conviction = verdict?.verdict.conviction?.toUpperCase() ?? "";
  const rationale = verdict?.verdict.rationale_short ?? "";
  const accentColor = CODE_COLOR[code] ?? "#facc15";
  const title = formatBriefingTitle(briefing);

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
            alignItems: "baseline",
            justifyContent: "space-between",
            fontSize: 24,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
            <span style={{ color: "#ffa500", fontWeight: 700 }}>BSB</span>
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
            VERDICT
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              fontSize: 84,
              fontWeight: 700,
              lineHeight: 1.0,
              color: accentColor,
              textTransform: "uppercase",
            }}
          >
            <span style={{ fontSize: 96 }}>{emoji}</span>
            <span>{label}</span>
          </div>
          {conviction && (
            <div
              style={{
                fontSize: 26,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#71717a",
              }}
            >
              Conviction: <span style={{ color: "#e4e4e7" }}>{conviction}</span>
            </div>
          )}
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
          <span>Buy-side analyst voice · mandatory bear case</span>
          <span>Educational only · not advice</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
