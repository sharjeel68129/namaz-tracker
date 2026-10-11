import { SITE_URL } from "@/lib/site";

/** Search engines may list the public pages; the signed-in ones have nothing for them. */
export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/history", "/settings", "/onboarding", "/auth/callback"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
