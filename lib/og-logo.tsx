import { getSiteUrl } from "@/lib/site-url";

/**
 * The house mark for Open Graph cards.
 *
 * Satori (next/og) cannot render an inline <svg>, but it will fetch and draw an
 * <img>, so the card uses the same PNG the site header does rather than a
 * redrawn approximation — one mark everywhere a reader meets the site.
 *
 * The src has to be absolute: the card is rendered on the server with no page
 * to resolve a relative path against.
 */
export function OgLogo({ height }: { height: number }) {
  // The artwork is 840 x 690.
  const width = Math.round((height * 840) / 690);
  return (
    // next/image renders a browser component; an ImageResponse is rasterised
    // by Satori, which draws a raw <img> and nothing else.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${getSiteUrl()}/brand/cash-stack.png`}
      alt=""
      width={width}
      height={height}
    />
  );
}
