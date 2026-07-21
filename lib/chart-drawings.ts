// Freehand and straight-line annotations drawn on top of a chart.
//
// Points are stored NORMALISED to the plot rectangle (0–1 on both axes) rather
// than in pixels, so a drawing survives the chart being resized, expanded to
// full screen, or rendered in the compact variant. It does not survive
// switching symbol or timeframe — those are different pictures, so each gets
// its own set.
//
// Pure module: no React, no server imports.

/** Ink options. Black and white are literal rather than themed: the point of
 *  picking them is to get that colour, not one that flips with the theme. The
 *  blue and red are the palette's own accents so a default drawing still looks
 *  like it belongs to the site. */
export const DRAW_COLORS = [
  { id: "blue", label: "Blue", value: "var(--ceiling)" },
  { id: "red", label: "Red", value: "var(--floor)" },
  { id: "black", label: "Black", value: "#12110e" },
  { id: "white", label: "White", value: "#f4efe3" },
] as const;

export type DrawColorId = (typeof DRAW_COLORS)[number]["id"];

export function colorValue(id: DrawColorId | undefined): string {
  return DRAW_COLORS.find((c) => c.id === id)?.value ?? DRAW_COLORS[0].value;
}

type Styled = { color?: DrawColorId };

export type Shape =
  | ({ kind: "line"; x1: number; y1: number; x2: number; y2: number } & Styled)
  | ({ kind: "free"; pts: Array<[number, number]> } & Styled);

export type DrawTool = "none" | "line" | "free";

const STORAGE_PREFIX = "bsb.drawings.v1";
/** Guard against a runaway pointer filling storage with one enormous path. */
const MAX_SHAPES = 200;
const MAX_POINTS_PER_PATH = 2000;

export function drawingsKey(symbol: string, range: string): string {
  return `${STORAGE_PREFIX}:${symbol}:${range}`;
}

/**
 * Exposed as an external store rather than read during render.
 *
 * The toolbar (undo/clear enabled state, the "N drawings" count) renders before
 * any price data arrives, so reading localStorage inline made the server emit
 * "no drawings" and the client's first paint emit "3 drawings" — a hydration
 * mismatch. useSyncExternalStore lets the server snapshot be empty and the
 * client adopt the stored set after mount, with no setState in an effect.
 *
 * getSnapshot must be referentially stable or React re-renders forever, hence
 * the cache: the same array identity is returned until a save replaces it.
 */
const EMPTY: Shape[] = [];
const cache = new Map<string, Shape[]>();
const listeners = new Set<() => void>();

function readStorage(key: string): Shape[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Shape[]).slice(0, MAX_SHAPES) : EMPTY;
  } catch {
    // Corrupt or unavailable storage should never break the chart.
    return EMPTY;
  }
}

export function subscribeDrawings(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Client snapshot — stable identity per key until it changes. */
export function drawingsSnapshot(symbol: string, range: string): Shape[] {
  const key = drawingsKey(symbol, range);
  let v = cache.get(key);
  if (!v) {
    v = readStorage(key);
    cache.set(key, v);
  }
  return v;
}

/** Server snapshot — always empty; the browser owns this state. */
export function drawingsServerSnapshot(): Shape[] {
  return EMPTY;
}

export function saveDrawings(symbol: string, range: string, shapes: Shape[]): void {
  const key = drawingsKey(symbol, range);
  const next = shapes.slice(-MAX_SHAPES);
  cache.set(key, next.length ? next : EMPTY);
  if (typeof window !== "undefined") {
    try {
      if (!next.length) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Private mode / quota — drawing still works for the session.
    }
  }
  listeners.forEach((l) => l());
}

/** Drop near-duplicate points so a slow drag doesn't store thousands of them. */
export function appendPoint(
  pts: Array<[number, number]>,
  p: [number, number],
  minDelta = 0.002,
): Array<[number, number]> {
  const last = pts[pts.length - 1];
  if (last && Math.abs(last[0] - p[0]) < minDelta && Math.abs(last[1] - p[1]) < minDelta) {
    return pts;
  }
  return pts.length >= MAX_POINTS_PER_PATH ? pts : [...pts, p];
}

/** An SVG path `d` for a freehand stroke, in normalised space. */
export function freehandPath(
  pts: Array<[number, number]>,
  toX: (n: number) => number,
  toY: (n: number) => number,
): string {
  if (!pts.length) return "";
  return pts
    .map(([x, y], i) => `${i ? "L" : "M"}${toX(x).toFixed(1)},${toY(y).toFixed(1)}`)
    .join("");
}
