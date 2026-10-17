import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { verifyAnyCaptcha } from "@/lib/captcha";
import { createAndSendVerification } from "@/lib/email-verification";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request.headers.get("origin"));
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const honeypot = String(body.honeypot || body._hp_trap || "");
    const captchaResponse = String(body.captchaResponse || "");
    const captchaToken = String(body.captchaToken || "");
    const turnstileToken = String(body.turnstileToken || body.botToken || "");
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;

    // 1. Verify CAPTCHA
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

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400, headers: corsHeaders }
      );
    }

    await ensureDatabase();

    // 2. Check if user exists
    const userRes = await db.query(
      `SELECT id, name, email FROM vexo_users WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (!userRes.rows[0]) {
      return NextResponse.json(
        {
          success: false,
          error: "No account found with this email address. Please check your spelling.",
        },
        { status: 404, headers: corsHeaders }
      );
    }

    const user = userRes.rows[0];

    // 3. Dispatch verification code
    const verif = await createAndSendVerification({
      email,
      type: "password_reset",
      recipientName: user.name,
      payload: { userId: user.id },
    });

    if (!verif.ok) {
      return NextResponse.json(
        {
          success: false,
          error: verif.error || "Failed to send reset code.",
          retryAfterSeconds: verif.retryAfterSeconds,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Password reset verification code has been sent to ${email}.`,
        email,
        simulatedCode: verif.simulatedCode,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("FORGOT PASSWORD SEND CODE ERROR:", err);
    return NextResponse.json(
      { success: false, error: "Unable to process password reset request." },
      { status: 500, headers: corsHeaders }
    );
  }
}
