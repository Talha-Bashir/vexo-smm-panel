import crypto from "crypto";
import { db } from "@/lib/db";
import { ensureWalletSchema } from "@/lib/wallet";

let couponSchemaPromise: Promise<void> | null = null;

export async function ensureCouponSchema(): Promise<void> {
  if (!couponSchemaPromise) {
    couponSchemaPromise = (async () => {
      await ensureWalletSchema();

      await db.query(`
        CREATE TABLE IF NOT EXISTS vexo_coupons (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(50) UNIQUE NOT NULL,
          prize_pkr NUMERIC(14,2) NOT NULL CHECK (prize_pkr > 0),
          reward_type VARCHAR(20) NOT NULL DEFAULT 'bonus', -- 'bonus' or 'real'
          max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
          used_count INTEGER NOT NULL DEFAULT 0,
          per_user_limit INTEGER NOT NULL DEFAULT 1,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          is_welcome_only BOOLEAN NOT NULL DEFAULT FALSE,
          expires_at TIMESTAMPTZ DEFAULT NULL,
          description TEXT,
          created_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        ALTER TABLE vexo_coupons ADD COLUMN IF NOT EXISTS is_welcome_only BOOLEAN NOT NULL DEFAULT FALSE;

        CREATE UNIQUE INDEX IF NOT EXISTS vexo_coupons_code_upper_uidx
          ON vexo_coupons (UPPER(code));

        CREATE TABLE IF NOT EXISTS vexo_coupon_redemptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          coupon_id UUID NOT NULL REFERENCES vexo_coupons(id) ON DELETE CASCADE,
          coupon_code VARCHAR(50) NOT NULL,
          user_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
          prize_pkr NUMERIC(14,2) NOT NULL,
          reward_type VARCHAR(20) NOT NULL DEFAULT 'bonus',
          client_ip VARCHAR(64),
          device_fingerprint VARCHAR(128),
          user_agent TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS vexo_coupon_redemptions_coupon_user_idx
          ON vexo_coupon_redemptions(coupon_id, user_id);
        CREATE INDEX IF NOT EXISTS vexo_coupon_redemptions_user_created_idx
          ON vexo_coupon_redemptions(user_id, created_at DESC);

        -- Insert initial default welcome coupon if none exists
        INSERT INTO vexo_coupons (code, prize_pkr, reward_type, max_uses, per_user_limit, is_active, is_welcome_only, description)
        VALUES ('WELCOME50', 50.00, 'bonus', NULL, 1, TRUE, TRUE, 'Official welcome bonus coupon for new users')
        ON CONFLICT (UPPER(code)) DO UPDATE SET is_welcome_only = TRUE;
      `);
    })().catch((err) => {
      couponSchemaPromise = null;
      throw err;
    });
  }
  return couponSchemaPromise;
}

