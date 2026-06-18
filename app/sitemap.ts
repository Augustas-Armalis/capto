import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { allPostSlugs } from "@/lib/blog";
import { allCompareSlugs } from "@/lib/compare";
import { allToolSlugs } from "@/lib/tools";
import { allStyleSlugs } from "@/lib/styles";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.siteUrl.replace(/\/$/, "");
  const at = (path: string, priority = 0.6, freq: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly") => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: freq,
    priority,
  });

  const staticPages = [
    at("/", 1, "weekly"),
    at("/pricing", 0.9, "weekly"),
    at("/for-creators", 0.7),
    at("/for-brands", 0.7),
    at("/tools", 0.8),
    at("/styles", 0.8),
    at("/compare", 0.8),
    at("/blog", 0.7),
    at("/faq", 0.6),
    at("/contact", 0.4),
    at("/privacy", 0.3, "yearly"),
    at("/terms", 0.3, "yearly"),
  ];

  const blog = allPostSlugs().map((s) => at(`/blog/${s}`, 0.6));
  const compare = allCompareSlugs().map((s) => at(`/compare/${s}`, 0.8));
  const tools = allToolSlugs().map((s) => at(`/tools/${s}`, 0.8));
  const styles = allStyleSlugs().map((s) => at(`/styles/${s}`, 0.7));

  return [...staticPages, ...tools, ...styles, ...compare, ...blog];
}
