import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { verifyBotProtection } from "@/lib/bot-protection";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request.headers.get("origin"));
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const b = await request.json();
    const email = String(b.email || "").trim().toLowerCase();
    const password = String(b.password || "");
    const botToken = String(b.botToken || b.turnstileToken || b["cf-turnstile-response"] || "");
    const honeypot = String(b.honeypot || b._hp_trap || "");
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

    const botCheck = await verifyBotProtection(botToken, honeypot, clientIp);
    if (!botCheck.success) {
      return NextResponse.json(
        { success: false, error: botCheck.error || "Security verification failed." },
        { status: 403, headers: corsHeaders }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    await ensureDatabase();
    const r = await db.query(
      `SELECT id, name, email, password_hash, is_active FROM vexo_users WHERE email = $1 LIMIT 1`,
      [email]
    );
    const u = r.rows[0];

    if (!u || !(await verifyPassword(password, u.password_hash))) {
      return NextResponse.json(
        { success: false, error: "Incorrect email or password." },
        { status: 401, headers: corsHeaders }
      );
    }

    if (u.is_active === false) {
      return NextResponse.json(
        { success: false, error: "This staff account has been suspended. Please contact the Super Admin." },
        { status: 403, headers: corsHeaders }
      );
    }

    await createSession(u.id);

    return NextResponse.json(
      {
        success: true,
        user: { id: u.id, name: u.name, email: u.email },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("VEXO LOGIN ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Unable to sign in." },
      { status: 500, headers: corsHeaders }
    );
  }
}

