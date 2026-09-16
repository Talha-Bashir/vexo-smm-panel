import { getSession, hashToken } from "@/lib/auth";
import { db, ensureDatabase } from "@/lib/db";
import { ensureWalletSchema } from "@/lib/wallet";

export async function getRequestUser() {
  await ensureDatabase();
  await ensureWalletSchema();

  const session = await getSession();
  if (!session) return null;

  const parts = session.split(":");
  if (parts.length < 2) return null;

  const userId = Number(parts[0]);
  const token = parts[1];

  if (!Number.isInteger(userId) || userId <= 0 || !token) return null;

  const tokenHash = hashToken(token);

  // Validate that the session exists, belongs to this user, and is not expired
  const sessionCheck = await db.query(
    `SELECT user_id
     FROM vexo_sessions
     WHERE user_id = $1 AND token_hash = $2 AND expires_at > NOW()
     LIMIT 1`,
    [userId, tokenHash]
  );

  if (!sessionCheck.rows[0]) {
    // Gracefully upgrade existing active session if user exists
    const legacyUser = await db.query(
      `SELECT id, name, email FROM vexo_users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    if (!legacyUser.rows[0]) return null;

    await db.query(
      `INSERT INTO vexo_sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')
       ON CONFLICT (token_hash) DO NOTHING`,
      [userId, tokenHash]
    );
  }

  const result = await db.query(
    `SELECT id, name, email, COALESCE(role, 'user') as role, COALESCE(permissions, '{}'::jsonb) as permissions, COALESCE(is_active, true) as is_active
     FROM vexo_users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );

  const user = result.rows[0];
  if (!user) return null;

  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const isSuperAdmin = Boolean(adminEmail && String(user.email).trim().toLowerCase() === adminEmail);
  const isSubAdmin = Boolean(user.role === "sub_admin" && user.is_active !== false);

  return {
    ...user,
    role: isSuperAdmin ? "super_admin" : user.role,
    permissions: user.permissions || {},
    is_super_admin: isSuperAdmin,
    is_admin: isSuperAdmin || isSubAdmin,
  };
}
