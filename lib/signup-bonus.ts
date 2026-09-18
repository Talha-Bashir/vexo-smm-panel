import crypto from "crypto";
import { db } from "@/lib/db";

// Comprehensive blacklist of temporary/disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "guerrillamail.biz",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "yopmail.com",
  "trashmail.com",
  "trashmail.net",
  "trashmail.org",
  "throwawaymail.com",
  "sharklasers.com",
  "dispostable.com",
  "getairmail.com",
  "mohmal.com",
  "mytemp.email",
  "mytempemail.com",
  "temp-mail.org",
  "temp-mail.io",
  "fakemailgenerator.com",
  "dropmail.me",
  "emailondeck.com",
  "generator.email",
  "inboxkitten.com",
  "crazymailing.com",
  "tmail.ws",
  "pokemail.net",
  "spam4.me",
  "grr.la",
  "maildrop.cc",
  "mailnesia.com",
  "tempr.email",
  "tempail.com",
  "burnermail.io",
  "discard.email",
  "disposablemail.com",
  "fakeinbox.com",
  "inboxbear.com",
  "mailcatch.com",
  "mailsac.com",
  "nada.ltd",
  "getnada.com",
  "abcvg.com",
  "incognitomail.org",
  "wegwerfmail.de",
  "minutemail.com",
  "binkmail.com",
  "safetymail.info",
  "chacuo.net",
  "inboxdesign.me",
  "mail7.io",
  "zillamail.com",
  "armyspy.com",
  "cuvox.de",
  "dayrep.com",
  "einrot.com",
  "fleckens.hu",
  "gustr.com",
  "jourrapide.com",
  "rhyta.com",
  "superrito.com",
  "teleworm.us",
]);

let bonusSchemaPromise: Promise<void> | null = null;

export async function ensureBonusSchema(): Promise<void> {
  if (!bonusSchemaPromise) {
    bonusSchemaPromise = db
      .query(`
        -- Add bonus balance to vexo_wallets if not present
        ALTER TABLE vexo_wallets
          ADD COLUMN IF NOT EXISTS bonus_balance_pkr NUMERIC(14,2) NOT NULL DEFAULT 0;

        UPDATE vexo_wallets SET bonus_balance_pkr = 0 WHERE bonus_balance_pkr IS NULL;

        -- Create unconstrained index for wallet transactions so ON CONFLICT never fails
        CREATE UNIQUE INDEX IF NOT EXISTS vexo_wallet_transactions_ref_unconstrained_uidx
          ON vexo_wallet_transactions(reference_type, reference_id);

        -- Track bonus vs real charged amounts on orders
        ALTER TABLE vexo_orders
          ADD COLUMN IF NOT EXISTS bonus_charge_pkr NUMERIC(14,2) NOT NULL DEFAULT 0;
        ALTER TABLE vexo_orders
          ADD COLUMN IF NOT EXISTS real_charge_pkr NUMERIC(14,2) NOT NULL DEFAULT 0;

        -- Signup bonus claims audit ledger
        CREATE TABLE IF NOT EXISTS vexo_signup_bonus_claims (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id INTEGER NOT NULL UNIQUE REFERENCES vexo_users(id) ON DELETE CASCADE,
          amount_pkr NUMERIC(14,2) NOT NULL DEFAULT 50.00,
          status VARCHAR(30) NOT NULL, -- 'CLAIMED', 'REJECTED', 'SUSPICIOUS'
          reason VARCHAR(80) NOT NULL, -- 'ELIGIBLE', 'ALREADY_CLAIMED', 'DISPOSABLE_EMAIL', etc.
          client_ip VARCHAR(64),
          device_fingerprint VARCHAR(128),
          user_agent TEXT,
          normalized_email VARCHAR(255),
          email_domain VARCHAR(120),
          claim_reference VARCHAR(120) UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE UNIQUE INDEX IF NOT EXISTS vexo_bonus_claims_user_uidx
          ON vexo_signup_bonus_claims(user_id);
        CREATE INDEX IF NOT EXISTS vexo_bonus_claims_fingerprint_idx
          ON vexo_signup_bonus_claims(device_fingerprint);
        CREATE INDEX IF NOT EXISTS vexo_bonus_claims_ip_idx
          ON vexo_signup_bonus_claims(client_ip);
        CREATE INDEX IF NOT EXISTS vexo_bonus_claims_norm_email_idx
          ON vexo_signup_bonus_claims(normalized_email);

        ALTER TABLE vexo_signup_bonus_claims
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      `)
      .then(() => undefined)
      .catch((err) => {
        bonusSchemaPromise = null;
        throw err;
      });
  }
  return bonusSchemaPromise;
}

