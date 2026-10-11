import { NextResponse } from "next/server";
import {
  recordArticleView,
  recordArticleImpressions,
  recordArticleReaction,
  getArticleMetrics,
  getAllBlogAnalytics,
} from "@/lib/blog-analytics";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request.headers.get("origin"));
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (slug) {
      const metrics = await getArticleMetrics(slug);
      return NextResponse.json({ success: true, metrics }, { headers: corsHeaders });
    }

    const summary = await getAllBlogAnalytics();
    return NextResponse.json({ success: true, summary }, { headers: corsHeaders });
  } catch (err: unknown) {
    console.error("GET /api/blog/track error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load metrics." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "view").trim();
    const slug = String(body.slug || "").trim();
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "";
    const userAgent = request.headers.get("user-agent") || "";

    if (action === "view" && slug) {
      const metrics = await recordArticleView(slug, clientIp, userAgent);
      return NextResponse.json({ success: true, metrics }, { headers: corsHeaders });
    }

    if (action === "impressions" && Array.isArray(body.slugs)) {
      await recordArticleImpressions(body.slugs);
      return NextResponse.json({ success: true, count: body.slugs.length }, { headers: corsHeaders });
    }

    if ((action === "like" || action === "share") && slug) {
      const result = await recordArticleReaction(slug, action, clientIp);
      return NextResponse.json(result, { headers: corsHeaders });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action or parameters." },
      { status: 400, headers: corsHeaders }
    );
  } catch (err: unknown) {
    console.error("POST /api/blog/track error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to record event." },
      { status: 500, headers: corsHeaders }
    );
  }
}
