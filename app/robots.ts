import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/editor",
          "/settings",
          "/billing",
          "/onboarding",
          "/welcome",
          "/status",
          "/signin",
          "/signup",
          "/api/",
        ],
      },
    ],
    sitemap: `${env.siteUrl}/sitemap.xml`,
    host: new URL(env.siteUrl).host,
  };
}
