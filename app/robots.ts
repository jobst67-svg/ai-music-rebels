import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/account", "/admin", "/auth"] }], sitemap: "https://aimusicrebels.com/sitemap.xml" };
}
