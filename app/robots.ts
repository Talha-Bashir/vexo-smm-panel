import { MetadataRoute } from "next";
import { getPlatformSetting } from "@/lib/admin";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const customSiteUrl = await getPlatformSetting("seo_site_url").catch(() => "");
  const robotsIndexSetting = await getPlatformSetting("seo_robots_index").catch(() => "true");
  const baseUrl = customSiteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://vexarosmm.com";

  if (robotsIndexSetting === "false") {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/dashboard/*",
          "/admin",
          "/admin/*",
          "/api",
          "/api/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