/**
 * Normalizes email address to prevent plus-addressing or dot-alias abuse.
 * E.g., "john.doe+promo@gmail.com" -> "johndoe@gmail.com"
 */
export function normalizeEmail(email: string): { normalized: string; domain: string } {
  const clean = String(email || "").trim().toLowerCase();
  const atIndex = clean.lastIndexOf("@");
  if (atIndex <= 0) return { normalized: clean, domain: "" };

  let local = clean.slice(0, atIndex);
  const domain = clean.slice(atIndex + 1);

  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, ""); // remove dots
    const plusIdx = local.indexOf("+");
    if (plusIdx !== -1) local = local.slice(0, plusIdx); // remove +tag
  } else if (
    domain === "outlook.com" ||
    domain === "hotmail.com" ||
    domain === "live.com" ||
    domain === "yahoo.com" ||
    domain === "icloud.com"
  ) {
    const plusIdx = local.indexOf("+");
    if (plusIdx !== -1) local = local.slice(0, plusIdx);
  }

  return {
    normalized: `${local}@${domain}`,
    domain,
  };
}

/**
 * Checks if email uses a disposable / temporary domain.
 */
export function isDisposableEmail(email: string): boolean {
  const { domain } = normalizeEmail(email);
  if (!domain) return true;
  if (DISPOSABLE_DOMAINS.has(domain)) return true;

  // Pattern check for disposable dynamic subdomains
  if (
    domain.includes("tempmail") ||
    domain.includes("temp-mail") ||
    domain.includes("throwaway") ||
    domain.includes("fakeinbox") ||
    domain.includes("disposable") ||
    domain.includes("guerrillamail")
  ) {
    return true;
  }

  return false;
}

export interface BonusEligibilityResult {
  eligible: boolean;
  reason:
    | "ELIGIBLE"
    | "ALREADY_CLAIMED"
    | "DISPOSABLE_EMAIL"
    | "DUPLICATE_EMAIL_ALIAS"
    | "DEVICE_LIMIT_EXCEEDED"
    | "IP_RATE_LIMITED"
    | "IP_MAX_CLAIMS_REACHED"
    | "SUSPICIOUS_REGISTRATION";
  details?: string;
}

/**
 * Server-side anti-abuse verification for new user Rs. 50 bonus eligibility.
 * Evaluates multiple signals: disposable domains, normalized email history,
 * device fingerprint uniqueness, and IP velocity.
 */
export async function isEligibleForSignupBonus(input: {
  userId?: number;
  email: string;
  clientIp?: string;
  deviceFingerprint?: string;
  userAgent?: string;
}): Promise<BonusEligibilityResult> {
  await ensureBonusSchema();

  const { normalized, domain } = normalizeEmail(input.email);

  // 1. Check for disposable temporary email
  if (isDisposableEmail(input.email)) {
    return {
      eligible: false,
      reason: "DISPOSABLE_EMAIL",
      details: `Disposable email domain ${domain} is not eligible for signup promotions.`,
    };
  }

  // 2. If userId is provided, check if this user already claimed
  if (input.userId) {
    const userClaim = await db.query(
      `SELECT id, status FROM vexo_signup_bonus_claims WHERE user_id = $1 LIMIT 1`,
      [input.userId]
    );
    if (userClaim.rows.length > 0) {
      return {
        eligible: false,
        reason: "ALREADY_CLAIMED",
        details: "Signup bonus has already been claimed by this user.",
      };
    }
  }

  // 3. Normalized email alias check (e.g., user+1@gmail.com vs user@gmail.com)
  const normClaim = await db.query(
    `SELECT id FROM vexo_signup_bonus_claims
     WHERE normalized_email = $1 AND status = 'CLAIMED'
     LIMIT 1`,
    [normalized]
  );
  if (normClaim.rows.length > 0) {
    return {
      eligible: false,
      reason: "DUPLICATE_EMAIL_ALIAS",
      details: "A promotional bonus has already been claimed using this email alias.",
    };
  }

  // 4. Device Fingerprint Check
  if (input.deviceFingerprint && input.deviceFingerprint.length >= 16) {
    const deviceClaims = await db.query(
      `SELECT id FROM vexo_signup_bonus_claims
       WHERE device_fingerprint = $1 AND status = 'CLAIMED'
       LIMIT 1`,
      [input.deviceFingerprint]
    );
    if (deviceClaims.rows.length > 0) {
      return {
        eligible: false,
        reason: "DEVICE_LIMIT_EXCEEDED",
        details: "Promotional bonus already claimed from this device.",
      };
    }
  }

  // 5. IP Address Velocity & Subnet Protection
  if (input.clientIp && input.clientIp !== "127.0.0.1" && input.clientIp !== "::1") {
    // Max 2 claims per IP per 24 hours (allows legitimate household sharing)
    const ipRecentClaims = await db.query(
      `SELECT COUNT(*) as count FROM vexo_signup_bonus_claims
       WHERE client_ip = $1 AND status = 'CLAIMED' AND created_at > NOW() - INTERVAL '24 hours'`,
      [input.clientIp]
    );
    const recentCount = Number(ipRecentClaims.rows[0]?.count || 0);
    if (recentCount >= 2) {
      return {
        eligible: false,
        reason: "IP_RATE_LIMITED",
        details: "Maximum promotional claims reached for this network connection today.",
      };
    }

    // Max 5 lifetime claims from the same IP (prevents perpetual proxy farming)
    const ipTotalClaims = await db.query(
      `SELECT COUNT(*) as count FROM vexo_signup_bonus_claims
       WHERE client_ip = $1 AND status = 'CLAIMED'`,
      [input.clientIp]
    );
    const totalCount = Number(ipTotalClaims.rows[0]?.count || 0);
    if (totalCount >= 5) {
      return {
        eligible: false,
        reason: "IP_MAX_CLAIMS_REACHED",
        details: "Lifetime promotional allocation exceeded for this network.",
      };
    }
  }

  return {
    eligible: true,
    reason: "ELIGIBLE",
  };
}

