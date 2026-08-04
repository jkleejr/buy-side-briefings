import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Buy-Side Briefings — opinionated, cited, auditable market briefings";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Default Open Graph image for the site root. Bloomberg-terminal styling:
// black background, amber branding, headline + tagline + cited disclaimer.
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
            Opinionated market analysis.
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#ffa500",
            }}
          >
            Buy-side voice. Cited every day.
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
          <span>Cited, auditable market briefings</span>
          <span style={{ color: "#ffa500" }}>● LIVE</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
