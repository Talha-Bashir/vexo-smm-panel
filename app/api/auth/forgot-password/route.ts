import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

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
    const accountName = String(body.accountName || "").trim();
    const newPassword = String(body.newPassword || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match." },
        { status: 400, headers: corsHeaders }
      );
    }

    await ensureDatabase();

    const userResult = await db.query(
      `SELECT id, name, email FROM vexo_users WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (!userResult.rows[0]) {
      return NextResponse.json(
        {
          success: false,
          error: "No account found with this email address. Please check your spelling or create an account.",
          code: "USER_NOT_FOUND",
        },
        { status: 404, headers: corsHeaders }
      );
    }

    const user = userResult.rows[0];

    // Verify account name for security
    if (!accountName) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter your registered full name or account name to verify account ownership.",
          code: "NAME_REQUIRED",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const userClean = user.name.toLowerCase().trim();
    const inputClean = accountName.toLowerCase().trim();

    // Check if input matches full name or part of name
    const matches =
      userClean === inputClean ||
      userClean.includes(inputClean) ||
      inputClean.includes(userClean);

    if (!matches) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The account name provided does not match our records for this email. If you cannot remember your registered name, please chat with VEXARO SMM Admin on WhatsApp (+92 317 6437013) to unlock your account.",
          code: "NAME_MISMATCH",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // Hash new password and update user
    const passwordHash = await hashPassword(newPassword);
    await db.query(`UPDATE vexo_users SET password_hash = $1 WHERE id = $2`, [
      passwordHash,
      user.id,
    ]);

    // Invalidate any existing active sessions
    await db.query(`DELETE FROM vexo_sessions WHERE user_id = $1`, [user.id]).catch(() => undefined);

    // Create a fresh session and log the user in
    await createSession(user.id);

    return NextResponse.json(
      {
        success: true,
        message: "Password updated successfully! Redirecting to your dashboard...",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("VEXO FORGOT PASSWORD ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Unable to reset password. Please try again or contact WhatsApp support." },
      { status: 500, headers: corsHeaders }
    );
  }
}
