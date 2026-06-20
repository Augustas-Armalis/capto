import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { POSTS, allPostSlugs } from "@/lib/blog";
import { allCompareSlugs } from "@/lib/compare";
import { vsSlugs, COMPARE_TO_VS } from "@/lib/vs";
import { allToolSlugs } from "@/lib/tools";
import { allStyleSlugs } from "@/lib/styles";

// Stable content date so lastModified is a meaningful signal (not "today" on
// every crawl). Bump when the marketing/programmatic content meaningfully changes.
const CONTENT_DATE = new Date("2026-06-19");

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.siteUrl.replace(/\/$/, "");
  const at = (
    path: string,
    priority = 0.6,
    freq: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly",
    lastModified: Date = CONTENT_DATE,
  ) => ({ url: `${base}${path}`, lastModified, changeFrequency: freq, priority });

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

  const postDate = (slug: string) => {
    const d = POSTS.find((p) => p.slug === slug)?.date;
    const parsed = d ? new Date(d) : CONTENT_DATE;
    return isNaN(parsed.getTime()) ? CONTENT_DATE : parsed;
  };
  const blog = allPostSlugs().map((s) => at(`/blog/${s}`, 0.6, "monthly", postDate(s)));
  const compare = allCompareSlugs()
    .filter((s) => !COMPARE_TO_VS[s]) // the big four redirect to /vs
    .map((s) => at(`/compare/${s}`, 0.8));
  const vs = vsSlugs().map((s) => at(`/vs/${s}`, 0.9));
  const tools = allToolSlugs().map((s) => at(`/tools/${s}`, 0.8));
  const styles = allStyleSlugs().map((s) => at(`/styles/${s}`, 0.7));

  return [...staticPages, ...vs, ...tools, ...styles, ...compare, ...blog];
}
