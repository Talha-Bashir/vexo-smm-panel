import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-guard";
import { ensureAdminSchema } from "@/lib/admin";
import { hashPassword, createSession } from "@/lib/auth";
import { grantAdminBonus } from "@/lib/signup-bonus";

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
      `SELECT u.id, u.name, u.email, u.whatsapp, 
              COALESCE(u.role, 'user') AS role,
              COALESCE(u.is_active, true) AS is_active,
              COALESCE(u.email_verified, false) AS email_verified,
              u.created_at,
              COALESCE(u.custom_discount_percent, 0) AS custom_discount_percent,
              COALESCE(u.custom_rates, '{}'::jsonb) AS custom_rates,
              COALESCE(w.balance_pkr, 0) AS balance_pkr,
              COALESCE(w.bonus_balance_pkr, 0) AS bonus_balance_pkr,
              c.status AS bonus_status,
              c.reason AS bonus_reason,
              (SELECT COUNT(*) FROM vexo_orders o WHERE o.user_id = u.id) AS order_count,
              (SELECT COUNT(*) FROM vexo_deposits d WHERE d.user_id = u.id) AS deposit_count
       FROM vexo_users u
       LEFT JOIN vexo_wallets w ON w.user_id = u.id
       LEFT JOIN vexo_signup_bonus_claims c ON c.user_id = u.id
       WHERE ($1 = '' OR u.name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%' OR u.id::text = $1)
       ORDER BY u.created_at DESC
       LIMIT 500`,
      [q]
    );
    return NextResponse.json({
      success: true,
      users: r.rows.map((x) => ({
        id: x.id,
        name: x.name,
        email: x.email,
        whatsapp: x.whatsapp || null,
        role: x.role,
        isActive: Boolean(x.is_active),
        emailVerified: Boolean(x.email_verified),
        createdAt: x.created_at,
        balancePkr: +x.balance_pkr,
        bonusBalancePkr: +x.bonus_balance_pkr,
        bonusStatus: x.bonus_status || null,
        bonusReason: x.bonus_reason || null,
        orderCount: +x.order_count,
        depositCount: +x.deposit_count,
        customDiscountPercent: Number(x.custom_discount_percent || 0),
        customRates: x.custom_rates || {},
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

    // 1. Impersonate / Login as user
    if (b?.action === "impersonate") {
      const userId = Number(b?.userId);
      if (!Number.isInteger(userId) || userId < 1) {
        return NextResponse.json({ success: false, error: "Invalid user ID." }, { status: 400 });
      }

      const u = await db.query(`SELECT id, email, name FROM vexo_users WHERE id = $1`, [userId]);
      if (!u.rows[0]) {
        return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
      }

      await createSession(userId);

      await db.query(
        `INSERT INTO vexo_admin_activity(admin_user_id, action, target_type, target_id, details)
         VALUES ($1, 'impersonate_user', 'user', $2, $3::jsonb)`,
        [+g.user!.id, String(userId), JSON.stringify({ email: u.rows[0].email, name: u.rows[0].name })]
      );

      return NextResponse.json({
        success: true,
        message: `Signed in as ${u.rows[0].name} (${u.rows[0].email}). Redirecting...`,
        redirectUrl: "/dashboard",
      });
    }

    // 2. Change user role
    if (b?.action === "change_role") {
      const userId = Number(b?.userId);
      const newRole = String(b?.role || "").trim().toLowerCase();
      const validRoles = ["user", "sub_admin", "admin", "super_admin"];

      if (!Number.isInteger(userId) || userId < 1 || !validRoles.includes(newRole)) {
        return NextResponse.json({ success: false, error: "Invalid role specified." }, { status: 400 });
      }

      const u = await db.query(`SELECT id, email, role FROM vexo_users WHERE id = $1`, [userId]);
      if (!u.rows[0]) {
        return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
      }

      await db.query(`UPDATE vexo_users SET role = $1 WHERE id = $2`, [newRole, userId]);

      await db.query(
        `INSERT INTO vexo_admin_activity(admin_user_id, action, target_type, target_id, details)
         VALUES ($1, 'change_role', 'user', $2, $3::jsonb)`,
        [+g.user!.id, String(userId), JSON.stringify({ email: u.rows[0].email, oldRole: u.rows[0].role, newRole })]
      );

      return NextResponse.json({
        success: true,
        message: `User role changed to ${newRole}.`,
        role: newRole,
      });
    }

    // 3. Toggle user active / suspended status
    if (b?.action === "toggle_active") {
      const userId = Number(b?.userId);
      if (!Number.isInteger(userId) || userId < 1) {
        return NextResponse.json({ success: false, error: "Invalid user ID." }, { status: 400 });
      }

      const u = await db.query(`SELECT id, email, is_active FROM vexo_users WHERE id = $1`, [userId]);
      if (!u.rows[0]) {
        return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
      }

      const nextActive = !Boolean(u.rows[0].is_active);
      await db.query(`UPDATE vexo_users SET is_active = $1 WHERE id = $2`, [nextActive, userId]);

      // If banned, kill all active sessions
      if (!nextActive) {
        await db.query(`DELETE FROM vexo_sessions WHERE user_id = $1`, [userId]);
      }

      await db.query(
        `INSERT INTO vexo_admin_activity(admin_user_id, action, target_type, target_id, details)
         VALUES ($1, $2, 'user', $3, $4::jsonb)`,
        [+g.user!.id, nextActive ? "activate_user" : "ban_user", String(userId), JSON.stringify({ email: u.rows[0].email })]
      );

      return NextResponse.json({
        success: true,
        message: nextActive ? `User ${u.rows[0].email} activated.` : `User ${u.rows[0].email} suspended/banned.`,
        isActive: nextActive,
      });
    }

    // 4. Manually verify or unverify user email
    if (b?.action === "verify_email") {
      const userId = Number(b?.userId);
      if (!Number.isInteger(userId) || userId < 1) {
        return NextResponse.json({ success: false, error: "Invalid user ID." }, { status: 400 });
      }

      const u = await db.query(`SELECT id, email, email_verified FROM vexo_users WHERE id = $1`, [userId]);
      if (!u.rows[0]) {
        return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
      }

      const nextVerified = b?.verified !== undefined ? Boolean(b.verified) : !Boolean(u.rows[0].email_verified);
      await db.query(
        `UPDATE vexo_users SET email_verified = $1, email_verified_at = $2 WHERE id = $3`,
        [nextVerified, nextVerified ? new Date() : null, userId]
      );

      await db.query(
        `INSERT INTO vexo_admin_activity(admin_user_id, action, target_type, target_id, details)
         VALUES ($1, 'manual_email_verify', 'user', $2, $3::jsonb)`,
        [+g.user!.id, String(userId), JSON.stringify({ email: u.rows[0].email, verified: nextVerified })]
      );

      return NextResponse.json({
        success: true,
        message: nextVerified ? `Email for ${u.rows[0].email} marked verified.` : `Email for ${u.rows[0].email} unverified.`,
        emailVerified: nextVerified,
      });
    }

    // 5. Grant promotional / signup bonus
    if (b?.action === "grant_bonus") {
      const userId = Number(b?.userId);
      const amount = b?.amount !== undefined ? Number(b?.amount) : 50.0;
      const reason = String(b?.reason || "Manual promotional bonus grant by admin");

      if (!Number.isInteger(userId) || userId < 1) {
        return NextResponse.json({ success: false, error: "Invalid user ID." }, { status: 400 });
      }

      const result = await grantAdminBonus({
        userId,
        adminId: +g.user!.id,
        amountPkr: amount,
        reason,
      });

      return NextResponse.json({
        success: true,
        message: result.message,
        bonusBalancePkr: result.newBonusBalance,
      });
    }

    // 6. Custom user rates and wholesale discounts
    if (b?.action === "set_custom_rates") {
      const userId = Number(b?.userId);
      const discountPercent = Math.max(0, Math.min(99, Number(b?.customDiscountPercent || 0)));
      const customRates = typeof b?.customRates === "object" && b?.customRates !== null ? b.customRates : {};

      if (!Number.isInteger(userId) || userId < 1) {
        return NextResponse.json({ success: false, error: "Invalid user ID." }, { status: 400 });
      }

      await c.query("BEGIN");
      const u = await c.query(`SELECT id, email FROM vexo_users WHERE id = $1 FOR UPDATE`, [userId]);
      if (!u.rows[0]) {
        await c.query("ROLLBACK");
        return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
      }

      await c.query(
        `UPDATE vexo_users 
         SET custom_discount_percent = $1, custom_rates = $2 
         WHERE id = $3`,
        [discountPercent, JSON.stringify(customRates), userId]
      );

      await c.query(
        `INSERT INTO vexo_admin_activity(admin_user_id, action, target_type, target_id, details)
         VALUES ($1, 'set_custom_rates', 'user', $2, $3::jsonb)`,
        [+g.user!.id, String(userId), JSON.stringify({ email: u.rows[0].email, discountPercent, customRates })]
      );
      await c.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: `Wholesale pricing updated for ${u.rows[0].email}`,
        customDiscountPercent: discountPercent,
        customRates,
      });
    }

    // 7. Admin password reset
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

    // 8. Wallet adjustment
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

export async function DELETE(req: Request) {
  try {
    const g = await guard();
    if (g.error) return g.error;
    await ensureAdminSchema();

    const { searchParams } = new URL(req.url);
    const userId = Number(searchParams.get("userId") || searchParams.get("id"));

    if (!Number.isInteger(userId) || userId < 1) {
      return NextResponse.json({ success: false, error: "Invalid user ID." }, { status: 400 });
    }

    // Do not allow deleting self
    if (userId === Number(g.user!.id)) {
      return NextResponse.json({ success: false, error: "You cannot delete your own admin account." }, { status: 400 });
    }

    const u = await db.query(`SELECT id, email, name FROM vexo_users WHERE id = $1`, [userId]);
    if (!u.rows[0]) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    // Clean up all user dependencies across panel tables inside a safe transaction
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      
      await client.query(`DELETE FROM vexo_free_trial_claims WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM vexo_order_refills WHERE user_id = $1`, [userId]).catch(() => {});
      await client.query(`DELETE FROM vexo_orders WHERE user_id = $1`, [userId]).catch(() => {});
      await client.query(`DELETE FROM vexo_support_tickets WHERE user_id = $1`, [userId]).catch(() => {});
      await client.query(`DELETE FROM vexo_coupon_redemptions WHERE user_id = $1`, [userId]).catch(() => {});
      await client.query(`DELETE FROM vexo_tool_subscriptions WHERE user_id = $1`, [userId]).catch(() => {});
      await client.query(`DELETE FROM vexo_event_messages WHERE user_id = $1`, [userId]).catch(() => {});
      await client.query(`DELETE FROM vexo_event_participants WHERE user_id = $1`, [userId]).catch(() => {});
      await client.query(`DELETE FROM vexo_referral_withdrawals WHERE user_id = $1`, [userId]).catch(() => {});
      await client.query(`DELETE FROM vexo_referral_earnings WHERE referrer_id = $1 OR referee_id = $1`, [userId]).catch(() => {});
      await client.query(`DELETE FROM vexo_wallet_transactions WHERE user_id = $1`, [userId]).catch(() => {});
      await client.query(`DELETE FROM vexo_deposits WHERE user_id = $1`, [userId]).catch(() => {});
      await client.query(`DELETE FROM vexo_wallets WHERE user_id = $1`, [userId]).catch(() => {});
      await client.query(`DELETE FROM vexo_signup_bonus_claims WHERE user_id = $1`, [userId]).catch(() => {});
      await client.query(`DELETE FROM vexo_sessions WHERE user_id = $1`, [userId]).catch(() => {});
      await client.query(`UPDATE vexo_users SET referred_by = NULL WHERE referred_by = $1`, [userId]).catch(() => {});
      await client.query(`DELETE FROM vexo_email_verifications WHERE LOWER(email) = LOWER($1)`, [u.rows[0].email]).catch(() => {});
      await client.query(`DELETE FROM vexo_users WHERE id = $1`, [userId]);

      await client.query(
        `INSERT INTO vexo_admin_activity(admin_user_id, action, target_type, target_id, details)
         VALUES ($1, 'delete_user', 'user', $2, $3::jsonb)`,
        [+g.user!.id, String(userId), JSON.stringify({ email: u.rows[0].email, name: u.rows[0].name })]
      );

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    return NextResponse.json({
      success: true,
      message: `User ${u.rows[0].email} permanently deleted.`,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unable to delete user." },
      { status: 500 }
    );
  }
}
