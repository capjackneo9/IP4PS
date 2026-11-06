import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";
  return { rules: { userAgent: "*", allow: ["/", "/verify", "/docs"], disallow: ["/api/"] }, sitemap: `${base}/sitemap.xml` };
}
