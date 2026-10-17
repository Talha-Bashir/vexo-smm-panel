import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-guard";
import { getAllPlatformSettings, setPlatformSetting, logAdminActivity } from "@/lib/admin";
import { invalidateExchangeRateCache } from "@/lib/exchange-rate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdminPermission();
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getAllPlatformSettings();
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (err) {
    console.error("GET /api/admin/settings error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load platform settings." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminPermission("settings");
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const allowedKeys = [
      // Theme & Appearance
      "platform_theme",

      // Profit Margins & Currency
      "global_profit_margin",
      "dollar_order_markup",
      "dollar_rate_mode",
      "manual_dollar_rate",
      "usd_to_pkr",

      // Security, Captcha & Email Verification
      "require_email_verification",
      "captcha_mode",
      "cloudflare_turnstile_site_key",
      "cloudflare_turnstile_secret_key",
      "resend_api_key",
      "resend_from_email",
      "brevo_api_key",

      // Local Accounts
      "sadapay_number",
      "sadapay_title",
      "easypaisa_number",
      "easypaisa_title",
      "jazzcash_number",
      "jazzcash_title",

      // Crypto / Binance
      "binance_uid",
      "binance_name",
      "binance_usdt_address",
      "binance_network",

      // Deposit Bonus
      "deposit_bonus_percentage",

      // Site Operations & Controls
      "site_maintenance_mode",
      "site_maintenance_message",
      "site_notice_enabled",
      "site_notice_text",
      "site_notice_type",

      // Official Support Handles
      "support_whatsapp_number",
      "support_telegram_username",
      "support_email",

      // Search Engine Optimization (SEO)
      "seo_meta_title",
      "seo_meta_description",
      "seo_meta_keywords",
      "seo_site_url",
      "seo_og_title",
      "seo_og_description",
      "seo_og_image",
      "seo_twitter_title",
      "seo_twitter_description",
      "seo_twitter_handle",
      "seo_twitter_card",
      "seo_robots_index",
      "seo_robots_follow",
      "seo_google_site_verification",
      "seo_bing_site_verification",
      "seo_google_analytics_id",
      "seo_google_tag_manager_id",
      "seo_meta_pixel_id",
      "seo_tiktok_pixel_id",
      "seo_custom_head_scripts",
      "seo_custom_body_scripts",
    ];

    const updated: Record<string, string> = {};

    for (const key of allowedKeys) {
      if (body[key] !== undefined && typeof body[key] === "string") {
        const val = key.includes("scripts") ? body[key] : body[key].trim();
        await setPlatformSetting(key, val, auth.user.id);
        updated[key] = val;
      }
    }

    await logAdminActivity(
      auth.user.id,
      "update_platform_settings",
      "platform_settings",
      "global",
      updated
    );

    invalidateExchangeRateCache();

    const allSettings = await getAllPlatformSettings();

    return NextResponse.json({
      success: true,
      message: "Platform settings updated successfully.",
      settings: allSettings,
    });
  } catch (err) {
    console.error("POST /api/admin/settings error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update platform settings." },
      { status: 500 }
    );
  }
}
