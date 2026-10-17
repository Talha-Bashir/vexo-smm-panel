import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { verifyCodeSubmission } from "@/lib/email-verification";

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
    const code = String(body.code || "").trim();
    const newPassword = String(body.newPassword || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: "Email and 6-digit verification code are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters long." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Verify code
    const verif = await verifyCodeSubmission({
      email,
      code,
      type: "password_reset",
    });

    if (!verif.ok) {
      return NextResponse.json(
        { success: false, error: verif.error || "Invalid or expired verification code." },
        { status: 400, headers: corsHeaders }
      );
    }

    await ensureDatabase();

    const userRes = await db.query(
      `SELECT id, name, email FROM vexo_users WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (!userRes.rows[0]) {
      return NextResponse.json(
        { success: false, error: "User account not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    const user = userRes.rows[0];

    // 2. Hash and update new password
    const passwordHash = await hashPassword(newPassword);
    await db.query(
      `UPDATE vexo_users SET password_hash = $1 WHERE id = $2`,
      [passwordHash, user.id]
    );

    // 3. Clear existing sessions for security
    await db.query(`DELETE FROM vexo_sessions WHERE user_id = $1`, [user.id]).catch(() => {});

    // 4. Create new fresh session
    await createSession(user.id);

    return NextResponse.json(
      {
        success: true,
        message: "Password reset successfully! Redirecting to your dashboard...",
        redirect: "/dashboard",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("FORGOT PASSWORD VERIFY CODE ERROR:", err);
    return NextResponse.json(
      { success: false, error: "Unable to complete password reset." },
      { status: 500, headers: corsHeaders }
    );
  }
}
