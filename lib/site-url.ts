/**
 * Resolve the canonical absolute URL for the site. Used by sitemap, robots,
 * and Open Graph metadata. Priority:
 *   1. NEXT_PUBLIC_SITE_URL  — set this manually on Vercel for a custom domain
 *   2. VERCEL_URL            — auto-provided on Vercel deploys
 *   3. http://localhost:3000 — fallback for `npm run dev`
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
