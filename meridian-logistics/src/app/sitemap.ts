import type { MetadataRoute } from "next";

const BASE = "https://bellmontexpress.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/tracking", "/services", "/about", "/support"].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
