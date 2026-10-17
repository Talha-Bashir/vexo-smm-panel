import { NextResponse } from "next/server";
import { generateVisualCaptcha } from "@/lib/captcha";
import { getPlatformSetting } from "@/lib/admin";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request.headers.get("origin"));
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const cfSiteKey =
      (await getPlatformSetting("cloudflare_turnstile_site_key", "").catch(() => "")) ||
      process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ||
      "";

    const captchaMode = (await getPlatformSetting("captcha_mode", "auto").catch(() => "")) || "auto";

    // If Cloudflare Turnstile is configured and mode is not forced to visual
    const useTurnstile = Boolean(cfSiteKey && cfSiteKey.trim().length > 5 && captchaMode !== "visual");

    // Always generate a visual captcha as fallback or primary
    const visual = generateVisualCaptcha();

    return NextResponse.json(
      {
        success: true,
        mode: useTurnstile ? "turnstile" : "visual",
        turnstileSiteKey: useTurnstile ? cfSiteKey.trim() : null,
        visual: {
          svg: visual.svgDataUri,
          token: visual.token,
        },
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("GET /api/auth/captcha error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to generate security verification." },
      { status: 500, headers: corsHeaders }
    );
  }
}
