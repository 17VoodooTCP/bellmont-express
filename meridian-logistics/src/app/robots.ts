import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* /login and /account are left crawlable on purpose: they carry a noindex
   tag, and Google can only obey that tag on a page it is allowed to fetch. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/admin/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
