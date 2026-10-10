import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VEXARO SMM Panel – Affordable Social Media Growth",
    short_name: "VEXARO SMM",
    description: "The #1 Cheapest Automated SMM Panel in Pakistan & Worldwide. Instant delivery for Instagram, TikTok, YouTube, and Facebook.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a1110",
    theme_color: "#07100f",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
