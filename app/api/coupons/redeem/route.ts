import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { redeemCoupon } from "@/lib/coupons";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request.headers.get("origin"));
}

import { checkMaintenanceApiBlock } from "@/lib/maintenance";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  const maintenanceBlock = await checkMaintenanceApiBlock();
  if (maintenanceBlock) return maintenanceBlock;

  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Please log in to redeem coupons." },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json().catch(() => ({}));
    const code = String(body.code || body.couponCode || "").trim();
    const deviceFingerprint = String(body.deviceFingerprint || "").trim();

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Please enter a coupon code." },
        { status: 400, headers: corsHeaders }
      );
    }

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await redeemCoupon({
      code,
      userId: Number(user.id),
      clientIp,
      deviceFingerprint,
      userAgent,
    });

    return NextResponse.json(
      {
        ...result,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to redeem coupon.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400, headers: corsHeaders }
    );
  }
}