export interface SignupBonusProcessResult {
  granted: boolean;
  amount: number;
  message: string;
  reason: string;
}

/**
 * Idempotently evaluates, grants, and ledger-records the Rs. 50 Signup Bonus.
 * Wraps claim creation, wallet credit, and ledger recording in an atomic transaction
 * with row-level locking to prevent race-condition exploits.
 */
export async function processSignupBonus(input: {
  userId: number;
  email: string;
  clientIp?: string;
  deviceFingerprint?: string;
  userAgent?: string;
}): Promise<SignupBonusProcessResult> {
  await ensureBonusSchema();

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Check if a claim already exists for this user (concurrency lock)
    const existing = await client.query(
      `SELECT id, status, amount_pkr, reason
       FROM vexo_signup_bonus_claims
       WHERE user_id = $1
       FOR UPDATE`,
      [input.userId]
    );

    if (existing.rows.length > 0) {
      await client.query("COMMIT");
      const prev = existing.rows[0];
      const wasGranted = prev.status === "CLAIMED";
      return {
        granted: wasGranted,
        amount: wasGranted ? Number(prev.amount_pkr || 50) : 0,
        message: wasGranted
          ? "🎁 Welcome to VEXARO! Rs. 50 bonus credit has been added to your account. Use your bonus to place your first order. Bonus credit is promotional and cannot be withdrawn."
          : "Your account was created successfully. The new-user promotional bonus was not available for this account.",
        reason: prev.reason,
      };
    }

    const { normalized, domain } = normalizeEmail(input.email);
    const eligibility = await isEligibleForSignupBonus(input);

    const claimReference = `claim_${input.userId}_${crypto.randomBytes(8).toString("hex")}`;

    if (!eligibility.eligible) {
      // Record rejected claim for audit tracking
      await client.query(
        `INSERT INTO vexo_signup_bonus_claims
           (user_id, amount_pkr, status, reason, client_ip, device_fingerprint, user_agent, normalized_email, email_domain, claim_reference)
         VALUES ($1, 0, 'REJECTED', $2, $3, $4, $5, $6, $7, $8)`,
        [
          input.userId,
          eligibility.reason,
          input.clientIp || null,
          input.deviceFingerprint || null,
          input.userAgent || null,
          normalized,
          domain,
          claimReference,
        ]
      );

      await client.query("COMMIT");

      return {
        granted: false,
        amount: 0,
        message:
          "Your account was created successfully. The new-user promotional bonus was not available for this account.",
        reason: eligibility.reason,
      };
    }

    // ELIGIBLE: Grant Rs. 50 Promotional Credit
    const BONUS_AMOUNT_PKR = 50.0;

    const claimResult = await client.query(
      `INSERT INTO vexo_signup_bonus_claims
         (user_id, amount_pkr, status, reason, client_ip, device_fingerprint, user_agent, normalized_email, email_domain, claim_reference)
       VALUES ($1, $2, 'CLAIMED', 'ELIGIBLE', $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        input.userId,
        BONUS_AMOUNT_PKR,
        input.clientIp || null,
        input.deviceFingerprint || null,
        input.userAgent || null,
        normalized,
        domain,
        claimReference,
      ]
    );

    const claimId = claimResult.rows[0].id;

    // Ensure wallet exists, then credit bonus_balance_pkr
    await client.query(
      `INSERT INTO vexo_wallets (user_id, balance_pkr, bonus_balance_pkr)
       VALUES ($1, 0, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET bonus_balance_pkr = vexo_wallets.bonus_balance_pkr + EXCLUDED.bonus_balance_pkr,
                     updated_at = NOW()`,
      [input.userId, BONUS_AMOUNT_PKR]
    );

    // Ledger record in vexo_wallet_transactions
    await client.query(
      `INSERT INTO vexo_wallet_transactions
         (user_id, type, amount_pkr, reference_type, reference_id, description)
       VALUES ($1, 'Credit', $2, 'signup_bonus', $3, 'Welcome promotional bonus (Non-withdrawable credit)')
       ON CONFLICT (reference_type, reference_id) DO NOTHING`,
      [input.userId, BONUS_AMOUNT_PKR, claimId]
    );

    await client.query("COMMIT");

    return {
      granted: true,
      amount: BONUS_AMOUNT_PKR,
      message:
        "🎁 Welcome to VEXARO! Rs. 50 bonus credit has been added to your account. Use your bonus to place your first order. Bonus credit is promotional and cannot be withdrawn.",
      reason: "ELIGIBLE",
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("VEXO PROCESS SIGNUP BONUS ERROR:", error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Allows an authorized administrator to manually grant or top-up promotional bonus credit
 * to a user who missed it or was falsely flagged by anti-abuse filters.
 */
export async function grantAdminBonus(input: {
  userId: number;
  adminId: number;
  amountPkr?: number;
  reason?: string;
}): Promise<{
  success: boolean;
  amountPkr: number;
  newBonusBalance: number;
  message: string;
}> {
  await ensureBonusSchema();
  const amount = Number(input.amountPkr ?? 50.0);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
    throw new Error("Invalid bonus amount.");
  }
  const reasonText = (input.reason || "Manual bonus grant by admin").trim().slice(0, 80);

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const userRes = await client.query(
      `SELECT id, name, email FROM vexo_users WHERE id = $1 FOR UPDATE`,
      [input.userId]
    );
    if (!userRes.rows[0]) {
      await client.query("ROLLBACK");
      throw new Error("User not found.");
    }
    const user = userRes.rows[0];

    // Ensure wallet row exists and update bonus_balance_pkr
    await client.query(
      `INSERT INTO vexo_wallets (user_id, balance_pkr, bonus_balance_pkr)
       VALUES ($1, 0, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET bonus_balance_pkr = COALESCE(vexo_wallets.bonus_balance_pkr, 0) + EXCLUDED.bonus_balance_pkr,
                     updated_at = NOW()`,
      [input.userId, amount]
    );

    const walletRes = await client.query(
      `SELECT bonus_balance_pkr, balance_pkr FROM vexo_wallets WHERE user_id = $1 FOR UPDATE`,
      [input.userId]
    );
    const newBonusBalance = Number(walletRes.rows[0]?.bonus_balance_pkr ?? 0);

    const claimReference = `admin_${input.adminId || 1}_user_${input.userId}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

    // Upsert bonus claim record so user is registered as CLAIMED
    await client.query(
      `INSERT INTO vexo_signup_bonus_claims
         (user_id, amount_pkr, status, reason, claim_reference)
       VALUES ($1, $2, 'CLAIMED', 'ADMIN_MANUAL_GRANTED', $3)
        ON CONFLICT (user_id)
        DO UPDATE SET
          amount_pkr = COALESCE(vexo_signup_bonus_claims.amount_pkr, 0) + EXCLUDED.amount_pkr,
          status = 'CLAIMED',
          reason = 'ADMIN_MANUAL_GRANTED',
          claim_reference = EXCLUDED.claim_reference,
          updated_at = NOW()`,
      [input.userId, amount, claimReference]
    );

    // Ledger transaction record
    await client.query(
      `INSERT INTO vexo_wallet_transactions
         (user_id, type, amount_pkr, reference_type, reference_id, description)
       VALUES ($1, 'Credit', $2, 'admin_bonus', $3, $4)`,
      [input.userId, amount, claimReference, `Promotional bonus granted by admin: ${reasonText}`]
    );

    // Admin audit activity record (non-fatal if auxiliary table is missing)
    try {
      await client.query(
        `INSERT INTO vexo_admin_activity (admin_user_id, action, target_type, target_id, details)
         VALUES ($1, 'grant_bonus', 'user', $2, $3::jsonb)`,
        [
          input.adminId || 1,
          String(input.userId),
          JSON.stringify({
            amount,
            reason: reasonText,
            newBonusBalance,
            targetEmail: user.email,
          }),
        ]
      );
    } catch (actErr) {
      console.warn("VEXO: Non-fatal activity log failure:", actErr);
    }

    await client.query("COMMIT");

    return {
      success: true,
      amountPkr: amount,
      newBonusBalance,
      message: `Rs. ${amount.toLocaleString()} promotional bonus granted successfully to ${user.name || user.email}.`,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
