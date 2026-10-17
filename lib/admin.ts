import { db } from "@/lib/db";
import { ensureWalletSchema } from "@/lib/wallet";

let adminSchemaPromise: Promise<void> | null = null;

export function ensureAdminSchema() {
  if (!adminSchemaPromise) {
    adminSchemaPromise = (async () => {
      await ensureWalletSchema();
      await db.query(`
        CREATE TABLE IF NOT EXISTS vexo_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL,
          provider_order_id VARCHAR(120),
          service_id VARCHAR(120) NOT NULL,
          service_name TEXT,
          link TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          rate NUMERIC(14,6),
          charge_pkr NUMERIC(14,2),
          status VARCHAR(40) NOT NULL DEFAULT 'Pending',
          provider_response JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS vexo_orders_user_created_idx ON vexo_orders(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS vexo_orders_status_created_idx ON vexo_orders(status, created_at DESC);
        CREATE INDEX IF NOT EXISTS vexo_orders_provider_idx ON vexo_orders(provider_order_id);

        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS rate_pkr NUMERIC(14,6);
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS rate NUMERIC(14,6);
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120);
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS failure_reason TEXT;
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS provider_response JSONB;
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS start_count VARCHAR(50);
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS remains VARCHAR(50);

        CREATE TABLE IF NOT EXISTS vexo_service_overrides (
          service_id VARCHAR(120) PRIMARY KEY,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          popular BOOLEAN NOT NULL DEFAULT FALSE,
          rate_multiplier NUMERIC(12,6) NOT NULL DEFAULT 1,
          custom_description TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL
        );
        ALTER TABLE vexo_service_overrides ADD COLUMN IF NOT EXISTS custom_description TEXT;
        ALTER TABLE vexo_service_overrides ADD COLUMN IF NOT EXISTS custom_rate_pkr NUMERIC(20,6);
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS cost_pkr NUMERIC(14,2);
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(14,6);
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS custom_discount_percent NUMERIC(5,2) DEFAULT 0;
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS custom_rates JSONB DEFAULT '{}';

        CREATE TABLE IF NOT EXISTS vexo_blog_posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug VARCHAR(160) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          meta_title VARCHAR(255),
          meta_description TEXT,
          summary TEXT NOT NULL,
          category VARCHAR(80) NOT NULL DEFAULT 'Pakistan Guides',
          tags TEXT[] DEFAULT '{}',
          author_name VARCHAR(100) NOT NULL DEFAULT 'VEXARO Team',
          author_role VARCHAR(100) DEFAULT 'SMM Strategist',
          read_time VARCHAR(40) DEFAULT '5 min read',
          cover_icon VARCHAR(20) DEFAULT '🚀',
          published BOOLEAN NOT NULL DEFAULT TRUE,
          content_markdown TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS vexo_announcements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(160) NOT NULL,
          message TEXT NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS vexo_admin_activity (
          id BIGSERIAL PRIMARY KEY,
          admin_user_id INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL,
          action VARCHAR(80) NOT NULL,
          target_type VARCHAR(80),
          target_id VARCHAR(160),
          details JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS vexo_admin_activity_created_idx ON vexo_admin_activity(created_at DESC);

        CREATE TABLE IF NOT EXISTS vexo_platform_settings (
          key VARCHAR(100) PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL
        );
      `);
    })().catch((error) => {
      adminSchemaPromise = null;
      throw error;
    });
  }
  return adminSchemaPromise;
}

export async function getPlatformSetting(key: string, defaultValue: string = ""): Promise<string> {
  await ensureAdminSchema();
  try {
    const res = await db.query(`SELECT value FROM vexo_platform_settings WHERE key = $1 LIMIT 1`, [key]);
    if (res.rows.length > 0 && res.rows[0].value !== undefined && res.rows[0].value !== null) {
      return String(res.rows[0].value);
    }
  } catch (err) {
    console.error("Failed to read platform setting:", key, err);
  }
  return defaultValue;
}

