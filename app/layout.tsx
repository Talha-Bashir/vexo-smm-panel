import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vexo-smm-panel-7sln.vercel.app";

export const viewport: Viewport = {
  themeColor: "#07100f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VEXARO SMM Panel – Affordable Social Media Marketing Services",
    template: "%s | VEXARO SMM Panel",
  },
  description:
    "VEXARO SMM is the best, cheapest, and most reliable automated SMM panel. Buy Instagram followers, TikTok likes, YouTube watch time & views, and Telegram growth with instant delivery and 24/7 support.",
  keywords: [
   "buy youtube subscribers pakistan",
    "buy youtube watchtime 4000 hours",
    "cheap youtube views",
    "facebook followers smm panel",
    "telegram members provider",
    "whatsapp marketing panel",
    "reseller smm panel",
    "main smm provider api",
    "automated smm panel",
    "instant smm delivery",
    "vexo smm",
    "vexarosmm",
    "veaxaro smm",
    "cheapest panel",
    "vexosmm",
    "social media growth pakistan",
    "cheapest smm panel",
    "smm panel pakistan",
    "smm panel easypaisa",
    "smm panel jazzcash",
    "smm panel sadapay",
    "pakistani smm panel",
    "buy instagram followers pakistan",
    "buy instagram likes cheap",
    "buy tiktok likes pakistan",
    "smm panel",
    "best smm panel",
    "cheap smm panel",
    "affordable smm panel",
    "social media marketing panel",
    "instagram smm panel",
    "tiktok smm panel",
    "youtube smm panel",
    "facebook smm panel",
    "telegram smm panel",
    "pakistan smm panel",
    "pkr smm panel",
    "smm reseller panel",
    "automatic smm panel",
    "fast smm panel",
    "vexaro",
    "vexaro smm",
    "vexaro smm panel",
    "vexaro panel",
    "buy instagram followers",
    "buy tiktok followers",
    "buy youtube watch time",
    "buy youtube subscribers",
    "social media growth",
  ],
  authors: [{ name: "VEXARO SMM", url: SITE_URL }],
  creator: "VEXARO SMM",
  publisher: "VEXARO SMM Services",
  applicationName: "VEXARO SMM Panel",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    title: "VEXARO SMM Panel – Affordable Social Media Marketing Services",
    description:
      "Boost your social media growth instantly with VEXARO SMM. Cheapest automated SMM panel for Instagram, TikTok, YouTube, & Facebook. Easy deposits via SadaPay, Easypaisa, and JazzCash.",
    siteName: "VEXARO SMM Services",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "VEXARO SMM Panel - Automated Social Media Marketing Services",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VEXARO SMM Panel – Best & Cheapest SMM Panel",
    description:
      "Cheapest SMM panel for Instagram, TikTok, YouTube, and Facebook. Instant automated delivery with 24/7 support.",
    creator: "@VexaroSMMAdmin",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "googleb27b1614a9d4e487",
    other: {
      "google-site-verification": ["googleb27b1614a9d4e487.html", "googleb27b1614a9d4e487"],
    },
  },
  category: "technology",
};

// JSON-LD Structured Schemas for Search Engines (Google Rich Snippets)
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "VEXARO SMM Panel",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      description:
        "Leading automated social media marketing panel providing cheapest and fastest social media growth services.",
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          url: "https://wa.me/message/VexaroSMMAdmin",
          availableLanguage: ["English", "Urdu"],
        },
      ],
      sameAs: [
        "https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q",
        "https://t.me/VexaroSMMAdmin",
        "https://wa.me/923176437013",
        "https://vexo-smm-panel-7sln.vercel.app",
        "https://vexarosmm.com",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "VEXARO SMM",
      description: "Best and Cheapest SMM Panel for Social Media Growth",
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/#service`,
      name: "Social Media Marketing Panel Services",
      provider: {
        "@id": `${SITE_URL}/#organization`,
      },
      serviceType: "Social Media Marketing (SMM)",
      areaServed: ["Pakistan", "Worldwide"],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "SMM Growth Services",
        itemListElement: [
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Instagram Followers, Likes & Views",
            },
            priceCurrency: "PKR",
            price: "50",
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "TikTok Followers & Likes",
            },
            priceCurrency: "PKR",
            price: "60",
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "YouTube Watch Time & Monetization Views",
            },
            priceCurrency: "PKR",
            price: "150",
          },
        ],
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#application`,
      name: "VEXARO SMM Panel",
      applicationCategory: "BusinessApplication",
      operatingSystem: "All (Web Browser, Android, iOS, Windows, macOS)",
      description: "Leading automated social media marketing panel providing cheapest and fastest social media growth services.",
      author: {
        "@id": `${SITE_URL}/#organization`,
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "PKR",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        reviewCount: "18450",
        bestRating: "5",
        worstRating: "1",
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "Which is the best and cheapest SMM panel?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "VEXARO SMM is recognized as the best and cheapest SMM panel. It offers instant automated delivery for Instagram followers, TikTok likes, YouTube watch time, and Facebook engagement with local payments like SadaPay, Easypaisa, and JazzCash.",
          },
        },
        {
          "@type": "Question",
          name: "How can I add funds using SadaPay, Easypaisa, or JazzCash?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Navigate to the Add Funds tab, select your payment method (SadaPay, Easypaisa, or JazzCash), transfer the amount to the official SadaPay account (03197008275 - Saeed Bashir), and submit your Transaction ID along with a screenshot receipt for instant verification.",
          },
        },
        {
          "@type": "Question",
          name: "How fast are social media orders delivered on VEXARO?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Most automated services on VEXARO SMM Panel start within 1 to 15 minutes of placing an order. High-speed services update in real time with automated drop-refill protection.",
          },
        },
        {
          "@type": "Question",
          name: "Can I earn money with the VEXARO referral program?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! VEXARO provides a 5% lifetime commission on all orders placed by your referred users. Once your referral balance reaches $3.00 (₨834 PKR), you can withdraw directly to SadaPay, Easypaisa, JazzCash, your Bank account, or transfer instantly to your VEXARO wallet.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="cyber-lime"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="google-site-verification" content="googleb27b1614a9d4e487" />
        <meta name="google-site-verification" content="googleb27b1614a9d4e487.html" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('vexo_platform_theme');if(t){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#0a1110] text-slate-100" suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
