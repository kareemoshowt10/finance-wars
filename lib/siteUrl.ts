/**
 * The app's public origin, for anything that has to be an absolute URL:
 * sitemap entries, canonical links, OG image URLs, OAuth and Stripe returns.
 *
 * Prefers the explicitly configured value; falls back to the origin Vercel
 * injects so a preview deploy links to itself rather than to production; then
 * to localhost for `next dev`.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}
