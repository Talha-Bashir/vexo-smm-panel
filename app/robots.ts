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

  const publicAllowedPaths = [
    "/",
    "/blog",
    "/blog/*",
    "/services",
    "/smm-panel",
    "/instagram-services",
    "/tiktok-services",
    "/youtube-services",
    "/facebook-services",
    "/telegram-services",
    "/terms",
    "/privacy",
    "/llms.txt",
    "/llms-full.txt",
  ];

  const privateDisallowedPaths = [
    "/login",
    "/login/*",
    "/signup",
    "/signup/*",
    "/forgot-password",
    "/forgot-password/*",
    "/dashboard",
    "/dashboard/*",
    "/admin",
    "/admin/*",
    "/api/*",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: publicAllowedPaths,
        disallow: privateDisallowedPaths,
      },
      {
        // Major Search & Generative AI Crawlers (ChatGPT, Claude, Perplexity, Gemini, Bing/Copilot, Apple)
        userAgent: [
          "Googlebot",
          "Google-Extended",
          "Bingbot",
          "GPTBot",
          "ChatGPT-User",
          "OAI-SearchBot",
          "ClaudeBot",
          "anthropic-ai",
          "PerplexityBot",
          "Applebot",
          "Applebot-Extended",
          "CCBot",
          "cohere-ai",
          "Diffbot",
          "Bytespider",
        ],
        allow: publicAllowedPaths,
        disallow: privateDisallowedPaths,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