export interface CouponRecord {
  id: string;
  code: string;
  prize_pkr: number;
  reward_type: "bonus" | "real";
  max_uses: number | null;
  used_count: number;
  per_user_limit: number;
  is_active: boolean;
  is_welcome_only: boolean;
  expires_at: string | null;
  description: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface CouponRedemptionRecord {
  id: string;
  coupon_id: string;
  coupon_code: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  prize_pkr: number;
  reward_type: string;
  created_at: string;
}

/**
 * Creates a new coupon by admin.
 */
export async function createCoupon(input: {
  code: string;
  prizePkr: number;
  rewardType?: "bonus" | "real";
  maxUses?: number | null;
  perUserLimit?: number;
  isWelcomeOnly?: boolean;
  expiresAt?: string | null;
  description?: string;
  createdBy?: number;
}): Promise<CouponRecord> {
  await ensureCouponSchema();

  const cleanCode = String(input.code || "").trim().toUpperCase();
  if (!cleanCode || cleanCode.length < 3 || cleanCode.length > 50) {
    throw new Error("Coupon code must be between 3 and 50 characters.");
  }
  if (!/^[A-Z0-9_-]+$/.test(cleanCode)) {
    throw new Error("Coupon code can only contain letters, numbers, hyphens, and underscores.");
  }

  const prize = Number(input.prizePkr);
  if (!Number.isFinite(prize) || prize <= 0 || prize > 100000) {
    throw new Error("Prize amount must be a positive number up to ₨100,000.");
  }

  const rewardType = input.rewardType === "real" ? "real" : "bonus";
  const maxUses = input.maxUses ? Math.max(1, Math.floor(Number(input.maxUses))) : null;
  const perUserLimit = Math.max(1, Math.floor(Number(input.perUserLimit || 1)));
  const isWelcomeOnly =
    input.isWelcomeOnly !== undefined
      ? Boolean(input.isWelcomeOnly)
      : cleanCode.startsWith("WELCOME");
  const expiresAt = input.expiresAt ? new Date(input.expiresAt).toISOString() : null;
  const description = String(input.description || "").trim() || null;

  const result = await db.query(
    `INSERT INTO vexo_coupons
       (code, prize_pkr, reward_type, max_uses, per_user_limit, is_welcome_only, expires_at, description, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      cleanCode,
      prize,
      rewardType,
      maxUses,
      perUserLimit,
      isWelcomeOnly,
      expiresAt,
      description,
      input.createdBy || null,
    ]
  );

  const row = result.rows[0];
  return {
    ...row,
    prize_pkr: Number(row.prize_pkr),
    is_welcome_only: Boolean(row.is_welcome_only),
  };
}

/**
 * Updates an existing coupon (toggle active, change prize/limit, etc.)
 */
export async function updateCoupon(
  id: string,
  updates: {
    isActive?: boolean;
    prizePkr?: number;
    maxUses?: number | null;
    perUserLimit?: number;
    isWelcomeOnly?: boolean;
    expiresAt?: string | null;
    description?: string;
  }
): Promise<CouponRecord> {
  await ensureCouponSchema();

  const setClauses: string[] = ["updated_at = NOW()"];
  const values: unknown[] = [id];
  let paramIdx = 2;

  if (updates.isActive !== undefined) {
    setClauses.push(`is_active = $${paramIdx++}`);
    values.push(Boolean(updates.isActive));
  }

  if (updates.prizePkr !== undefined) {
    const p = Number(updates.prizePkr);
    if (!Number.isFinite(p) || p <= 0) throw new Error("Invalid prize amount.");
    setClauses.push(`prize_pkr = $${paramIdx++}`);
    values.push(p);
  }

  if (updates.maxUses !== undefined) {
    const mu = updates.maxUses ? Math.max(1, Math.floor(Number(updates.maxUses))) : null;
    setClauses.push(`max_uses = $${paramIdx++}`);
    values.push(mu);
  }

  if (updates.perUserLimit !== undefined) {
    const pul = Math.max(1, Math.floor(Number(updates.perUserLimit)));
    setClauses.push(`per_user_limit = $${paramIdx++}`);
    values.push(pul);
  }

  if (updates.expiresAt !== undefined) {
    const exp = updates.expiresAt ? new Date(updates.expiresAt).toISOString() : null;
    setClauses.push(`expires_at = $${paramIdx++}`);
    values.push(exp);
  }

  if (updates.description !== undefined) {
    setClauses.push(`description = $${paramIdx++}`);
    values.push(String(updates.description || "").trim() || null);
  }

  if (updates.isWelcomeOnly !== undefined) {
    setClauses.push(`is_welcome_only = $${paramIdx++}`);
    values.push(Boolean(updates.isWelcomeOnly));
  }

  const res = await db.query(
    `UPDATE vexo_coupons
     SET ${setClauses.join(", ")}
     WHERE id = $1
     RETURNING *`,
    values
  );

  if (!res.rows[0]) throw new Error("Coupon not found.");
  const row = res.rows[0];
  return {
    ...row,
    prize_pkr: Number(row.prize_pkr),
    is_welcome_only: Boolean(row.is_welcome_only),
  };
}

/**
 * Deletes a coupon.
 */
export async function deleteCoupon(id: string): Promise<boolean> {
  await ensureCouponSchema();
  const res = await db.query(`DELETE FROM vexo_coupons WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}

/**
 * Lists all coupons and redemption stats for admin panel.
 */
export async function listCoupons(): Promise<{
  coupons: CouponRecord[];
  recentRedemptions: CouponRedemptionRecord[];
  stats: {
    totalCoupons: number;
    activeCoupons: number;
    totalRedemptions: number;
    totalPrizeAwardedPkr: number;
  };
}> {
  await ensureCouponSchema();

  const [couponsRes, redemptionsRes, statsRes] = await Promise.all([
    db.query(`
      SELECT *
      FROM vexo_coupons
      ORDER BY created_at DESC
    `),
    db.query(`
      SELECT r.id, r.coupon_id, r.coupon_code, r.user_id, r.prize_pkr, r.reward_type, r.created_at,
             u.name AS user_name, u.email AS user_email
      FROM vexo_coupon_redemptions r
      LEFT JOIN vexo_users u ON u.id = r.user_id
      ORDER BY r.created_at DESC
      LIMIT 100
    `),
    db.query(`
      SELECT
        COUNT(*) AS total_coupons,
        COUNT(*) FILTER (WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())) AS active_coupons,
        COALESCE(SUM(used_count), 0) AS total_redemptions
      FROM vexo_coupons
    `),
  ]);

  const totalPrizeRes = await db.query(`
    SELECT COALESCE(SUM(prize_pkr), 0) AS total_prize
    FROM vexo_coupon_redemptions
  `);

  return {
    coupons: couponsRes.rows.map((row) => ({
      ...row,
      prize_pkr: Number(row.prize_pkr),
      used_count: Number(row.used_count || 0),
      max_uses: row.max_uses ? Number(row.max_uses) : null,
      per_user_limit: Number(row.per_user_limit || 1),
    })),
    recentRedemptions: redemptionsRes.rows.map((r) => ({
      id: r.id,
      coupon_id: r.coupon_id,
      coupon_code: r.coupon_code,
      user_id: r.user_id,
      user_name: r.user_name || "Unknown",
      user_email: r.user_email || "Unknown",
      prize_pkr: Number(r.prize_pkr),
      reward_type: r.reward_type,
      created_at: r.created_at,
    })),
    stats: {
      totalCoupons: Number(statsRes.rows[0]?.total_coupons || 0),
      activeCoupons: Number(statsRes.rows[0]?.active_coupons || 0),
      totalRedemptions: Number(statsRes.rows[0]?.total_redemptions || 0),
      totalPrizeAwardedPkr: Number(totalPrizeRes.rows[0]?.total_prize || 0),
    },
  };
}

export interface RedeemCouponResult {
  success: boolean;
  code: string;
  prizePkr: number;
  rewardType: "bonus" | "real";
  message: string;
  newBalancePkr?: number;
  newBonusBalancePkr?: number;
}

/**
 * Atomically validates and redeems a coupon for a specific user.
 */
export async function redeemCoupon(input: {
  code: string;
  userId: number;
  clientIp?: string;
  deviceFingerprint?: string;
  userAgent?: string;
}): Promise<RedeemCouponResult> {
  await ensureCouponSchema();

  const cleanCode = String(input.code || "").trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("Please enter a valid coupon code.");
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // 1. Lock the coupon row for atomic update
    const couponRes = await client.query(
      `SELECT *
       FROM vexo_coupons
       WHERE UPPER(code) = $1
       FOR UPDATE`,
      [cleanCode]
    );

    if (!couponRes.rows[0]) {
      await client.query("ROLLBACK");
      throw new Error(`Coupon "${cleanCode}" is invalid or does not exist.`);
    }

    const coupon = couponRes.rows[0];

    // 2. Check if active
    if (!coupon.is_active) {
      await client.query("ROLLBACK");
      throw new Error(`Coupon "${cleanCode}" is currently inactive or disabled.`);
    }

    // 3. Check expiration
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      await client.query("ROLLBACK");
      throw new Error(`Coupon "${cleanCode}" has expired.`);
    }

    // 4. Check total max uses
    if (coupon.max_uses !== null && Number(coupon.used_count) >= Number(coupon.max_uses)) {
      await client.query("ROLLBACK");
      throw new Error(`Coupon "${cleanCode}" has reached its maximum total redemptions.`);
    }

    // 5. Check per-user limit
    const userClaimsRes = await client.query(
      `SELECT COUNT(*) as count
       FROM vexo_coupon_redemptions
       WHERE coupon_id = $1 AND user_id = $2`,
      [coupon.id, input.userId]
    );

    const userClaimCount = Number(userClaimsRes.rows[0]?.count || 0);
    const perUserLimit = Number(coupon.per_user_limit || 1);

    if (userClaimCount >= perUserLimit) {
      await client.query("ROLLBACK");
      throw new Error(
        perUserLimit === 1
          ? `You have already redeemed coupon "${cleanCode}". Each user can only redeem it once.`
          : `You have reached the maximum redemption limit (${perUserLimit}) for this coupon.`
      );
    }

    // 5b. STRICT RULE: ONLY NEW USERS CAN GET WELCOME BONUS!
    // If user already claimed a signup bonus, they CANNOT redeem a welcome bonus coupon.
    const isWelcomeCoupon = Boolean(
      coupon.is_welcome_only ||
      cleanCode.startsWith("WELCOME") ||
      cleanCode.includes("SIGNUP")
    );

    if (isWelcomeCoupon) {
      // 1. Check if user already claimed the previous signup bonus in vexo_signup_bonus_claims
      const priorBonusClaim = await client.query(
        `SELECT id, status, reason FROM vexo_signup_bonus_claims
         WHERE user_id = $1 AND status = 'CLAIMED'
         LIMIT 1`,
        [input.userId]
      );
      if (priorBonusClaim.rows.length > 0) {
        await client.query("ROLLBACK");
        throw new Error(
          "This welcome bonus coupon is strictly for new accounts. You have already claimed your signup welcome bonus."
        );
      }

      // 2. Check if user already redeemed any welcome coupon before
      const priorWelcomeCoupon = await client.query(
        `SELECT r.id FROM vexo_coupon_redemptions r
         JOIN vexo_coupons c ON c.id = r.coupon_id
         WHERE r.user_id = $1 AND (c.is_welcome_only = TRUE OR UPPER(r.coupon_code) LIKE 'WELCOME%')
         LIMIT 1`,
        [input.userId]
      );
      if (priorWelcomeCoupon.rows.length > 0) {
        await client.query("ROLLBACK");
        throw new Error(
          "Welcome promotional bonus has already been claimed on this account."
        );
      }
    }

    const prizePkr = Number(coupon.prize_pkr);
    const rewardType = (coupon.reward_type === "real" ? "real" : "bonus") as "bonus" | "real";

    // 6. Increment coupon used_count
    await client.query(
      `UPDATE vexo_coupons
       SET used_count = used_count + 1, updated_at = NOW()
       WHERE id = $1`,
      [coupon.id]
    );

    // 7. Record redemption in vexo_coupon_redemptions
    const redemptionRes = await client.query(
      `INSERT INTO vexo_coupon_redemptions
         (coupon_id, coupon_code, user_id, prize_pkr, reward_type, client_ip, device_fingerprint, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        coupon.id,
        cleanCode,
        input.userId,
        prizePkr,
        rewardType,
        input.clientIp || null,
        input.deviceFingerprint || null,
        input.userAgent || null,
      ]
    );
    const redemptionId = redemptionRes.rows[0].id;

    // 7b. If this was a welcome coupon, lock the user in vexo_signup_bonus_claims so they can never claim again
    if (isWelcomeCoupon) {
      await client.query(
        `INSERT INTO vexo_signup_bonus_claims
           (user_id, amount_pkr, status, reason, client_ip, device_fingerprint, user_agent, claim_reference)
         VALUES ($1, $2, 'CLAIMED', 'COUPON_WELCOME_REDEEMED', $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET
           status = 'CLAIMED',
           reason = 'COUPON_WELCOME_REDEEMED',
           amount_pkr = EXCLUDED.amount_pkr,
           updated_at = NOW()`,
        [
          input.userId,
          prizePkr,
          input.clientIp || null,
          input.deviceFingerprint || null,
          input.userAgent || null,
          `welcome_coupon_${cleanCode}_${Date.now()}`,
        ]
      );
    }

    // 8. Credit user wallet
    if (rewardType === "real") {
      await client.query(
        `INSERT INTO vexo_wallets (user_id, balance_pkr, bonus_balance_pkr)
         VALUES ($1, $2, 0)
         ON CONFLICT (user_id)
         DO UPDATE SET balance_pkr = vexo_wallets.balance_pkr + EXCLUDED.balance_pkr,
                       updated_at = NOW()`,
        [input.userId, prizePkr]
      );
    } else {
      await client.query(
        `INSERT INTO vexo_wallets (user_id, balance_pkr, bonus_balance_pkr)
         VALUES ($1, 0, $2)
         ON CONFLICT (user_id)
         DO UPDATE SET bonus_balance_pkr = vexo_wallets.bonus_balance_pkr + EXCLUDED.bonus_balance_pkr,
                       updated_at = NOW()`,
        [input.userId, prizePkr]
      );
    }

    // 9. Ledger transaction
    await client.query(
      `INSERT INTO vexo_wallet_transactions
         (user_id, type, amount_pkr, reference_type, reference_id, description)
       VALUES ($1, 'Credit', $2, 'coupon', $3, $4)`,
      [
        input.userId,
        prizePkr,
        redemptionId,
        `Coupon prize redeemed: ${cleanCode} (${rewardType === "real" ? "Real cash" : "Bonus credit"})`,
      ]
    );

    // 10. Fetch updated wallet
    const walletRes = await client.query(
      `SELECT balance_pkr, bonus_balance_pkr FROM vexo_wallets WHERE user_id = $1`,
      [input.userId]
    );

    await client.query("COMMIT");

    const newBalancePkr = Number(walletRes.rows[0]?.balance_pkr || 0);
    const newBonusBalancePkr = Number(walletRes.rows[0]?.bonus_balance_pkr || 0);

    return {
      success: true,
      code: cleanCode,
      prizePkr,
      rewardType,
      message: `🎉 Coupon "${cleanCode}" successfully redeemed! ₨${prizePkr.toLocaleString()} ${
        rewardType === "real" ? "real balance" : "promotional bonus credit"
      } has been added to your wallet!`,
      newBalancePkr,
      newBonusBalancePkr,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