export async function setPlatformSetting(key: string, value: string, adminUserId?: number): Promise<void> {
  await ensureAdminSchema();
  await db.query(
    `INSERT INTO vexo_platform_settings(key, value, updated_at, updated_by)
     VALUES($1, $2, NOW(), $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
    [key, value, adminUserId || null]
  );
}

export const DEFAULT_PLATFORM_SETTINGS: Record<string, string> = {
  // Theme & Appearance
  platform_theme: "cyber-lime",

  // Profit Margins & Currency
  global_profit_margin: "8",
  dollar_order_markup: "8",
  dollar_rate_mode: "manual",
  manual_dollar_rate: "285.00",
  usd_to_pkr: "285.00",

  // Local Accounts
  sadapay_number: "03197008275",
  sadapay_title: "Saeed Bashir",
  easypaisa_number: "03197008275",
  easypaisa_title: "Saeed Bashir",
  jazzcash_number: "03197008275",
  jazzcash_title: "Saeed Bashir",

  // Crypto / Binance
  binance_uid: "1069021883",
  binance_name: "Talha Bashir Bhatti",
  binance_usdt_address: "0xaa3037450e112ef10406df821803522bc589821c",
  binance_network: "BSC BNB Smart Chain (BEP20)",

  // Deposit Bonus
  deposit_bonus_percentage: "tiered",

  // Site Operations & Controls
  site_maintenance_mode: "false",
  site_maintenance_message: "We are currently performing scheduled maintenance to upgrade our systems. We will be back online shortly!",
  site_notice_enabled: "false",
  site_notice_text: "⚡ Special Announcement: Fast instant order delivery & up to +10% deposit bonus active!",
  site_notice_type: "info",

  // Official Support Handles
  support_whatsapp_number: "923197008275",
  support_telegram_username: "VexaroSMMAdmin",
  support_email: "support@vexarosmm.com",

  // Search Engine Optimization (SEO)
  seo_meta_title: "VEXARO SMM Panel – Affordable Social Media Marketing Services",
  seo_meta_description: "VEXARO SMM (vexarosmm.com) is the #1 cheapest automated SMM panel in Pakistan & Worldwide. Buy Instagram followers, TikTok likes, YouTube 4000 hours watch time & views, Facebook followers, and Telegram members. Instant delivery with SadaPay, Easypaisa, JazzCash, and Binance Pay.",
  seo_meta_keywords: "vexarosmm, vexarosmm.com, vexaro smm, vexaro smm panel, smm panel pakistan, cheapest smm panel, best smm panel pakistan, smm panel easypaisa, smm panel jazzcash, smm panel sadapay, smm panel binance pay, smm panel usdt, buy instagram followers pakistan, buy tiktok likes pakistan, buy youtube watchtime 4000 hours, reseller smm panel",
  seo_site_url: "https://vexarosmm.com",
  seo_og_title: "VEXARO SMM Panel – Affordable Social Media Marketing Services",
  seo_og_description: "Boost your social media growth instantly with VEXARO SMM (vexarosmm.com). Cheapest automated SMM panel for Instagram, TikTok, YouTube, & Facebook. Easy deposits via SadaPay, Easypaisa, JazzCash, and Binance Pay.",
  seo_og_image: "/og-image.png",
  seo_twitter_title: "VEXARO SMM Panel – Best & Cheapest SMM Panel",
  seo_twitter_description: "Cheapest SMM panel (vexarosmm.com) for Instagram, TikTok, YouTube, and Facebook. Instant automated delivery with 24/7 support.",
  seo_twitter_handle: "@VexaroSMMAdmin",
  seo_twitter_card: "summary_large_image",
  seo_robots_index: "true",
  seo_robots_follow: "true",
  seo_google_site_verification: "googleb27b1614a9d4e487",
  seo_bing_site_verification: "",
  seo_google_analytics_id: "G-34H7D6YB4D",
  seo_google_tag_manager_id: "",
  seo_meta_pixel_id: "",
  seo_tiktok_pixel_id: "",
  seo_custom_head_scripts: "",
  seo_custom_body_scripts: "",
};

export async function getAllPlatformSettings(): Promise<Record<string, string>> {
  await ensureAdminSchema();
  const settings: Record<string, string> = { ...DEFAULT_PLATFORM_SETTINGS };
  try {
    const res = await db.query(`SELECT key, value FROM vexo_platform_settings`);
    for (const row of res.rows) {
      if (row.key && row.value !== null && row.value !== undefined) {
        settings[row.key] = String(row.value);
      }
    }
  } catch (err) {
    console.error("Failed to get all platform settings:", err);
  }
  return settings;
}

export async function logAdminActivity(
  adminUserId: number,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: unknown,
) {
  await ensureAdminSchema();
  await db.query(
    `INSERT INTO vexo_admin_activity(admin_user_id, action, target_type, target_id, details)
     VALUES($1,$2,$3,$4,$5::jsonb)`,
    [adminUserId, action, targetType || null, targetId || null, JSON.stringify(details ?? {})],
  );
}
