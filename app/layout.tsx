import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vexosmm.com";

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
    default: "VEXO SMM | #1 Best & Cheapest SMM Panel in Pakistan (SadaPay, Easypaisa, JazzCash)",
    template: "%s | VEXO SMM Panel",
  },
  description:
    "VEXO is the #1 cheapest, fastest, and most reliable automated SMM panel in Pakistan and worldwide. Buy Instagram followers, TikTok likes, YouTube watch time & subscribers, Facebook page growth, and WhatsApp marketing. Instant delivery, 0% deposit fee with SadaPay, Easypaisa, and JazzCash. 24/7 dedicated support and v2 reseller API.",
  keywords: [
    "smm panel",
    "best smm panel",
    "cheapest smm panel",
    "smm panel pakistan",
    "smm panel easypaisa",
    "smm panel jazzcash",
    "smm panel sadapay",
    "pakistani smm panel",
    "buy instagram followers pakistan",
    "buy instagram likes cheap",
    "buy tiktok likes pakistan",
    "buy tiktok followers",
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
    "vexosmm",
    "social media growth pakistan",
  ],
  authors: [{ name: "VEXO SMM", url: SITE_URL }],
  creator: "VEXO SMM",
  publisher: "VEXO SMM Services",
  applicationName: "VEXO SMM Panel",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    title: "VEXO SMM | #1 Best & Cheapest SMM Panel in Pakistan",
    description:
      "Boost your social media growth instantly with VEXO. Cheapest automated SMM panel for Instagram, TikTok, YouTube, & Facebook. Easy deposits via SadaPay, Easypaisa, and JazzCash.",
    siteName: "VEXO SMM Services",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "VEXO SMM Panel - Automated Social Media Growth",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VEXO SMM | Best & Cheapest SMM Panel in Pakistan",
    description:
      "Cheapest SMM panel in Pakistan for Instagram, TikTok, YouTube, and Facebook. Instant automated delivery with SadaPay, Easypaisa, and JazzCash payments.",
    creator: "@VexoSMMAdmin",
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
  category: "technology",
};

// JSON-LD Structured Schemas for Search Engines (Google Rich Snippets)
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "VEXO SMM Panel",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      description:
        "Leading Pakistani automated social media marketing panel providing cheapest and fastest social media growth services.",
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          url: "https://wa.me/message/VexoSMMAdmin",
          availableLanguage: ["English", "Urdu"],
        },
      ],
      sameAs: [
        "https://t.me/VexoSMMAdmin",
        "https://wa.me/message/VexoSMMAdmin",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "VEXO SMM",
      description: "Best and Cheapest SMM Panel in Pakistan",
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
          name: "Which is the best and cheapest SMM panel in Pakistan?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "VEXO SMM is recognized as the best and cheapest SMM panel in Pakistan. It offers instant automated delivery for Instagram followers, TikTok likes, YouTube watch time, and Facebook engagement with local payments like SadaPay, Easypaisa, and JazzCash.",
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
          name: "How fast are social media orders delivered on VEXO?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Most automated services on VEXO start within 1 to 15 minutes of placing an order. High-speed services update in real time with automated drop-refill protection.",
          },
        },
        {
          "@type": "Question",
          name: "Can I earn money with the VEXO referral program?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! VEXO provides a 5% lifetime commission on all orders placed by your referred users. Once your referral balance reaches $3.00 (₨834 PKR), you can withdraw directly to SadaPay, Easypaisa, JazzCash, your Bank account, or transfer instantly to your VEXO wallet.",
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
      <body className="min-h-full flex flex-col bg-[#0a1110] text-slate-100">
        {children}
      </body>
    </html>
  );
}
