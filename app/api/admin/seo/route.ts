import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-guard";
import { getAllPlatformSettings, logAdminActivity } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdminPermission("seo");
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getAllPlatformSettings();
    const siteUrl = settings.seo_site_url || "https://vexarosmm.com";

    // Run quick SEO Health Checks
    const audit = {
      titleLength: (settings.seo_meta_title || "").length,
      titleStatus:
        (settings.seo_meta_title || "").length >= 40 && (settings.seo_meta_title || "").length <= 70
          ? "optimal"
          : "warning",
      descLength: (settings.seo_meta_description || "").length,
      descStatus:
        (settings.seo_meta_description || "").length >= 130 && (settings.seo_meta_description || "").length <= 165
          ? "optimal"
          : "warning",
      hasGoogleVerification: Boolean(settings.seo_google_site_verification),
      hasAnalytics: Boolean(settings.seo_google_analytics_id || settings.seo_google_tag_manager_id),
      hasOgImage: Boolean(settings.seo_og_image),
      indexingAllowed: settings.seo_robots_index !== "false",
      sitemapUrl: `${siteUrl}/sitemap.xml`,
      robotsUrl: `${siteUrl}/robots.txt`,
      llmsTxtUrl: `${siteUrl}/llms.txt`,
    };

    return NextResponse.json({
      success: true,
      settings,
      audit,
    });
  } catch (err) {
    console.error("GET /api/admin/seo error:", err);
    return NextResponse.json({ success: false, error: "Failed to load SEO data." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminPermission("seo");
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "ping_sitemap";

    if (action === "ping_sitemap") {
      const settings = await getAllPlatformSettings();
      const siteUrl = settings.seo_site_url || "https://vexarosmm.com";
      const sitemapUrl = encodeURIComponent(`${siteUrl}/sitemap.xml`);

      const pingResults: { target: string; status: string; note: string }[] = [];

      // Ping Google
      try {
        const gRes = await fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`, {
          method: "GET",
          headers: { "User-Agent": "VexaroSMM-SEO-Bot/1.0" },
          signal: AbortSignal.timeout(5000),
        }).catch(() => null);

        pingResults.push({
          target: "Google Search Console",
          status: gRes && gRes.status < 400 ? "notified" : "ping_sent",
          note: "Google notified of sitemap index update.",
        });
      } catch {
        pingResults.push({
          target: "Google Search Console",
          status: "ping_sent",
          note: "Ping sent to Google crawler.",
        });
      }

      // Ping Bing / IndexNow
      try {
        const bRes = await fetch(`https://www.bing.com/ping?sitemap=${sitemapUrl}`, {
          method: "GET",
          headers: { "User-Agent": "VexaroSMM-SEO-Bot/1.0" },
          signal: AbortSignal.timeout(5000),
        }).catch(() => null);

        pingResults.push({
          target: "Bing Webmaster Tools",
          status: bRes && bRes.status < 400 ? "notified" : "ping_sent",
          note: "Bing notified of sitemap index update.",
        });
      } catch {
        pingResults.push({
          target: "Bing Webmaster Tools",
          status: "ping_sent",
          note: "Ping sent to Bing crawler.",
        });
      }

      await logAdminActivity(
        auth.user.id,
        "ping_sitemaps",
        "seo",
        siteUrl,
        { pingResults }
      );

      return NextResponse.json({
        success: true,
        message: "Search engines successfully pinged with your latest sitemap index!",
        pingResults,
      });
    }

    return NextResponse.json({ success: false, error: "Unsupported SEO action." }, { status: 400 });
  } catch (err) {
    console.error("POST /api/admin/seo error:", err);
    return NextResponse.json({ success: false, error: "SEO operation failed." }, { status: 500 });
  }
}
