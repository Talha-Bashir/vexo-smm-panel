import type { Metadata } from "next";
import { ServicesCatalogClient } from "./services-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SMM Services & Wholesale Pricing Catalog",
  description:
    "Browse 400+ cheapest automated SMM services for Instagram, TikTok, YouTube, Facebook, and Telegram. Wholesale rates in PKR and USD with instant delivery via SadaPay, Easypaisa, JazzCash, and Binance Pay.",
  alternates: {
    canonical: "/services",
  },
  openGraph: {
    title: "SMM Services & Wholesale Pricing Catalog",
    description:
      "Cheapest real automated social media marketing services with instant delivery. Check live rates in PKR and USD.",
    url: "/services",
  },
};

export default function ServicesPage() {
  return <ServicesCatalogClient />;
}
