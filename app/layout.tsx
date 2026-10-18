import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { GlobalSupportWidget } from "@/components/global-support-widget";
import { MaintenanceScreen } from "@/components/maintenance-screen";
import { getRequestUser } from "@/lib/request-user";
import "./globals.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vexarosmm.com";

export const viewport: Viewport = {
  themeColor: "#07100f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

import { getAllPlatformSettings, DEFAULT_PLATFORM_SETTINGS } from "@/lib/admin";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAllPlatformSettings().catch(() => DEFAULT_PLATFORM_SETTINGS);
  const siteUrl = settings.seo_site_url || SITE_URL;
  const title = settings.seo_meta_title || "VEXARO SMM Panel – Cheapest SMM Services in Pakistan";
  const desc =
    settings.seo_meta_description ||
    "VEXARO SMM is an affordable SMM panel in Pakistan. Buy Instagram followers, TikTok likes, YouTube watch time & views, Facebook followers and Telegram members. Pay with JazzCash, Easypaisa, SadaPay or crypto. Instant delivery + Free TikTok/Instagram views & likes test trial.";

  const rawKeywords = settings.seo_meta_keywords || "";
  const keywords = rawKeywords
    ? rawKeywords.split(",").map((k) => k.trim()).filter(Boolean)
    : [
        "vexarosmm",
        "vexarosmm.com",
        "vexaro smm",
        "vexaro smm panel",
        "vexaro panel",
        "smm panel pakistan",
        "cheapest smm panel",
        "best smm panel pakistan",
        "smm panel easypaisa",
        "smm panel jazzcash",
        "smm panel sadapay",
        "smm panel binance pay",
        "smm panel usdt",
        "crypto smm panel",
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
        "pakistani smm panel",
        "buy instagram followers pakistan",
        "buy instagram likes cheap",
        "buy tiktok likes pakistan",
        "buy tiktok followers cheap",
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
        "automatic smm panel",
        "fast smm panel",
        "buy instagram followers",
        "buy tiktok followers",
        "buy youtube watch time",
        "buy youtube subscribers",
        "social media growth",
        "social media growth pakistan",
      ];

  const ogTitle = settings.seo_og_title || title;
  const ogDesc = settings.seo_og_description || desc;
  const ogImage = settings.seo_og_image || "/og-image.png";
  const twitterTitle = settings.seo_twitter_title || title;
  const twitterDesc = settings.seo_twitter_description || desc;
  const twitterHandle = settings.seo_twitter_handle || "@VexaroSMMAdmin";
  const twitterCard = (settings.seo_twitter_card === "summary" ? "summary" : "summary_large_image") as "summary" | "summary_large_image";
  const robotsIndex = settings.seo_robots_index !== "false";
  const robotsFollow = settings.seo_robots_follow !== "false";
  const googleVerification = settings.seo_google_site_verification || "googleb27b1614a9d4e487";
  const bingVerification = settings.seo_bing_site_verification;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: "%s | VEXARO",
    },
    description: desc,
    keywords,
    authors: [{ name: "VEXARO SMM", url: siteUrl }],
    creator: "VEXARO SMM",
    publisher: "VEXARO SMM Services",
    applicationName: "VEXARO SMM Panel",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: {
      canonical: siteUrl,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: siteUrl,
      title: ogTitle,
      description: ogDesc,
      siteName: "VEXARO SMM Services",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${title} - Social Media Growth`,
        },
      ],
    },
    twitter: {
      card: twitterCard,
      title: twitterTitle,
      description: twitterDesc,
      creator: twitterHandle,
      images: [ogImage],
    },
    robots: {
      index: robotsIndex,
      follow: robotsFollow,
      googleBot: {
        index: robotsIndex,
        follow: robotsFollow,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification: {
      google: googleVerification,
      other: {
        "google-site-verification": [googleVerification, `${googleVerification}.html`],
        ...(bingVerification ? { "msvalidate.01": [bingVerification] } : {}),
      },
    },
    icons: {
      icon: [
        { url: "/logo.png", type: "image/png" },
        { url: "/icon.png", type: "image/png" },
      ],
      apple: [{ url: "/logo.png" }],
      shortcut: ["/logo.png"],
    },
    category: "technology",
  };
}


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
      slogan: "Cheapest & Highest-Rated Wholesale SMM Panel in Pakistan & Worldwide",
      currenciesAccepted: "PKR, USD, USDT",
      paymentAccepted: "SadaPay, Easypaisa, JazzCash, Binance Pay, USDT",
      knowsAbout: [
        "Social Media Marketing",
        "SMM Panel Pakistan",
        "Instagram Followers & Engagement",
        "TikTok FYP Views & Likes",
        "YouTube 4000 Hours Watch Time Monetization",
        "Facebook Followers & Likes",
        "Telegram Channel Members",
        "SadaPay SMM Deposit",
        "Easypaisa SMM Deposit",
        "JazzCash SMM Deposit",
        "Binance Pay USDT SMM",
        "SMM Reseller API",
      ],
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
        "https://wa.me/923088180234",
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
            text: "VEXARO SMM is an affordable SMM panel in Pakistan with instant automated delivery for Instagram followers, TikTok likes, YouTube watch time, and Facebook engagement, with local payments like SadaPay, Easypaisa, and JazzCash.",
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getAllPlatformSettings().catch(() => DEFAULT_PLATFORM_SETTINGS);
  const gaId = settings.seo_google_analytics_id || "G-34H7D6YB4D";
  const gtmId = settings.seo_google_tag_manager_id;
  const metaPixelId = settings.seo_meta_pixel_id;
  const tiktokPixelId = settings.seo_tiktok_pixel_id;
  const customHead = settings.seo_custom_head_scripts || "";
  const customBody = settings.seo_custom_body_scripts || "";
  const googleVerification = settings.seo_google_site_verification || "googleb27b1614a9d4e487";
  const defaultTheme = settings.platform_theme === "light" ? "light" : "dark";
  const noticeEnabled = settings.site_notice_enabled === "true";
  const noticeText = settings.site_notice_text;
  const isMaintenance = settings.site_maintenance_mode === "true";
  const maintenanceMsg = settings.site_maintenance_message;

  // Resolve request pathname and user role for maintenance mode logic
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";
  const user = await getRequestUser().catch(() => null);
  const isAdmin = Boolean(user && (user.is_admin || user.is_super_admin));
  const isStaffRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/admin");

  // Determine whether to display the full maintenance screen
  const showMaintenanceScreen = isMaintenance && !isAdmin && !isStaffRoute;

  return (
    <html
      lang="en"
      data-theme={defaultTheme}
      className={`${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Google Analytics 4 (GA4) */}
        {gaId && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');`,
              }}
            />
          </>
        )}
        {/* Google Tag Manager (GTM) Container */}
        {gtmId && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`,
            }}
          />
        )}
        {/* Meta / Facebook Pixel Container */}
        {metaPixelId && (
          <>
            <script
              dangerouslySetInnerHTML={{
                __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${metaPixelId}');
fbq('track', 'PageView');`,
              }}
            />
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}
        {/* TikTok Pixel Container */}
        {tiktokPixelId && (
          <script
            dangerouslySetInnerHTML={{
              __html: `!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var tt=w[t]=w[t]||[];tt.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],tt.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<tt.methods.length;i++)tt.setAndDefer(tt,tt.methods[i]);tt.instance=function(t){for(var e=tt._i[t]||[],n=0;n<tt.methods.length;n++)tt.setAndDefer(e,tt.methods[n]);return e},tt.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";tt._i=tt._i||{},tt._i[e]=[],tt._i[e]._u=i,tt._t=tt._t||{},tt._t[e]=+new Date,tt._o=tt._o||{},tt._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  tt.load('${tiktokPixelId}');
  tt.page();
}(window, document, 'ttq');`,
            }}
          />
        )}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap"
        />
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        {googleVerification && (
          <>
            <meta name="google-site-verification" content={googleVerification} />
            <meta name="google-site-verification" content={`${googleVerification}.html`} />
          </>
        )}
        {customHead && (
          <script
            id="vexo-custom-head-injection"
            dangerouslySetInnerHTML={{ __html: customHead }}
          />
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('vexo_platform_theme');if(t==='midnight'||t==='purple'||(t&&t!=='dark'&&t!=='light')){t='dark';localStorage.setItem('vexo_platform_theme','dark');}if(t){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${plusJakartaSans.className} min-h-full flex flex-col bg-[#07100f] text-slate-100 font-sans`} suppressHydrationWarning>
        {showMaintenanceScreen ? (
          <MaintenanceScreen
            message={maintenanceMsg}
            whatsappNumber={settings.support_whatsapp_number}
            telegramUsername={settings.support_telegram_username}
            supportEmail={settings.support_email}
          />
        ) : (
          <>
            {/* Maintenance Mode: Admin Preview Banner */}
            {isMaintenance && isAdmin && (
              <aside aria-label="Admin Maintenance Preview" className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/40 bg-amber-500/20 px-4 py-2 text-center text-xs font-black text-amber-200 backdrop-blur-md">
                <div className="flex items-center gap-2 mx-auto">
                  <span>⚠️</span>
                  <span>MAINTENANCE MODE ACTIVE (ADMIN PREVIEW MODE) — Public visitors see the full-screen Maintenance screen.</span>
                </div>
                <a
                  href="/admin?tab=Settings"
                  className="rounded-lg bg-amber-400 px-2.5 py-1 text-[11px] font-black text-[#07100f] hover:bg-amber-300 ml-auto"
                >
                  Turn Off in Settings
                </a>
              </aside>
            )}

            {/* Broadcast Announcement Banner */}
            {!isMaintenance && noticeEnabled && noticeText && (
              <aside
                aria-label="Special Announcement"
                className={`relative z-50 flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-black shadow-md transition-all ${
                  settings.site_notice_type === "event"
                    ? "bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 text-white shadow-purple-500/30"
                    : "bg-gradient-to-r from-emerald-600 via-[#baff00] to-emerald-500 text-[#07100f]"
                }`}
              >
                {settings.site_notice_type === "event" ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] uppercase tracking-wider backdrop-blur-sm text-pink-200 border border-white/20">
                      <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
                      LIVE EVENT
                    </span>
                    <span>{noticeText}</span>
                    <a
                      href="/live-event"
                      className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-0.5 text-[11px] font-black text-purple-950 shadow hover:bg-slate-100 transition ml-1"
                    >
                      <span>Claim Free ₨50</span>
                      <span>→</span>
                    </a>
                  </div>
                ) : (
                  <>
                    <span>📢</span>
                    <span>{noticeText}</span>
                  </>
                )}
              </aside>
            )}

            {children}
            {customBody && (
              <div
                id="vexo-custom-body-injection"
                dangerouslySetInnerHTML={{ __html: customBody }}
              />
            )}
            <GlobalSupportWidget />
          </>
        )}
        <Analytics />
      </body>
    </html>
  );
}
