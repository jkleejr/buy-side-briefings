/**
 * Whether a nav item points at the route being viewed.
 *
 * Normalises the pathname first, because on Vercel the homepage is
 * regenerated (ISR) under its internal name and usePathname() reports
 * "/index" rather than "/". A strict `pathname === "/"` check failed there, so
 * the server HTML shipped with no link marked, and React never corrected it —
 * hydration does not patch attribute mismatches, only a later re-render does,
 * which is why the underline appeared only after navigating away and back.
 *
 * Both the desktop nav and the mobile drawer use this, so they cannot drift.
 */
export function isActiveRoute(href: string, pathname: string | null): boolean {
  let path = pathname ?? "/";
  if (path === "/index" || path === "") path = "/";
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return href === "/" ? path === "/" : path.startsWith(href);
}
