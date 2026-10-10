import type { Metadata } from "next";
import { ServicesCatalogClient } from "./services-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Services & Wholesale Pricing – Best SMM Rates in Pakistan",
  description:
    "Browse 400+ cheapest automated SMM services for Instagram, TikTok, YouTube, Facebook, and Telegram. Wholesale rates in PKR and USD with instant delivery via SadaPay, Easypaisa, JazzCash, and Binance Pay.",
  alternates: {
    canonical: "/services",
  },
  openGraph: {
    title: "Services & Wholesale Pricing | VEXARO SMM Panel",
    description:
      "Cheapest real automated social media marketing services with instant delivery. Check live rates in PKR and USD.",
    url: "/services",
  },
};

export default function ServicesPage() {
  return <ServicesCatalogClient />;
}
