import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getRequestUser } from "@/lib/request-user";
import { getUserWallet } from "@/lib/wallet";
import {
  getGGSomaConfig,
  getGGSomaProducts,
  getGGSomaBalance,
  createGGSomaOrder,
  type GGSomaProduct,
} from "@/lib/ggsoma-api";

export const dynamic = "force-dynamic";

export interface ToolPlan {
  duration: string;
  durationDays: number;
  pricePkr: number;
  priceUsd: number;
  popular?: boolean;
  stockCount?: number;
  inStock?: boolean;
}

export interface ToolProduct {
  id: string;
  name: string;
  category: "ai" | "seo" | "smm_bots" | "streaming";
  categoryLabel: string;
  icon: string;
  badge?: string;
  shortDesc: string;
  features: string[];
  plans: ToolPlan[];
  deliveryType?: "LINK" | "COUPON" | "READY_ACCOUNT" | "LICENSE_KEY";
  productSlug?: string;
  isPartnerBot?: boolean;
}

const TOOLS_CATALOG: ToolProduct[] = [
  // AI & Content
  {
    id: "chatgpt_plus",
    name: "ChatGPT Plus (GPT-4o & Canvas)",
    category: "ai",
    categoryLabel: "AI & Content",
    icon: "spark",
    badge: "Most Popular",
    shortDesc: "Official OpenAI subscription. Full access to GPT-4o, DALL-E 3, Canvas, Code Interpreter & Custom GPTs.",
    features: [
      "Access to GPT-4o & o1 Reasoning Models",
      "DALL-E 3 High-Res Image Generation",
      "File uploads & Advanced Data Analysis",
      "Official account activation with guaranteed uptime"
    ],
    plans: [
      { duration: "1 Month", durationDays: 30, pricePkr: 6000, priceUsd: 21.60, popular: true },
      { duration: "3 Months", durationDays: 90, pricePkr: 17850, priceUsd: 64.20 },
    ]
  },
  {
    id: "canva_pro",
    name: "Canva Pro (Brand Kit & Magic Studio)",
    category: "ai",
    categoryLabel: "AI & Content",
    icon: "spark",
    badge: "Best Value",
    shortDesc: "Unlock 100M+ premium graphics, background remover, brand kits & AI Magic Studio.",
    features: [
      "Private access on your personal email",
      "1-Click Background Remover & Magic Studio AI",
      "100M+ Premium Stock Photos, Audio & Video",
      "Unlimited Brand Kits & Cloud Storage"
    ],
    plans: [
      { duration: "1 Month", durationDays: 30, pricePkr: 3890, priceUsd: 14.00 },
      { duration: "1 Year Access", durationDays: 365, pricePkr: 36000, priceUsd: 129.50, popular: true },
      { duration: "Lifetime Access", durationDays: 3650, pricePkr: 44500, priceUsd: 160.00 },
    ]
  },
  {
    id: "capcut_pro",
    name: "CapCut Pro (PC & Mobile AI)",
    category: "ai",
    categoryLabel: "AI & Content",
    icon: "rocket",
    badge: "Hot",
    shortDesc: "Pro video editing with AI auto-captions, 4K 60fps export, color match & optical flow.",
    features: [
      "Auto-captions & bilingual subtitle generator",
      "Pro transitions, effects, stickers & music",
      "Smooth slow-motion & optical flow blur",
      "Full private account login"
    ],
    plans: [
      { duration: "1 Month", durationDays: 30, pricePkr: 3000, priceUsd: 10.80, popular: true },
      { duration: "6 Months", durationDays: 180, pricePkr: 13400, priceUsd: 48.20 },
      { duration: "1 Year", durationDays: 365, pricePkr: 22500, priceUsd: 81.00 },
    ]
  },
  {
    id: "gemini_pro",
    name: "Google Gemini Advanced & One AI",
    category: "ai",
    categoryLabel: "AI & Content",
    icon: "spark",
    badge: "Google AI",
    shortDesc: "Google's 1.5 Pro AI with 1M+ token context window, deep reasoning & Python code execution.",
    features: [
      "Ultra-long 1M token context processing",
      "Activated on your personal Google Account",
      "Includes 2TB Google One cloud storage",
      "Integration with Google Docs & Gmail"
    ],
    plans: [
      { duration: "1 Month", durationDays: 30, pricePkr: 6000, priceUsd: 21.60, popular: true },
      { duration: "3 Months", durationDays: 90, pricePkr: 17850, priceUsd: 64.20 },
    ]
  },
  {
    id: "quillbot_grammarly",
    name: "QuillBot & Grammarly Premium",
    category: "ai",
    categoryLabel: "AI & Content",
    icon: "spark",
    badge: "Student & Writer",
    shortDesc: "Advanced AI paraphraser, tone adjuster, and complete grammar & plagiarism checker.",
    features: [
      "Unlimited word count paraphrasing (All modes)",
      "Grammarly advanced clarity & vocabulary suggestions",
      "100% plagiarism detection reports",
      "Guaranteed replacement warranty"
    ],
    plans: [
      { duration: "1 Month", durationDays: 30, pricePkr: 7500, priceUsd: 27.00, popular: true },
      { duration: "1 Year", durationDays: 365, pricePkr: 29740, priceUsd: 107.00 },
    ]
  },
  {
    id: "midjourney_pro",
    name: "Midjourney AI (Standard & Pro)",
    category: "ai",
    categoryLabel: "AI & Content",
    icon: "spark",
    shortDesc: "World's most realistic AI image generator with Fast GPU hours and commercial rights.",
    features: [
      "Fast Mode GPU generation",
      "General Commercial terms included",
      "Photorealistic v6.1 generation quality",
      "Access to member gallery and web generator"
    ],
    plans: [
      { duration: "Standard (1 Month)", durationDays: 30, pricePkr: 9000, priceUsd: 32.40 },
      { duration: "Pro Plan (1 Month)", durationDays: 30, pricePkr: 18000, priceUsd: 64.80, popular: true },
    ]
  },

  // SEO & Marketing
  {
    id: "semrush_guru",
    name: "Semrush SEO Suite (Pro & Guru)",
    category: "seo",
    categoryLabel: "SEO & Marketing",
    icon: "layers",
    badge: "Agency Favorite",
    shortDesc: "Top-tier SEO suite for keyword research, backlink audits, rank tracking & competitor traffic.",
    features: [
      "Keyword Magic Tool (Billions of keywords)",
      "Domain Competitor Organic Traffic analysis",
      "Backlink Audit & Toxic Link analysis",
      "Position tracking & site audit reports"
    ],
    plans: [
      { duration: "Pro Plan (1 Month)", durationDays: 30, pricePkr: 41630, priceUsd: 149.75, popular: true },
      { duration: "Guru Plan (1 Month)", durationDays: 30, pricePkr: 74350, priceUsd: 267.45 },
    ]
  },
  {
    id: "envato_elements",
    name: "Envato Elements Unlimited",
    category: "seo",
    categoryLabel: "SEO & Marketing",
    icon: "star",
    badge: "Unlimited",
    shortDesc: "Unlimited downloads of WordPress themes, plugins, graphic templates, stock video & music.",
    features: [
      "Unlimited daily downloads",
      "WordPress Themes, Plugins & Elementor Kits",
      "Stock video, motion graphics & audio tracks",
      "Commercial lifetime license per asset"
    ],
    plans: [
      { duration: "1 Month Access", durationDays: 30, pricePkr: 9900, priceUsd: 35.60, popular: true },
      { duration: "1 Year Unlimited", durationDays: 365, pricePkr: 58930, priceUsd: 212.00 },
    ]
  },
  {
    id: "freepik_premium",
    name: "Freepik Premium & Flaticon",
    category: "seo",
    categoryLabel: "SEO & Marketing",
    icon: "star",
    shortDesc: "Millions of premium vectors, PSD files, mockups, and AI image generator credits.",
    features: [
      "Unlimited daily downloads allowance",
      "Full access to premium vectors & PSD mockups",
      "Commercial license with copyright guarantee",
      "Access to Flaticon premium SVG icons"
    ],
    plans: [
      { duration: "1 Month", durationDays: 30, pricePkr: 4500, priceUsd: 16.20, popular: true },
      { duration: "1 Year", durationDays: 365, pricePkr: 42800, priceUsd: 154.00 },
    ]
  },
  {
    id: "tradingview_premium",
    name: "TradingView (Plus & Premium)",
    category: "seo",
    categoryLabel: "SEO & Marketing",
    icon: "rocket",
    shortDesc: "Professional financial charting with 25 indicators per chart and second-based intervals.",
    features: [
      "25 indicators per chart & 8 charts in 1 tab",
      "400 server-side price & technical alerts",
      "Volume Profile & Custom tick charts",
      "Seconds-based bar intervals"
    ],
    plans: [
      { duration: "Plus (1 Month)", durationDays: 30, pricePkr: 8990, priceUsd: 32.35 },
      { duration: "Premium (1 Month)", durationDays: 30, pricePkr: 17830, priceUsd: 64.15, popular: true },
    ]
  },
  {
    id: "adobe_cc",
    name: "Adobe Creative Cloud (20+ Apps)",
    category: "seo",
    categoryLabel: "SEO & Marketing",
    icon: "layers",
    badge: "Official License",
    shortDesc: "Photoshop, Illustrator, Premiere Pro, After Effects, and 100GB Adobe Cloud storage.",
    features: [
      "All 20+ desktop creative apps included",
      "Activated directly on your personal Adobe ID",
      "Full cloud libraries & Generative Fill enabled",
      "100% genuine guaranteed official license"
    ],
    plans: [
      { duration: "1 Month", durationDays: 30, pricePkr: 18015, priceUsd: 64.80, popular: true },
      { duration: "1 Year", durationDays: 365, pricePkr: 196260, priceUsd: 706.00 },
    ]
  },

  // SMM & Automation Software
  {
    id: "wa_bulk_sender",
    name: "WhatsApp Bulk Marketing Sender Pro",
    category: "smm_bots",
    categoryLabel: "SMM & Bots",
    icon: "whatsapp",
    badge: "Software Tool",
    shortDesc: "Send bulk WhatsApp messages to numbers with anti-ban delay & attachment support.",
    features: [
      "Send personalized messages with attachments (PDF, Image, Video)",
      "Smart random delay & anti-ban protection",
      "Extract contacts from WhatsApp Groups in 1 click",
      "Windows software with permanent license key"
    ],
    plans: [
      { duration: "1 Month License", durationDays: 30, pricePkr: 7500, priceUsd: 27.00 },
      { duration: "Lifetime License", durationDays: 3650, pricePkr: 14700, priceUsd: 52.90, popular: true },
    ]
  },
  {
    id: "tg_group_scraper",
    name: "Telegram Member Scraper & Adder Bot",
    category: "smm_bots",
    categoryLabel: "SMM & Bots",
    icon: "telegram",
    badge: "Automation",
    shortDesc: "Scrape active members from competitor Telegram groups and add them to yours.",
    features: [
      "Scrapes active (recently online) users only",
      "Multi-account session rotation to prevent bans",
      "Automated member addition to your group",
      "Full software + setup guide included"
    ],
    plans: [
      { duration: "Lifetime License", durationDays: 3650, pricePkr: 10500, priceUsd: 37.80, popular: true },
    ]
  },
  {
    id: "tiktok_fresh_account",
    name: "TikTok Creator Rewards Fresh Account",
    category: "smm_bots",
    categoryLabel: "SMM & Bots",
    icon: "rocket",
    badge: "Monetization Ready",
    shortDesc: "100% genuine UK / USA TikTok account eligible for monetization and Creator Rewards.",
    features: [
      "Created natively in UK / USA without VPN",
      "Eligible for Creator Rewards & Beta Program",
      "Full email credentials provided",
      "Lifetime permanent ownership"
    ],
    plans: [
      { duration: "UK/USA Native Account", durationDays: 3650, pricePkr: 3000, priceUsd: 10.80, popular: true },
      { duration: "Agency Ads Account", durationDays: 3650, pricePkr: 7500, priceUsd: 27.00 },
    ]
  },
  {
    id: "auto_engagement_bot",
    name: "Instagram Auto-Engagement Monthly Bot",
    category: "smm_bots",
    categoryLabel: "SMM & Bots",
    icon: "instagram",
    badge: "Monthly Package",
    shortDesc: "Automatically detects new Instagram posts/reels and sends real likes and impressions.",
    features: [
      "Covers up to 30 new posts / reels per month",
      "Starts within 5 minutes of publishing",
      "Mix of high-quality likes and impressions",
      "Zero password required (just username)"
    ],
    plans: [
      { duration: "1 Month (30 Posts)", durationDays: 30, pricePkr: 6000, priceUsd: 21.60, popular: true },
    ]
  },

  // Streaming & Entertainment
  {
    id: "netflix_uhd",
    name: "Netflix UHD 4K (Ultra HD Premium)",
    category: "streaming",
    categoryLabel: "Streaming",
    icon: "rocket",
    badge: "4K UHD",
    shortDesc: "Official Netflix Premium Ultra HD subscription with 4K HDR and spatial audio.",
    features: [
      "Ultra HD 4K + HDR Streaming & Dolby Atmos",
      "Private pin-locked profile or full account",
      "Works on TV, Mobile, Laptop & Tablet",
      "Full replacement warranty for entire duration"
    ],
    plans: [
      { duration: "1 Month (1-Screen Profile)", durationDays: 30, pricePkr: 1500, priceUsd: 5.40 },
      { duration: "1 Month (Full 4K Account)", durationDays: 30, pricePkr: 6895, priceUsd: 24.80, popular: true },
      { duration: "3 Months (Full 4K Account)", durationDays: 90, pricePkr: 20515, priceUsd: 73.80 },
    ]
  },
  {
    id: "prime_video",
    name: "Amazon Prime Video HD / 4K",
    category: "streaming",
    categoryLabel: "Streaming",
    icon: "rocket",
    badge: "High Res",
    shortDesc: "Watch movies, series and award-winning Amazon Originals in Full HD / 4K.",
    features: [
      "Full HD 1080p / 4K streaming quality",
      "Works on Smart TVs, Android, iOS and Web",
      "Stable account with zero interruption",
      "Official warranty for full duration"
    ],
    plans: [
      { duration: "1 Month", durationDays: 30, pricePkr: 2695, priceUsd: 9.70, popular: true },
      { duration: "1 Year", durationDays: 365, pricePkr: 29460, priceUsd: 106.00 },
    ]
  },
  {
    id: "youtube_premium",
    name: "YouTube Premium & Music",
    category: "streaming",
    categoryLabel: "Streaming",
    icon: "youtube",
    badge: "Ad-Free",
    shortDesc: "Ad-free video playback, background audio & full YouTube Music Premium.",
    features: [
      "Zero video ads across all devices",
      "Background play while using other apps",
      "YouTube Music Premium app included",
      "Invited directly to your personal Gmail account"
    ],
    plans: [
      { duration: "Individual (1 Month)", durationDays: 30, pricePkr: 4200, priceUsd: 15.10, popular: true },
      { duration: "Family Plan (1 Month)", durationDays: 30, pricePkr: 6895, priceUsd: 24.80 },
      { duration: "Individual (1 Year)", durationDays: 365, pricePkr: 41640, priceUsd: 149.80 },
    ]
  },
  {
    id: "spotify_premium",
    name: "Spotify Premium (Individual)",
    category: "streaming",
    categoryLabel: "Streaming",
    icon: "spark",
    shortDesc: "Ad-free music listening with offline downloads and highest quality 320kbps audio.",
    features: [
      "No advertisements ever",
      "Offline downloads & unlimited skips",
      "Very high 320kbps audio quality",
      "Activated on your personal Spotify account"
    ],
    plans: [
      { duration: "1 Month", durationDays: 30, pricePkr: 3600, priceUsd: 12.95, popular: true },
      { duration: "1 Year", durationDays: 365, pricePkr: 35580, priceUsd: 128.00 },
    ]
  },
  {
    id: "vpn_premium",
    name: "NordVPN & Surfshark VPN Premium",
    category: "streaming",
    categoryLabel: "Streaming",
    icon: "rocket",
    badge: "Ultra Fast",
    shortDesc: "Official top-tier high-speed VPN with servers in 100+ countries, zero logs & P2P.",
    features: [
      "Ultra-fast 10Gbps servers in 100+ countries",
      "Military-grade AES-256 encryption",
      "Unblocks all streaming services worldwide",
      "Official account with replacement guarantee"
    ],
    plans: [
      { duration: "1 Month Access", durationDays: 30, pricePkr: 3890, priceUsd: 14.00, popular: true },
      { duration: "1 Year Access", durationDays: 365, pricePkr: 17980, priceUsd: 64.70 },
    ]
  },
];

