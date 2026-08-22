// The house mark for Open Graph cards. Satori (next/og) rasterises a small
// subset of CSS and won't render an inline <svg>, so the same five candles are
// drawn as absolutely-positioned divs. Geometry is the 1024px master's, in the
// mark's own trimmed coordinate space (876 x 918, origin 74,53).
const RED = "#e03b3b";
const GREEN = "#2eaf4e";

// [bodyX, high, low, bodyTop, bodyBottom, colour]
const CANDLES: [number, number, number, number, number, string][] = [
  [74, 201, 780, 285, 654, RED],
  [264, 549, 970, 628, 881, RED],
  [454, 655, 907, 723, 838, GREEN],
  [644, 338, 791, 412, 722, GREEN],
  [834, 53, 516, 127, 448, GREEN],
];

const VW = 876;
const VH = 918;

/** Renders the mark at `height` pixels, keeping the master's aspect ratio. */
export function OgMark({ height }: { height: number }) {
  const s = height / VH;
  const px = (n: number) => Math.round(n * s * 100) / 100;
  const rects: React.ReactElement[] = [];

  for (const [x, high, low, top, bottom, fill] of CANDLES) {
    rects.push(
      <div
        key={`w${x}`}
        style={{
          position: "absolute",
          left: px(x + 47 - 74),
          top: px(high - 53),
          width: px(22),
          height: px(low - high + 1),
          background: fill,
        }}
      />,
      <div
        key={`b${x}`}
        style={{
          position: "absolute",
          left: px(x - 74),
          top: px(top - 53),
          width: px(116),
          height: px(bottom - top + 1),
          background: fill,
        }}
      />,
    );
  }

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: px(VW),
        height: px(VH),
        flexShrink: 0,
      }}
    >
      {rects}
    </div>
  );
}
