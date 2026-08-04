import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "Buy-Side Briefings — a market briefing twice a day, every claim linked to its source";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Default Open Graph image for the site root. Bloomberg-terminal styling:
// black background, amber branding, headline + tagline + a bottom strip.
// Copy matches the site metadata in app/layout.tsx — this is the same claim,
// so the two have to be changed together or a shared link contradicts the page.
export default async function OgImage() {
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
          padding: 64,
          justifyContent: "space-between",
        }}
      >
        {/* Top bar — bracket code + brand */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            fontSize: 28,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "#ffa500", fontWeight: 700 }}>BSB</span>
          <span style={{ color: "#71717a" }}>Buy-Side Briefings · Terminal</span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#e4e4e7",
            }}
          >
            Market briefings, twice a day.
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#ffa500",
            }}
          >
            Every claim linked to its source.
          </div>
        </div>

        {/* Bottom strip — disclaimer + URL */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            fontSize: 22,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#71717a",
            paddingTop: 24,
            borderTop: "1px solid #262626",
          }}
        >
          <span>Morning &amp; night editions</span>
          <span style={{ color: "#ffa500" }}>● LIVE</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
