import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-guard";
import { ensureAdminSchema } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function guard() {
  const auth = await requireAdminPermission("users");
  if (!auth.authorized) return { error: auth.response! };
  return { user: auth.user! };
}

export async function GET(req: Request) {
  try {
    const g = await guard();
    if (g.error) return g.error;
    await ensureAdminSchema();
    const q = new URL(req.url).searchParams.get("q")?.trim() || "";
    const r = await db.query(
      `SELECT u.id, u.name, u.email, u.created_at, COALESCE(w.balance_pkr, 0) balance_pkr,
              (SELECT COUNT(*) FROM vexo_orders o WHERE o.user_id = u.id) order_count,
              (SELECT COUNT(*) FROM vexo_deposits d WHERE d.user_id = u.id) deposit_count
       FROM vexo_users u
       LEFT JOIN vexo_wallets w ON w.user_id = u.id
       WHERE (u.role = 'user' OR u.role IS NULL)
         AND ($1 = '' OR u.name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
       ORDER BY u.created_at DESC
       LIMIT 300`,
      [q]
    );
    return NextResponse.json({
      success: true,
      users: r.rows.map((x) => ({
        id: x.id,
        name: x.name,
        email: x.email,
        createdAt: x.created_at,
        balancePkr: +x.balance_pkr,
        orderCount: +x.order_count,
        depositCount: +x.deposit_count,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unable to load users." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const c = await db.connect();
  try {
    const g = await guard();
    if (g.error) return g.error;
    await ensureAdminSchema();
    const b = await req.json();

    // Support admin password reset
    if (b?.action === "reset_password") {
      const userId = Number(b?.userId);
      const newPassword = String(b?.password || "").trim();

      if (!Number.isInteger(userId) || userId < 1) {
        return NextResponse.json({ success: false, error: "Invalid user ID." }, { status: 400 });
      }
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ success: false, error: "Password must be at least 6 characters." }, { status: 400 });
      }

      await c.query("BEGIN");
      const u = await c.query(`SELECT id, email FROM vexo_users WHERE id = $1 FOR UPDATE`, [userId]);
      if (!u.rows[0]) {
        await c.query("ROLLBACK");
        return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
      }

      const passwordHash = hashPassword(newPassword);
      await c.query(`UPDATE vexo_users SET password_hash = $1 WHERE id = $2`, [passwordHash, userId]);
      await c.query(`DELETE FROM vexo_sessions WHERE user_id = $1`, [userId]);

      await c.query(
        `INSERT INTO vexo_admin_activity(admin_user_id, action, target_type, target_id, details)
         VALUES ($1, 'reset_password', 'user', $2, $3::jsonb)`,
        [+g.user!.id, String(userId), JSON.stringify({ email: u.rows[0].email })]
      );
      await c.query("COMMIT");

      return NextResponse.json({ success: true, message: `Password reset successfully for ${u.rows[0].email}` });
    }

    // Default: wallet adjustment
    const userId = Number(b?.userId);
    const amount = Number(b?.amount);
    const mode = String(b?.mode || "add");
    const reason = String(b?.reason || "Admin wallet adjustment").slice(0, 300);

    if (
      !Number.isInteger(userId) ||
      userId < 1 ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 50000000 ||
      !["add", "deduct"].includes(mode)
    ) {
      return NextResponse.json({ success: false, error: "Invalid wallet adjustment." }, { status: 400 });
    }

    await c.query("BEGIN");
    const u = await c.query(`SELECT id FROM vexo_users WHERE id = $1 FOR UPDATE`, [userId]);
    if (!u.rows[0]) {
      await c.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }
    await c.query(`INSERT INTO vexo_wallets(user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [userId]);
    const w = await c.query(`SELECT balance_pkr FROM vexo_wallets WHERE user_id = $1 FOR UPDATE`, [userId]);
    const old = +w.rows[0].balance_pkr;
    const next = mode === "add" ? old + amount : old - amount;
    if (next < 0) {
      await c.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Balance cannot go below zero." }, { status: 400 });
    }
    await c.query(`UPDATE vexo_wallets SET balance_pkr = $2, updated_at = NOW() WHERE user_id = $1`, [userId, next]);
    await c.query(
      `INSERT INTO vexo_admin_activity(admin_user_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'user', $3, $4::jsonb)`,
      [+g.user!.id, `wallet_${mode}`, String(userId), JSON.stringify({ amount, reason, old, new: next })]
    );
    await c.query("COMMIT");
    return NextResponse.json({ success: true, balancePkr: next, message: "Wallet updated." });
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Operation failed." }, { status: 500 });
  } finally {
    c.release();
  }
}

