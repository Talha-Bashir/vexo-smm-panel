import crypto from "crypto";
import { db, ensureDatabase } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

export type VerificationType = "signup" | "password_reset";

export interface PendingSignupData {
  name: string;
  email: string;
  passwordHash: string;
  referralCode?: string;
  referredBy?: number | null;
  couponCode?: string;
  deviceFingerprint?: string;
  clientIp?: string;
  userAgent?: string;
}

/**
 * Check if a 6-digit code has consecutive or repetitive patterns
 */
export function isConsecutiveOrRepetitive(code: string): boolean {
  if (code.length !== 6) return true;

  // 1. All same digits (e.g. 111111, 777777)
  if (/^(\d)\1{5}$/.test(code)) return true;

  // 2. Full consecutive ascending or descending
  const asc = "01234567890123456789";
  const desc = "98765432109876543210";
  if (asc.includes(code) || desc.includes(code)) return true;

  // 3. Partial run of 4+ consecutive digits (e.g. 123498, 987612)
  for (let i = 0; i <= code.length - 4; i++) {
    const chunk = code.substring(i, i + 4);
    if (asc.includes(chunk) || desc.includes(chunk)) return true;
  }

  // 4. Repeated 2-digit or 3-digit sequences (e.g. 121212, 123123)
  if (code.slice(0, 2) === code.slice(2, 4) && code.slice(2, 4) === code.slice(4, 6)) return true;
  if (code.slice(0, 3) === code.slice(3, 6)) return true;

  return false;
}

/**
 * Cryptographically secure random 6-digit code generation
 * Enforces NO consecutive numbers and high entropy
 */
export function generateSecureRandomCode(): string {
  let attempts = 0;
  while (attempts < 1000) {
    attempts++;
    // Cryptographically secure integer between 100000 and 999999
    const n = crypto.randomInt(100000, 1000000);
    const code = n.toString();
    if (!isConsecutiveOrRepetitive(code)) {
      return code;
    }
  }
  // Safe fallback if loop limit reached (extremely rare)
  return "7" + crypto.randomInt(10, 99) + crypto.randomInt(10, 99) + "3";
}

/**
 * Hash code with salt for storage
 */
export function hashCodeWithSalt(code: string, salt: string): string {
  return crypto.createHash("sha256").update(`${code}:${salt}`).digest("hex");
}

/**
 * Store a new verification code and email dispatch
 * Rate-limited to max 1 email per 45 seconds per email+type
 */
export async function createAndSendVerification(params: {
  email: string;
  type: VerificationType;
  recipientName?: string;
  payload?: Record<string, unknown>;
}): Promise<{ ok: boolean; error?: string; retryAfterSeconds?: number; simulatedCode?: string }> {
  await ensureDatabase();
  const cleanEmail = params.email.trim().toLowerCase();

  // Check recent request within 45 seconds to avoid spam / mail bombing
  const recent = await db.query(
    `SELECT created_at FROM vexo_email_verifications
     WHERE email = $1 AND type = $2 AND created_at > NOW() - INTERVAL '45 seconds'
     ORDER BY created_at DESC LIMIT 1`,
    [cleanEmail, params.type]
  );

  if (recent.rows.length > 0) {
    const diffMs = Date.now() - new Date(recent.rows[0].created_at).getTime();
    const waitSeconds = Math.max(1, 45 - Math.floor(diffMs / 1000));
    return {
      ok: false,
      error: `A verification code was recently sent. Please wait ${waitSeconds}s before requesting a new code.`,
      retryAfterSeconds: waitSeconds,
    };
  }

  // Invalidate any older pending codes for this email and type
  await db.query(
    `DELETE FROM vexo_email_verifications WHERE email = $1 AND type = $2`,
    [cleanEmail, params.type]
  ).catch(() => {});

  // Generate cryptographically random non-consecutive 6-digit code
  const code = generateSecureRandomCode();
  const salt = crypto.randomBytes(16).toString("hex");
  const codeHash = hashCodeWithSalt(code, salt);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

  await db.query(
    `INSERT INTO vexo_email_verifications(email, code_hash, code_salt, type, payload, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [cleanEmail, codeHash, salt, params.type, JSON.stringify(params.payload || {}), expiresAt]
  );

  // Send email
  const emailResult = await sendVerificationEmail({
    to: cleanEmail,
    recipientName: params.recipientName,
    code,
    type: params.type,
  });

  if (!emailResult.ok) {
    console.error("[EmailVerification] Failed to deliver code to", cleanEmail, emailResult.error);
    // In dev / unverified sandbox domain scenario, we return simulatedCode so testing does not block
    if (process.env.NODE_ENV !== "production" || emailResult.isSandboxRestricted) {
      return {
        ok: true,
        error: emailResult.error,
        simulatedCode: code,
      };
    }
    return {
      ok: false,
      error: emailResult.error || "Failed to deliver verification email. Please check your email address or try again.",
    };
  }

  return { ok: true };
}

/**
 * Verify a submitted code
 */
export async function verifyCodeSubmission(params: {
  email: string;
  code: string;
  type: VerificationType;
}): Promise<{ ok: boolean; error?: string; payload?: Record<string, unknown> }> {
  await ensureDatabase();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanCode = String(params.code || "").trim();

  if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return { ok: false, error: "Please enter the valid 6-digit verification code." };
  }

  const recordRes = await db.query(
    `SELECT id, code_hash, code_salt, payload, attempts, max_attempts, expires_at
     FROM vexo_email_verifications
     WHERE email = $1 AND type = $2
     ORDER BY created_at DESC LIMIT 1`,
    [cleanEmail, params.type]
  );

  const record = recordRes.rows[0];
  if (!record) {
    return {
      ok: false,
      error: "No active verification code found for this email. Please request a new code.",
    };
  }

  if (new Date() > new Date(record.expires_at)) {
    await db.query(`DELETE FROM vexo_email_verifications WHERE id = $1`, [record.id]).catch(() => {});
    return {
      ok: false,
      error: "Verification code has expired. Please request a new code.",
    };
  }

  if (record.attempts >= record.max_attempts) {
    await db.query(`DELETE FROM vexo_email_verifications WHERE id = $1`, [record.id]).catch(() => {});
    return {
      ok: false,
      error: "Too many failed attempts. For security, please request a new verification code.",
    };
  }

  const expectedHash = hashCodeWithSalt(cleanCode, record.code_salt);
  if (expectedHash !== record.code_hash) {
    // Increment attempts
    await db.query(
      `UPDATE vexo_email_verifications SET attempts = attempts + 1 WHERE id = $1`,
      [record.id]
    );
    const remaining = record.max_attempts - (record.attempts + 1);
    return {
      ok: false,
      error: `Incorrect verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new code."}`,
    };
  }

  // Verification successful! Remove the used record
  await db.query(`DELETE FROM vexo_email_verifications WHERE id = $1`, [record.id]).catch(() => {});

  let payload = {};
  try {
    payload = typeof record.payload === "string" ? JSON.parse(record.payload) : record.payload || {};
  } catch {
    payload = record.payload || {};
  }

  return {
    ok: true,
    payload,
  };
}
