import { NextResponse } from "next/server";
import crypto from "crypto";
import { db, ensureDatabase } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { verifyCodeSubmission } from "@/lib/email-verification";
import { redeemCoupon } from "@/lib/coupons";
import { checkMaintenanceApiBlock } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

function generateReferralCode() {
  return "VX" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

function generateApiKey() {
  return "vx_live_" + crypto.randomBytes(24).toString("hex");
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request.headers.get("origin"));
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  const maintenanceBlock = await checkMaintenanceApiBlock();
  if (maintenanceBlock) return maintenanceBlock;

  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "").trim();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: "Email address and 6-digit verification code are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Verify code against DB record
    const verif = await verifyCodeSubmission({
      email,
      code,
      type: "signup",
    });

    if (!verif.ok || !verif.payload) {
      return NextResponse.json(
        { success: false, error: verif.error || "Invalid or expired verification code." },
        { status: 400, headers: corsHeaders }
      );
    }

    const payload = verif.payload as {
      name: string;
      email: string;
      passwordHash: string;
      referralCode?: string;
      referredBy?: number | null;
      couponCode?: string;
      deviceFingerprint?: string;
      clientIp?: string;
      userAgent?: string;
    };

    await ensureDatabase();

    // Check again to ensure user was not created in the meantime
    const existing = await db.query(
      `SELECT id FROM vexo_users WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      return NextResponse.json(
        { success: false, error: "An account with this email address already exists. Please log in." },
        { status: 409, headers: corsHeaders }
      );
    }

    const userReferralCode = generateReferralCode();
    const apiKey = generateApiKey();

    // Insert new verified user
    const insertRes = await db.query(
      `INSERT INTO vexo_users(
         name, email, password_hash, referral_code, referred_by, api_key, email_verified, email_verified_at
       ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
       RETURNING id, name, email, referral_code, api_key`,
      [
        payload.name,
        email,
        payload.passwordHash,
        userReferralCode,
        payload.referredBy || null,
        apiKey,
      ]
    );

    const newUser = insertRes.rows[0];
    await createSession(newUser.id);

    // Optional coupon redemption
    let couponResult = null;
    if (payload.couponCode) {
      try {
        const redeemed = await redeemCoupon({
          code: payload.couponCode,
          userId: Number(newUser.id),
          clientIp: payload.clientIp,
          deviceFingerprint: payload.deviceFingerprint,
          userAgent: payload.userAgent,
        });
        couponResult = {
          success: true,
          code: redeemed.code,
          prizePkr: redeemed.prizePkr,
          message: redeemed.message,
        };
      } catch (cErr: any) {
        couponResult = { success: false, error: cErr?.message || "Coupon redemption failed." };
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Account verified and created successfully!",
        redirect: "/dashboard",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          referralCode: newUser.referral_code,
        },
        coupon: couponResult,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("SIGNUP VERIFY CODE ERROR:", err);
    return NextResponse.json(
      { success: false, error: "Unable to complete account registration." },
      { status: 500, headers: corsHeaders }
    );
  }
}
