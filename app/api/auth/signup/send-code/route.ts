import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { verifyAnyCaptcha } from "@/lib/captcha";
import { createAndSendVerification } from "@/lib/email-verification";
import { checkMaintenanceApiBlock } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

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
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const confirmPassword = String(body.confirmPassword || "");
    const referralCode = String(body.referralCode || body.ref || "").trim().toUpperCase();
    const couponCode = String(body.couponCode || body.coupon || "").trim().toUpperCase();
    const honeypot = String(body.honeypot || body._hp_trap || "");
    const captchaResponse = String(body.captchaResponse || "");
    const captchaToken = String(body.captchaToken || "");
    const turnstileToken = String(body.turnstileToken || body.botToken || "");
    const deviceFingerprint = String(body.deviceFingerprint || "").trim();
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    // 1. Verify CAPTCHA / Bot protection
    const captchaCheck = await verifyAnyCaptcha({
      captchaResponse,
      captchaToken,
      turnstileToken,
      honeypot,
      clientIp,
    });

    if (!captchaCheck.success) {
      return NextResponse.json(
        { success: false, error: captchaCheck.error || "Security verification failed." },
        { status: 403, headers: corsHeaders }
      );
    }

    // 2. Validate user fields
    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid full name (at least 2 characters)." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match." },
        { status: 400, headers: corsHeaders }
      );
    }

    await ensureDatabase();

    // 3. Check if account already exists
    const existing = await db.query(
      `SELECT id FROM vexo_users WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      return NextResponse.json(
        { success: false, error: "An account with this email address already exists. Please log in instead." },
        { status: 409, headers: corsHeaders }
      );
    }

    // 4. Check referral referrer ID
    let referredBy: number | null = null;
    if (referralCode) {
      const refCheck = await db.query(
        `SELECT id FROM vexo_users WHERE UPPER(referral_code) = $1 LIMIT 1`,
        [referralCode]
      );
      if (refCheck.rows[0]) {
        referredBy = Number(refCheck.rows[0].id);
      }
    }

    // 5. Hash password for pending registration
    const passwordHash = await hashPassword(password);

    // 6. Generate and send non-consecutive random 6-digit verification code
    const verifResult = await createAndSendVerification({
      email,
      type: "signup",
      recipientName: name,
      payload: {
        name,
        email,
        passwordHash,
        referralCode,
        referredBy,
        couponCode,
        deviceFingerprint,
        clientIp,
        userAgent,
      },
    });

    if (!verifResult.ok) {
      return NextResponse.json(
        {
          success: false,
          error: verifResult.error || "Failed to dispatch verification code.",
          retryAfterSeconds: verifResult.retryAfterSeconds,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Verification code sent to ${email}. Please check your inbox.`,
        email,
        simulatedCode: verifResult.simulatedCode, // provided only in test / dev mode
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("SIGNUP SEND CODE ERROR:", err);
    return NextResponse.json(
      { success: false, error: "Unable to process verification request." },
      { status: 500, headers: corsHeaders }
    );
  }
}