function inferCategory(prod: GGSomaProduct): { category: "ai" | "seo" | "smm_bots" | "streaming"; categoryLabel: string; icon: string } {
  const text = `${prod.name} ${prod.slug} ${prod.provider?.name || ""} ${prod.provider?.key || ""}`.toLowerCase();

  if (text.includes("chatgpt") || text.includes("gpt") || text.includes("gemini") || text.includes("canva") || text.includes("capcut") || text.includes("ai") || text.includes("midjourney") || text.includes("quillbot") || text.includes("grammarly")) {
    return { category: "ai", categoryLabel: "AI & Content", icon: "spark" };
  }
  if (text.includes("semrush") || text.includes("envato") || text.includes("freepik") || text.includes("tradingview") || text.includes("adobe") || text.includes("seo")) {
    return { category: "seo", categoryLabel: "SEO & Marketing", icon: "layers" };
  }
  if (text.includes("netflix") || text.includes("spotify") || text.includes("youtube") || text.includes("prime") || text.includes("vpn") || text.includes("nord") || text.includes("surfshark") || text.includes("disney")) {
    return { category: "streaming", categoryLabel: "Streaming & VPN", icon: "rocket" };
  }
  return { category: "smm_bots", categoryLabel: "SMM & Tools", icon: "star" };
}

