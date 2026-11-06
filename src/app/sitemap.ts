import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";
  return ["", "/verify", "/docs"].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly", priority: p ? 0.6 : 1 }));
}
