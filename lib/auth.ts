import crypto from "crypto";
import { cookies } from "next/headers";
import { db, ensureDatabase } from "@/lib/db";

const SESSION_COOKIE = "vexo_session";
const SESSION_DAYS = 7;

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedPassword: string) {
  const [salt, storedHash] = storedPassword.split(":");

  if (!salt || !storedHash) return false;

  const hash = crypto.scryptSync(password, salt, 64);

  const stored = Buffer.from(storedHash, "hex");

  if (hash.length !== stored.length) return false;

  return crypto.timingSafeEqual(hash, stored);
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number) {
  await ensureDatabase();
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO vexo_sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, `${userId}:${token}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });

  return token;
}

export async function clearSession() {
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionVal) {
    const parts = sessionVal.split(":");
    if (parts.length === 2 && parts[1]) {
      const tokenHash = hashToken(parts[1]);
      await db.query(`DELETE FROM vexo_sessions WHERE token_hash = $1`, [tokenHash]).catch(() => undefined);
    }
  }

  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0),
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}