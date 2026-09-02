/**
 * Keeps the browser's own chrome — the iOS Safari tab bar, the Android
 * Chrome toolbar — painted the same colour as the page ground.
 *
 * The ground is a CSS variable that changes with the theme toggle and, on
 * the homepage, with the AM/PM edition switch, so a static
 * <meta name="theme-color"> would drift out of step. Call this after any
 * change to those and it re-reads --background off <html> and writes it to
 * the meta tag, creating the tag on first use. Safe on the server (no-op).
 */
export function syncThemeColor() {
  if (typeof document === "undefined") return;
  const ground = getComputedStyle(document.documentElement)
    .getPropertyValue("--background")
    .trim();
  if (!ground) return;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = ground;
}
