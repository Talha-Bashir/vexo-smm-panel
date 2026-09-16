import { NextResponse } from "next/server";
import crypto from "crypto";
import { db, ensureDatabase } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { verifyBotProtection } from "@/lib/bot-protection";

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

  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const inputReferralCode = String(body.referralCode || body.ref || "").trim().toUpperCase();
    const botToken = String(body.botToken || body.turnstileToken || body["cf-turnstile-response"] || "");
    const honeypot = String(body.honeypot || body._hp_trap || "");
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

    const botCheck = await verifyBotProtection(botToken, honeypot, clientIp);
    if (!botCheck.success) {
      return NextResponse.json(
        { success: false, error: botCheck.error || "Security verification failed." },
        { status: 403, headers: corsHeaders }
      );
    }

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { success: false, error: "Enter a valid name." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid email address." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters." },
        { status: 400, headers: corsHeaders }
      );
    }

    await ensureDatabase();

    const existing = await db.query(
      `SELECT id FROM vexo_users WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 409, headers: corsHeaders }
      );
    }

    // Check if referral code is provided and belongs to an existing user
    let referredBy: number | null = null;
    if (inputReferralCode) {
      const referrerResult = await db.query(
        `SELECT id FROM vexo_users WHERE UPPER(referral_code) = $1 LIMIT 1`,
        [inputReferralCode]
      );
      if (referrerResult.rows[0]) {
        referredBy = Number(referrerResult.rows[0].id);
      }
    }

    const referralCode = generateReferralCode();
    const apiKey = generateApiKey();
    const passwordHash = await hashPassword(password);

    const result = await db.query(
      `INSERT INTO vexo_users(name, email, password_hash, referral_code, referred_by, api_key)
       VALUES($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, referral_code, api_key`,
      [name, email, passwordHash, referralCode, referredBy, apiKey]
    );

    const newUser = result.rows[0];
    await createSession(newUser.id);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          referralCode: newUser.referral_code,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("VEXO SIGNUP ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Unable to create account." },
      { status: 500, headers: corsHeaders }
    );
  }
}
