import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, getSession, hashToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: "Current and new passwords are required." }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ success: false, error: "New password must be at least 8 characters long." }, { status: 400 });
    }

    const userResult = await db.query(
      `SELECT password_hash FROM vexo_users WHERE id = $1 LIMIT 1`,
      [user.id]
    );

    const userRow = userResult.rows[0];
    if (!userRow || !verifyPassword(currentPassword, userRow.password_hash)) {
      return NextResponse.json({ success: false, error: "Current password is incorrect." }, { status: 400 });
    }

    const newHash = hashPassword(newPassword);

    await db.query(
      `UPDATE vexo_users SET password_hash = $2 WHERE id = $1`,
      [user.id, newHash]
    );

    // Get current session token hash so we can preserve current session while revoking others
    const session = await getSession();
    if (session) {
      const parts = session.split(":");
      if (parts.length >= 2 && parts[1]) {
        const currentTokenHash = hashToken(parts[1]);
        await db.query(
          `DELETE FROM vexo_sessions WHERE user_id = $1 AND token_hash != $2`,
          [user.id, currentTokenHash]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. Other devices have been logged out for security.",
    });
  } catch (error) {
    console.error("VEXO CHANGE PASSWORD ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to change password." },
      { status: 500 }
    );
  }
}
