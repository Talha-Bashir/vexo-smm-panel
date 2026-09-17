import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vexarosmm.com";

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
          "/login",
          "/signup",
          "/terms",
          "/privacy",
        ],
        disallow: ["/admin", "/admin/*", "/api/*"],
      },
      {
        userAgent: "Googlebot",
        allow: [
          "/",
          "/smm-panel",
          "/instagram-services",
          "/tiktok-services",
          "/youtube-services",
          "/facebook-services",
          "/telegram-services",
          "/login",
          "/signup",
          "/terms",
          "/privacy",
        ],
        disallow: ["/admin", "/admin/*", "/api/*"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
