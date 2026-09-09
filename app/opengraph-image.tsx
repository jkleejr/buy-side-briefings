import { ImageResponse } from "next/og";
import { OgLogo } from "@/lib/og-logo";

export const runtime = "edge";
export const alt = "Buy Side — automated daily stock market reports";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Default Open Graph image for the site root: the site's own dark ground, the
// house mark at the top, the claim at the bottom, nothing else. The mark is the
// same PNG the site header uses, so a shared link is recognisably ours before
// it is read.
// Copy matches the description in app/layout.tsx — the same claim in both, so
// the two have to change together or a shared link contradicts the page it
// opens.
export default async function OgImage() {
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
          padding: 64,
          justifyContent: "space-between",
        }}
      >
        {/* Top bar — house mark + brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 28,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          <OgLogo height={56} />
          <span style={{ color: "#a1a1aa" }}>Buy Side</span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#e4e4e7",
            }}
          >
            Automated daily
          </div>
          <div
            style={{
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.05,
              // The site's working accent. This was #ffa500, a pure orange that
              // appears nowhere on the site — the card was branded in a colour
              // the page it opens does not use.
              color: "#93a9e2",
            }}
          >
            stock market reports.
          </div>
        </div>

      </div>
    ),
    { ...size },
  );
}