async function ensureSubscriptionsSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS vexo_tool_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
      tool_id VARCHAR(100) NOT NULL,
      tool_name VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL,
      plan_duration VARCHAR(50) NOT NULL,
      price_pkr NUMERIC(14,2) NOT NULL,
      delivery_contact VARCHAR(255) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'Active',
      license_or_access TEXT NOT NULL,
      instructions TEXT NOT NULL,
      delivery_type VARCHAR(50) DEFAULT 'LICENSE_KEY',
      provider_order_code VARCHAR(100),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE vexo_tool_subscriptions ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(50) DEFAULT 'LICENSE_KEY';
    ALTER TABLE vexo_tool_subscriptions ADD COLUMN IF NOT EXISTS provider_order_code VARCHAR(100);

    CREATE INDEX IF NOT EXISTS vexo_tool_subs_user_idx ON vexo_tool_subscriptions(user_id, created_at DESC);
  `);
}

export async function GET() {
  try {
    await ensureSubscriptionsSchema();
    const user = await getRequestUser();
    const config = await getGGSomaConfig();

    let catalog: ToolProduct[] = [...TOOLS_CATALOG];
    let isLiveBot = false;
    let botBalance: string | null = null;

    if (config.apiKey) {
      try {
        const prodRes = await getGGSomaProducts();
        if (prodRes.ok && Array.isArray(prodRes.products) && prodRes.products.length > 0) {
          isLiveBot = true;
          const botCatalog: ToolProduct[] = prodRes.products.map((p) => {
            const cat = inferCategory(p);
            const markup = 1 + (config.markupPercent || 8) / 100;
            const priceUsd = Number((Number(p.yourPrice || 10) * markup).toFixed(2));
            const pricePkr = Math.round(priceUsd * 278);

            const inStock = Boolean(p.stock ? (p.stock.inStock && (p.stock.count == null || p.stock.count > 0)) : true);
            const stockCount = p.stock?.count != null ? Number(p.stock.count) : (inStock ? 1 : 0);
            const deliveryLabel = p.deliveryType === "LINK" ? "Activation Link" : p.deliveryType === "COUPON" ? "Coupon Code" : "Ready Account";

            const stockBadge = !inStock
              ? "Out of Stock"
              : (p.warranty?.enabled
                  ? `${p.warranty.days}d Warranty`
                  : stockCount > 0
                    ? `${stockCount} in Stock`
                    : "Instant");

            return {
              id: p.slug,
              productSlug: p.slug,
              name: p.name,
              category: cat.category,
              categoryLabel: cat.categoryLabel,
              icon: cat.icon,
              badge: stockBadge,
              shortDesc: p.description || `Instant ${deliveryLabel} delivery from bot inventory. Active duration: ${p.durationDays || 30} days.`,
              features: [
                `Delivery format: ${deliveryLabel}`,
                `Duration: ${p.durationDays || 30} Days`,
                p.warranty?.enabled ? `Warranty: ${p.warranty.days} Days Replacement` : "Instant Automated Delivery",
                p.stock ? (inStock ? `Stock Available: ${stockCount} in inventory` : "Currently Out of Stock (Auto-restocks when bot is replenished)") : "In Stock"
              ],
              deliveryType: p.deliveryType,
              isPartnerBot: true,
              plans: [
                {
                  duration: `${p.durationDays || 30} Days`,
                  durationDays: p.durationDays || 30,
                  pricePkr,
                  priceUsd,
                  popular: true,
                  stockCount,
                  inStock,
                },
              ],
            };
          });

          // Prepend live bot products, keeping standalone software tools
          const standaloneTools = TOOLS_CATALOG.filter(t => t.category === "smm_bots");
          catalog = [...botCatalog, ...standaloneTools];
        }

        const balRes = await getGGSomaBalance();
        if (balRes.ok && balRes.balance) botBalance = balRes.balance;
      } catch (err) {
        console.warn("GGSoma Bot catalog fetch warning, using fallback:", err);
      }
    }

    let userSubscriptions: Array<Record<string, unknown>> = [];
    if (user) {
      const res = await db.query(
        `SELECT id, tool_id, tool_name, category, plan_duration, price_pkr, delivery_contact, status, license_or_access, instructions, delivery_type, provider_order_code, expires_at, created_at
         FROM vexo_tool_subscriptions
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [user.id]
      );
      userSubscriptions = res.rows;
    }

    return NextResponse.json(
      {
        success: true,
        catalog,
        userSubscriptions,
        isLiveBot,
        botBalance,
        partnerBotActive: Boolean(config.apiKey),
        inStockCount: catalog.filter((t) =>
          t.plans.some((p) => p.inStock !== false && (p.stockCount === undefined || p.stockCount > 0))
        ).length,
        outOfStockCount: catalog.filter((t) =>
          t.plans.every((p) => p.inStock === false || (p.stockCount !== undefined && p.stockCount <= 0))
        ).length,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
          "Surrogate-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("SUBSCRIPTIONS GET ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load subscriptions" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  }
}

export async function POST(req: Request) {
  try {
    await ensureSubscriptionsSchema();
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await req.json();
    const toolId = String(body.toolId || "").trim();
    const planDuration = String(body.planDuration || "").trim();
    const deliveryContact = String(body.deliveryContact || "").trim();

    if (!toolId) return NextResponse.json({ success: false, error: "Tool ID is required." }, { status: 400 });
    if (!planDuration) return NextResponse.json({ success: false, error: "Plan duration is required." }, { status: 400 });
    if (!deliveryContact || deliveryContact.length < 3) {
      return NextResponse.json({ success: false, error: "Email or WhatsApp number is required for delivery." }, { status: 400 });
    }

    const config = await getGGSomaConfig();

    // Check in live catalog or fallback catalog
    let catalogItem: ToolProduct | undefined;
    if (config.apiKey) {
      try {
        const prodRes = await getGGSomaProducts();
        if (prodRes.ok && Array.isArray(prodRes.products)) {
          const match = prodRes.products.find(p => p.slug === toolId || String(p.id) === toolId);
          if (match) {
            const cat = inferCategory(match);
            const markup = 1 + (config.markupPercent || 8) / 100;
            const priceUsd = Number((Number(match.yourPrice || 10) * markup).toFixed(2));
            const pricePkr = Math.round(priceUsd * 278);

            const matchInStock = Boolean(match.stock ? (match.stock.inStock && (match.stock.count == null || match.stock.count > 0)) : true);
            const matchCount = match.stock?.count != null ? Number(match.stock.count) : (matchInStock ? 1 : 0);

            catalogItem = {
              id: match.slug,
              productSlug: match.slug,
              name: match.name,
              category: cat.category,
              categoryLabel: cat.categoryLabel,
              icon: cat.icon,
              shortDesc: match.description || match.name,
              features: [
                `Delivery: ${match.deliveryType}`,
                `Duration: ${match.durationDays || 30} Days`,
              ],
              deliveryType: match.deliveryType,
              isPartnerBot: true,
              plans: [
                {
                  duration: `${match.durationDays || 30} Days`,
                  durationDays: match.durationDays || 30,
                  pricePkr,
                  priceUsd,
                  popular: true,
                  stockCount: matchCount,
                  inStock: matchInStock,
                },
              ],
            };
          }
        }
      } catch (err) {
        console.warn("Live bot product lookup warning:", err);
      }
    }

    if (!catalogItem) {
      catalogItem = TOOLS_CATALOG.find((t) => t.id === toolId);
    }

    if (!catalogItem) {
      return NextResponse.json({ success: false, error: "Selected tool was not found." }, { status: 404 });
    }

    const plan = catalogItem.plans.find((p) => p.duration === planDuration) || catalogItem.plans[0];
    if (!plan) {
      return NextResponse.json({ success: false, error: "Invalid plan duration." }, { status: 400 });
    }

    // Live stock verification check
    const isOutOfStock = plan.inStock === false || (plan.stockCount !== undefined && plan.stockCount <= 0);
    if (isOutOfStock) {
      return NextResponse.json({
        success: false,
        error: "This tool is currently out of stock in bot inventory. As soon as the bot is restocked, it will automatically become available for purchase.",
        outOfStock: true,
      }, { status: 409 });
    }

    // Check wallet balance
    const wallet = await getUserWallet(user.id);
    if (wallet.balancePkr < plan.pricePkr) {
      return NextResponse.json({
        success: false,
        error: `Insufficient wallet balance. This subscription costs ₨${plan.pricePkr.toLocaleString()}, but your balance is ₨${wallet.balancePkr.toLocaleString()}.`,
        balancePkr: wallet.balancePkr,
        requiredPkr: plan.pricePkr,
      }, { status: 402 });
    }

    let deliveryType = catalogItem.deliveryType || "LICENSE_KEY";
    let licenseKey = "";
    let instructions = "";
    let providerOrderCode: string | null = null;

    // Check if fulfillable via GGSoma Telegram Bot Partner API
    const isBotProduct = catalogItem.isPartnerBot || Boolean(catalogItem.productSlug) || (config.apiKey && !catalogItem.id.includes("wa_") && !catalogItem.id.includes("tg_"));

    if (config.apiKey && isBotProduct) {
      const externalOrderId = `VEXARO-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${Date.now().toString().slice(-6)}`;
      const targetSlug = catalogItem.productSlug || catalogItem.id;

      const botOrder = await createGGSomaOrder({
        productSlug: targetSlug,
        quantity: 1,
        externalOrderId,
      });

      if (!botOrder.ok) {
        const errorMsg = botOrder.error?.message || "Product is currently out of stock with upstream provider.";
        return NextResponse.json({
          success: false,
          error: `Provider Fulfillment Notice: ${errorMsg}. Your wallet balance was not charged.`,
          code: botOrder.error?.code || "FAILED",
        }, { status: 400 });
      }

      providerOrderCode = botOrder.orderCode || null;
      deliveryType = botOrder.deliveryType || "LINK";

      if (botOrder.deliveryType === "LINK") {
        licenseKey = botOrder.delivery?.link || botOrder.orderCode || "Activation Link Sent";
        instructions = botOrder.delivery?.instructions || `Open this activation link to complete setup: ${licenseKey}`;
      } else if (botOrder.deliveryType === "COUPON") {
        licenseKey = botOrder.delivery?.code || botOrder.orderCode || "Voucher Code";
        instructions = botOrder.delivery?.instructions || `Redeem this coupon code within the validity period: ${licenseKey}`;
      } else if (botOrder.deliveryType === "READY_ACCOUNT") {
        licenseKey = botOrder.delivery?.content || botOrder.orderCode || "Account Allocated";
        instructions = botOrder.delivery?.instructions || "Use the login credentials above to access your account.";
      } else {
        licenseKey = botOrder.orderCode || `VEXARO-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
        instructions = "Your subscription has been activated successfully via the partner network.";
      }
    } else {
      // Fallback license generation for standalone software/desktop tools
      const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
      licenseKey = `VEXARO-${catalogItem.id.slice(0, 4).toUpperCase()}-${randomHex}-${Date.now().toString().slice(-4)}`;
      instructions = "Your subscription has been activated successfully! Check your email / WhatsApp for credentials or use the license key below.";

      if (catalogItem.id === "canva_pro") {
        instructions = `An invitation link has been dispatched to ${deliveryContact}. Click the link to join the Canva Pro Team.`;
      } else if (catalogItem.id.includes("wa_") || catalogItem.id.includes("tg_")) {
        instructions = `Software download link: https://vexarosmm.com/downloads/${catalogItem.id}.zip — Use License Key: ${licenseKey} to activate.`;
      } else if (catalogItem.id.includes("chatgpt") || catalogItem.id.includes("netflix") || catalogItem.id.includes("capcut") || catalogItem.id.includes("prime")) {
        instructions = `Credentials and private profile access code have been allocated to ${deliveryContact}. Access Key: ${licenseKey}`;
      } else if (catalogItem.id === "gemini_pro" || catalogItem.id === "youtube_premium") {
        instructions = `Direct access and invite details dispatched to ${deliveryContact}. Access Key: ${licenseKey}`;
      } else if (catalogItem.id === "adobe_cc") {
        instructions = `Creative Cloud plan allocated to ${deliveryContact}. License Key: ${licenseKey}`;
      } else if (catalogItem.id.includes("vpn")) {
        instructions = `VPN configuration and dedicated login allocated to ${deliveryContact}. Activation Key: ${licenseKey}`;
      } else if (catalogItem.id.includes("tiktok")) {
        instructions = `Fresh TikTok account credentials securely dispatched to ${deliveryContact}. Order Key: ${licenseKey}`;
      }
    }

    const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);

    // Atomically debit wallet and insert subscription
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Deduct balance
      const updateBal = await client.query(
        `UPDATE vexo_wallets
         SET balance_pkr = balance_pkr - $1, updated_at = NOW()
         WHERE user_id = $2 AND balance_pkr >= $1
         RETURNING balance_pkr`,
        [plan.pricePkr, user.id]
      );

      if (updateBal.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: "Insufficient wallet balance." }, { status: 402 });
      }

      const newBalancePkr = Number(updateBal.rows[0].balance_pkr);

      // Record transaction
      await client.query(
        `INSERT INTO vexo_wallet_transactions (user_id, type, amount_pkr, reference_type, reference_id, description)
         VALUES ($1, 'Debit', $2, 'Subscription', $3, $4)`,
        [user.id, plan.pricePkr, licenseKey, `Subscription: ${catalogItem.name} (${plan.duration})`]
      );

      // Record subscription
      const subRes = await client.query(
        `INSERT INTO vexo_tool_subscriptions
         (user_id, tool_id, tool_name, category, plan_duration, price_pkr, delivery_contact, status, license_or_access, instructions, delivery_type, provider_order_code, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active', $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          user.id,
          catalogItem.id,
          catalogItem.name,
          catalogItem.category,
          plan.duration,
          plan.pricePkr,
          deliveryContact,
          licenseKey,
          instructions,
          deliveryType,
          providerOrderCode,
          expiresAt,
        ]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: `Successfully subscribed to ${catalogItem.name}!`,
        subscription: subRes.rows[0],
        balancePkr: newBalancePkr,
      });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("SUBSCRIPTION PURCHASE ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to process subscription" },
      { status: 500 }
    );
  }
}
