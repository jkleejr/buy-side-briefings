// The house mark: five candles running down-then-up. Inlined as SVG rather
// than served from /logo.svg so it paints with the first byte of HTML — the
// header is sticky and above the fold, and a late-loading mark shifts the nav.
// Geometry traced from the 1024px master; the same shapes back the favicon,
// the apple icon and the Open Graph card, so all four stay one drawing.
const RED = "#e03b3b";
const GREEN = "#2eaf4e";

// [bodyX, high, low, bodyTop, bodyBottom, colour] — body 116 wide on a 190
// pitch, wick 22 wide centred on it.
const CANDLES: [number, number, number, number, number, string][] = [
  [74, 201, 780, 285, 654, RED],
  [264, 549, 970, 628, 881, RED],
  [454, 655, 907, 723, 838, GREEN],
  [644, 338, 791, 412, 722, GREEN],
  [834, 53, 516, 127, 448, GREEN],
];

export default function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="74 53 876 918"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {CANDLES.map(([x, high, low, top, bottom, fill]) => (
        <g key={x} fill={fill}>
          <rect x={x + 47} y={high} width={22} height={low - high + 1} />
          <rect x={x} y={top} width={116} height={bottom - top + 1} />
        </g>
      ))}
    </svg>
  );
}
