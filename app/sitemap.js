import { SITE_URL } from "@/lib/site";

export default function sitemap() {
  return ["", "/auth", "/privacy", "/terms"].map((path) => ({ url: `${SITE_URL}${path}` }));
}
