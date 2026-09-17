import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vexo-smm-panel-7sln.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/smm-panel",
          "/instagram-services",
          "/tiktok-services",
          "/youtube-services",
          "/facebook-services",
          "/telegram-services",
          "/terms",
          "/privacy",
        ],
        disallow: [
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
        ],
      },
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "GPTBot",
          "ChatGPT-User",
          "OAI-SearchBot",
          "ClaudeBot",
          "PerplexityBot",
        ],
        allow: [
          "/",
          "/smm-panel",
          "/instagram-services",
          "/tiktok-services",
          "/youtube-services",
          "/facebook-services",
          "/telegram-services",
          "/terms",
          "/privacy",
        ],
        disallow: [
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
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
