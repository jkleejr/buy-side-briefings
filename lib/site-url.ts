/**
 * Resolve the canonical absolute URL for the site. Used by sitemap, robots,
 * and Open Graph metadata. Priority:
 *   1. NEXT_PUBLIC_SITE_URL          — set this for a custom domain
 *   2. VERCEL_PROJECT_PRODUCTION_URL — the project's stable production host
 *   3. VERCEL_URL                    — this deployment's own host
 *   4. http://localhost:3000         — fallback for `npm run dev`
 *
 * VERCEL_URL is the per-deployment hostname
 * (buy-side-briefings-jpql2dd9g-…vercel.app), not the site's address. Reading
 * it first put that hostname into every og:image and every sitemap <loc>: a
 * shared link carried a host that changes on the next deploy, and the sitemap
 * advertised URLs that would not survive one. VERCEL_PROJECT_PRODUCTION_URL is
 * the stable one, so it is preferred; VERCEL_URL stays as the fallback because
 * on a preview deployment it is genuinely the right address for that build.
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
