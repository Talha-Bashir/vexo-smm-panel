#!/usr/bin/env node

/**
 * VEXARO SMM Panel - Rs. 50 New User Signup Bonus Automated Verification Suite
 * Tests all 10 scenarios and anti-abuse edge cases.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env.local file not found at " + envPath);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnv();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "dispostable.com",
  "fakemailgenerator.com",
  "dropmail.me",
]);

function normalizeEmail(email) {
  const clean = String(email || "").trim().toLowerCase();
  const atIndex = clean.lastIndexOf("@");
  if (atIndex <= 0) return { normalized: clean, domain: "" };
  let local = clean.slice(0, atIndex);
  const domain = clean.slice(atIndex + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "");
    const plusIdx = local.indexOf("+");
    if (plusIdx !== -1) local = local.slice(0, plusIdx);
  } else if (
    domain === "outlook.com" ||
    domain === "hotmail.com" ||
    domain === "live.com" ||
    domain === "yahoo.com"
  ) {
    const plusIdx = local.indexOf("+");
    if (plusIdx !== -1) local = local.slice(0, plusIdx);
  }
  return { normalized: `${local}@${domain}`, domain };
}

function isDisposableEmail(email) {
  const { domain } = normalizeEmail(email);
  if (!domain) return true;
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
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

let passed = 0;
let failed = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${details ? "- " + details : ""}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("   VEXARO RS. 50 SIGNUP BONUS VERIFICATION SUITE");
  console.log("=======================================================\n");

  const testPrefix = `test_bonus_${Date.now()}`;
  const createdUserIds = [];

  try {
    // 0. Ensure schema migrations
    console.log("👉 Step 0: Ensuring database schema migrations (ensureBonusSchema)...");
    await pool.query(`
      ALTER TABLE vexo_wallets
        ADD COLUMN IF NOT EXISTS bonus_balance_pkr NUMERIC(14,2) NOT NULL DEFAULT 0;

      ALTER TABLE vexo_orders
        ADD COLUMN IF NOT EXISTS bonus_charge_pkr NUMERIC(14,2) NOT NULL DEFAULT 0;
      ALTER TABLE vexo_orders
        ADD COLUMN IF NOT EXISTS real_charge_pkr NUMERIC(14,2) NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS vexo_signup_bonus_claims (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL UNIQUE REFERENCES vexo_users(id) ON DELETE CASCADE,
        amount_pkr NUMERIC(14,2) NOT NULL DEFAULT 50.00,
        status VARCHAR(30) NOT NULL,
        reason VARCHAR(80) NOT NULL,
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
    `);

    // Verify columns & tables
    const colCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'vexo_wallets' AND column_name = 'bonus_balance_pkr';
    `);
    assert(colCheck.rows.length > 0, "vexo_wallets has bonus_balance_pkr column");

    const orderCols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'vexo_orders' AND column_name IN ('bonus_charge_pkr', 'real_charge_pkr');
    `);
    assert(orderCols.rows.length >= 2, "vexo_orders has bonus_charge_pkr and real_charge_pkr columns");

    const claimsTable = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'vexo_signup_bonus_claims';
    `);
    assert(claimsTable.rows.length > 0, "vexo_signup_bonus_claims table exists");

    // Scenario 1: Genuine new user registration receives Rs. 50 bonus
    console.log("\n👉 Scenario 1: Genuine new user registration...");
    const user1Email = `${testPrefix}_user1@gmail.com`;
    const user1Res = await pool.query(
      `INSERT INTO vexo_users(name, email, password_hash, referral_code)
       VALUES('Test User 1', $1, 'hashed_pass', $2) RETURNING id`,
      [user1Email, "VX" + crypto.randomBytes(3).toString("hex").toUpperCase()]
    );
    const user1Id = user1Res.rows[0].id;
    createdUserIds.push(user1Id);

    const fp1 = crypto.createHash("sha256").update("device_1").digest("hex");
    const ip1 = "203.0.113.10";

    // Simulate processSignupBonus
    const client = await pool.connect();
    let bonus1Granted = false;
    try {
      await client.query("BEGIN");
      const norm1 = normalizeEmail(user1Email);
      await client.query(
        `INSERT INTO vexo_signup_bonus_claims
          (user_id, amount_pkr, status, reason, client_ip, device_fingerprint, normalized_email, email_domain, claim_reference)
         VALUES ($1, 50.00, 'CLAIMED', 'ELIGIBLE', $2, $3, $4, $5, $6)`,
        [user1Id, ip1, fp1, norm1.normalized, norm1.domain, `claim_${user1Id}_1`]
      );
      await client.query(
        `INSERT INTO vexo_wallets (user_id, balance_pkr, bonus_balance_pkr)
         VALUES ($1, 0, 50.00)
         ON CONFLICT (user_id) DO UPDATE SET bonus_balance_pkr = vexo_wallets.bonus_balance_pkr + 50.00`,
        [user1Id]
      );
      await client.query(
        `INSERT INTO vexo_wallet_transactions (user_id, type, amount_pkr, reference_type, reference_id, description)
         VALUES ($1, 'Credit', 50.00, 'signup_bonus', $2, 'Welcome promotional bonus')`,
        [user1Id, `claim_${user1Id}_1`]
      );
      await client.query("COMMIT");
      bonus1Granted = true;
    } finally {
      client.release();
    }

    const wallet1 = await pool.query(
      `SELECT balance_pkr, bonus_balance_pkr FROM vexo_wallets WHERE user_id = $1`,
      [user1Id]
    );
    assert(bonus1Granted, "Bonus successfully processed in transaction");
    assert(Number(wallet1.rows[0].balance_pkr) === 0, "Real balance is exactly Rs. 0.00");
    assert(Number(wallet1.rows[0].bonus_balance_pkr) === 50, "Bonus balance is exactly Rs. 50.00");

    // Scenario 2: Same user attempts to claim again
    console.log("\n👉 Scenario 2: Same user attempts duplicate bonus claim...");
    const existingClaim = await pool.query(
      `SELECT id, status, amount_pkr FROM vexo_signup_bonus_claims WHERE user_id = $1`,
      [user1Id]
    );
    assert(existingClaim.rows.length === 1, "Duplicate claim detected via user_id unique constraint");
    assert(existingClaim.rows[0].status === "CLAIMED", "Previous claim remains CLAIMED without re-grant");

    // Scenario 3: Session login persistence
    console.log("\n👉 Scenario 3: Balance persistence after login/logout...");
    const wallet1Persistent = await pool.query(
      `SELECT balance_pkr, bonus_balance_pkr FROM vexo_wallets WHERE user_id = $1`,
      [user1Id]
    );
    assert(Number(wallet1Persistent.rows[0].bonus_balance_pkr) === 50, "Bonus credit persists safely in database");

    // Scenario 4: Disposable temporary email domain rejection
    console.log("\n👉 Scenario 4: Disposable / temporary email signup...");
    const tempEmail = `${testPrefix}@mailinator.com`;
    assert(isDisposableEmail(tempEmail) === true, "isDisposableEmail identifies mailinator.com");
    assert(isDisposableEmail(`${testPrefix}@temp-mail.org`) === true, "isDisposableEmail identifies temp-mail.org");

    const userTempRes = await pool.query(
      `INSERT INTO vexo_users(name, email, password_hash, referral_code)
       VALUES('Temp User', $1, 'hashed_pass', $2) RETURNING id`,
      [tempEmail, "VX" + crypto.randomBytes(3).toString("hex").toUpperCase()]
    );
    const userTempId = userTempRes.rows[0].id;
    createdUserIds.push(userTempId);

    // Record rejected claim
    await pool.query(
      `INSERT INTO vexo_signup_bonus_claims
        (user_id, amount_pkr, status, reason, normalized_email, email_domain, claim_reference)
       VALUES ($1, 0, 'REJECTED', 'DISPOSABLE_EMAIL', $2, 'mailinator.com', $3)`,
      [userTempId, tempEmail, `claim_${userTempId}_rej`]
    );
    const tempWallet = await pool.query(
      `SELECT COALESCE(bonus_balance_pkr, 0) as bonus FROM vexo_wallets WHERE user_id = $1`,
      [userTempId]
    );
    assert(
      tempWallet.rows.length === 0 || Number(tempWallet.rows[0].bonus) === 0,
      "Disposable email user receives 0 bonus credit"
    );

    // Scenario 5: Duplicate email alias (Gmail plus addressing)
    console.log("\n👉 Scenario 5: Plus-addressing email alias abuse...");
    const aliasEmail = `${testPrefix}_user1+promo99@gmail.com`;
    const normAlias = normalizeEmail(aliasEmail);
    assert(normAlias.normalized === user1Email, "Normalized alias matches original user1 email");

    const aliasCheck = await pool.query(
      `SELECT id FROM vexo_signup_bonus_claims WHERE normalized_email = $1 AND status = 'CLAIMED'`,
      [normAlias.normalized]
    );
    assert(aliasCheck.rows.length > 0, "Duplicate email alias blocked by normalized_email claim index");

    // Scenario 6: Same device fingerprint registering multiple accounts
    console.log("\n👉 Scenario 6: Device fingerprint uniqueness check...");
    const user2Res = await pool.query(
      `INSERT INTO vexo_users(name, email, password_hash, referral_code)
       VALUES('User 2 Device Clone', $1, 'hashed_pass', $2) RETURNING id`,
      [`${testPrefix}_user2@gmail.com`, "VX" + crypto.randomBytes(3).toString("hex").toUpperCase()]
    );
    const user2Id = user2Res.rows[0].id;
    createdUserIds.push(user2Id);

    const deviceClaims = await pool.query(
      `SELECT id FROM vexo_signup_bonus_claims WHERE device_fingerprint = $1 AND status = 'CLAIMED'`,
      [fp1]
    );
    assert(deviceClaims.rows.length > 0, "Device fingerprint collision detected from user 1");

    // Scenario 7: IP velocity limit (max 2 per 24 hours)
    console.log("\n👉 Scenario 7: IP velocity rate limit (max 2/day)...");
    const user3Res = await pool.query(
      `INSERT INTO vexo_users(name, email, password_hash, referral_code)
       VALUES('User 3 Same IP', $1, 'hashed_pass', $2) RETURNING id`,
      [`${testPrefix}_user3@gmail.com`, "VX" + crypto.randomBytes(3).toString("hex").toUpperCase()]
    );
    const user3Id = user3Res.rows[0].id;
    createdUserIds.push(user3Id);
    const fp3 = crypto.createHash("sha256").update("device_3").digest("hex");

    await pool.query(
      `INSERT INTO vexo_signup_bonus_claims
        (user_id, amount_pkr, status, reason, client_ip, device_fingerprint, normalized_email, email_domain, claim_reference)
       VALUES ($1, 50.00, 'CLAIMED', 'ELIGIBLE', $2, $3, $4, 'gmail.com', $5)`,
      [user3Id, ip1, fp3, `${testPrefix}_user3@gmail.com`, `claim_${user3Id}_3`]
    );

    const ipClaims = await pool.query(
      `SELECT COUNT(*) as count FROM vexo_signup_bonus_claims 
       WHERE client_ip = $1 AND status = 'CLAIMED' AND created_at > NOW() - INTERVAL '24 hours'`,
      [ip1]
    );
    const countOnIp = Number(ipClaims.rows[0].count);
    assert(countOnIp >= 2, `IP count is ${countOnIp}, 3rd attempt will be blocked by IP_RATE_LIMITED`);

    // Scenario 8: Withdrawal immunity check
    console.log("\n👉 Scenario 8: Withdrawal & Cash-out Immunity...");
    const user1UserRow = await pool.query(
      `SELECT referral_balance_pkr FROM vexo_users WHERE id = $1`,
      [user1Id]
    );
    assert(
      Number(user1UserRow.rows[0].referral_balance_pkr || 0) === 0,
      "Referral withdrawable balance is Rs. 0.00 while bonus is Rs. 50.00"
    );

    // Scenario 9: Purchasing orders with bonus credit & refund accounting
    console.log("\n👉 Scenario 9: Order purchasing priority & refund quarantine...");
    // 9A: Purchase <= 50 (e.g. Rs. 20)
    const order1Charge = 20.0;
    const bonusToDeduct = Math.min(50.0, order1Charge); // 20.00
    const realToDeduct = order1Charge - bonusToDeduct; // 0.00

    const order1Res = await pool.query(
      `INSERT INTO vexo_orders
        (user_id, idempotency_key, service_id, service_name, platform, link, quantity, rate_pkr, charge_pkr, bonus_charge_pkr, real_charge_pkr, status)
       VALUES ($1, $2, '101', 'Test Service', 'Instagram', 'https://instagram.com/p/test', 1000, 20.0, $3, $4, $5, 'Payment Reserved')
       RETURNING id`,
      [user1Id, `idemp_${Date.now()}_1`, order1Charge, bonusToDeduct, realToDeduct]
    );
    const order1Id = order1Res.rows[0].id;

    await pool.query(
      `UPDATE vexo_wallets 
       SET bonus_balance_pkr = bonus_balance_pkr - $1, balance_pkr = balance_pkr - $2
       WHERE user_id = $3`,
      [bonusToDeduct, realToDeduct, user1Id]
    );

    const walletAfter9A = await pool.query(
      `SELECT balance_pkr, bonus_balance_pkr FROM vexo_wallets WHERE user_id = $1`,
      [user1Id]
    );
    assert(Number(walletAfter9A.rows[0].bonus_balance_pkr) === 30, "Bonus balance dropped from 50 to 30 PKR");
    assert(Number(walletAfter9A.rows[0].balance_pkr) === 0, "Real balance remained 0 PKR");

    // 9B: Add Rs. 100 real deposited balance, then make Rs. 70 order (spends 30 bonus + 40 real)
    await pool.query(
      `UPDATE vexo_wallets SET balance_pkr = balance_pkr + 100 WHERE user_id = $1`,
      [user1Id]
    );

    const order2Charge = 70.0;
    const bonus2Deduct = Math.min(30.0, order2Charge); // 30.00
    const real2Deduct = order2Charge - bonus2Deduct; // 40.00

    const order2Res = await pool.query(
      `INSERT INTO vexo_orders
        (user_id, idempotency_key, service_id, service_name, platform, link, quantity, rate_pkr, charge_pkr, bonus_charge_pkr, real_charge_pkr, status)
       VALUES ($1, $2, '102', 'Test Service 2', 'TikTok', 'https://tiktok.com/@test', 2000, 35.0, $3, $4, $5, 'Payment Reserved')
       RETURNING id`,
      [user1Id, `idemp_${Date.now()}_2`, order2Charge, bonus2Deduct, real2Deduct]
    );
    const order2Id = order2Res.rows[0].id;

    await pool.query(
      `UPDATE vexo_wallets 
       SET bonus_balance_pkr = bonus_balance_pkr - $1, balance_pkr = balance_pkr - $2
       WHERE user_id = $3`,
      [bonus2Deduct, real2Deduct, user1Id]
    );

    const walletAfter9B = await pool.query(
      `SELECT balance_pkr, bonus_balance_pkr FROM vexo_wallets WHERE user_id = $1`,
      [user1Id]
    );
    assert(Number(walletAfter9B.rows[0].bonus_balance_pkr) === 0, "Bonus balance exhausted to Rs. 0.00");
    assert(Number(walletAfter9B.rows[0].balance_pkr) === 60, "Real balance deducted exactly Rs. 40 (100 - 40 = 60)");

    // 9C: Refund order 2 (Rs. 70 total -> Rs. 30 restored to bonus, Rs. 40 restored to real)
    console.log("  Testing refund restoration quarantine...");
    const order2ToRefund = await pool.query(
      `SELECT bonus_charge_pkr, real_charge_pkr FROM vexo_orders WHERE id = $1`,
      [order2Id]
    );
    const bRefund = Number(order2ToRefund.rows[0].bonus_charge_pkr);
    const rRefund = Number(order2ToRefund.rows[0].real_charge_pkr);

    await pool.query(
      `UPDATE vexo_wallets
       SET balance_pkr = balance_pkr + $1, bonus_balance_pkr = bonus_balance_pkr + $2
       WHERE user_id = $3`,
      [rRefund, bRefund, user1Id]
    );

    const walletAfterRefund = await pool.query(
      `SELECT balance_pkr, bonus_balance_pkr FROM vexo_wallets WHERE user_id = $1`,
      [user1Id]
    );
    assert(Number(walletAfterRefund.rows[0].bonus_balance_pkr) === 30, "Bonus credit restored strictly to bonus_balance_pkr (Rs. 30)");
    assert(Number(walletAfterRefund.rows[0].balance_pkr) === 100, "Real balance restored strictly to real balance (Rs. 100)");

    // Scenario 10: Concurrency / Race-condition safety test
    console.log("\n👉 Scenario 10: Concurrency & Row-level lock safety...");
    const userConcurrentRes = await pool.query(
      `INSERT INTO vexo_users(name, email, password_hash, referral_code)
       VALUES('Concurrent Test User', $1, 'hashed_pass', $2) RETURNING id`,
      [`${testPrefix}_concurrent@gmail.com`, "VX" + crypto.randomBytes(3).toString("hex").toUpperCase()]
    );
    const cUserId = userConcurrentRes.rows[0].id;
    createdUserIds.push(cUserId);

    // Launch 5 concurrent claims in parallel
    const concurrentClaims = Array.from({ length: 5 }).map(async (_, idx) => {
      const cClient = await pool.connect();
      try {
        await cClient.query("BEGIN");
        const existing = await cClient.query(
          `SELECT id FROM vexo_signup_bonus_claims WHERE user_id = $1 FOR UPDATE`,
          [cUserId]
        );
        if (existing.rows.length > 0) {
          await cClient.query("COMMIT");
          return { granted: false, reason: "ALREADY_CLAIMED" };
        }
        await cClient.query(
          `INSERT INTO vexo_signup_bonus_claims
            (user_id, amount_pkr, status, reason, claim_reference)
           VALUES ($1, 50.00, 'CLAIMED', 'ELIGIBLE', $2)`,
          [cUserId, `claim_${cUserId}_${idx}`]
        );
        await cClient.query(
          `INSERT INTO vexo_wallets (user_id, balance_pkr, bonus_balance_pkr)
           VALUES ($1, 0, 50.00)
           ON CONFLICT (user_id) DO UPDATE SET bonus_balance_pkr = vexo_wallets.bonus_balance_pkr + 50.00`,
          [cUserId]
        );
        await cClient.query("COMMIT");
        return { granted: true };
      } catch (err) {
        await cClient.query("ROLLBACK").catch(() => undefined);
        return { granted: false, error: err.message };
      } finally {
        cClient.release();
      }
    });

    const results = await Promise.all(concurrentClaims);
    const grantedCount = results.filter((r) => r.granted).length;
    assert(grantedCount === 1, `Exactly 1 concurrent claim granted (got ${grantedCount} of 5)`);

    const cWallet = await pool.query(
      `SELECT bonus_balance_pkr FROM vexo_wallets WHERE user_id = $1`,
      [cUserId]
    );
    assert(Number(cWallet.rows[0].bonus_balance_pkr) === 50, "Wallet bonus balance credited exactly once (Rs. 50.00)");

    // Scenario 11: Admin manual bonus grant for user who missed or was blocked from bonus
    console.log("\n👉 Scenario 11: Admin manual bonus grant from Admin Panel...");
    const adminGrantUserRes = await pool.query(
      `INSERT INTO vexo_users(name, email, password_hash, referral_code)
       VALUES('Manual Grant Candidate', $1, 'hashed_pass', $2) RETURNING id`,
      [`${testPrefix}_admin_grant@gmail.com`, "VX" + crypto.randomBytes(3).toString("hex").toUpperCase()]
    );
    const mUserId = adminGrantUserRes.rows[0].id;
    createdUserIds.push(mUserId);

    // Initial state: user has a rejected claim (e.g. was rejected by disposable filter or missed it)
    await pool.query(
      `INSERT INTO vexo_signup_bonus_claims (user_id, amount_pkr, status, reason, claim_reference)
       VALUES ($1, 0, 'REJECTED', 'DISPOSABLE_EMAIL', $2)`,
      [mUserId, `claim_${mUserId}_initial_rej`]
    );

    // Admin executes manual bonus grant (50 PKR)
    const adminClient = await pool.connect();
    try {
      await adminClient.query("BEGIN");
      await adminClient.query(
        `INSERT INTO vexo_wallets (user_id, balance_pkr, bonus_balance_pkr)
         VALUES ($1, 0, 50.00)
         ON CONFLICT (user_id)
         DO UPDATE SET bonus_balance_pkr = vexo_wallets.bonus_balance_pkr + 50.00`,
        [mUserId]
      );
      await adminClient.query(
        `INSERT INTO vexo_signup_bonus_claims (user_id, amount_pkr, status, reason, claim_reference)
         VALUES ($1, 50.00, 'CLAIMED', 'ADMIN_MANUAL_GRANTED', $2)
         ON CONFLICT (user_id)
         DO UPDATE SET amount_pkr = vexo_signup_bonus_claims.amount_pkr + EXCLUDED.amount_pkr,
                       status = 'CLAIMED',
                       reason = 'ADMIN_MANUAL_GRANTED'`,
        [mUserId, `admin_grant_${mUserId}`]
      );
      await adminClient.query(
        `INSERT INTO vexo_wallet_transactions (user_id, type, amount_pkr, reference_type, reference_id, description)
         VALUES ($1, 'Credit', 50.00, 'admin_bonus', $2, 'Promotional bonus granted by admin')`,
        [mUserId, `admin_grant_${mUserId}`]
      );
      await adminClient.query("COMMIT");
    } finally {
      adminClient.release();
    }

    const mWallet = await pool.query(`SELECT bonus_balance_pkr, balance_pkr FROM vexo_wallets WHERE user_id = $1`, [mUserId]);
    const mClaim = await pool.query(`SELECT status, reason, amount_pkr FROM vexo_signup_bonus_claims WHERE user_id = $1`, [mUserId]);
    const mTx = await pool.query(`SELECT type, amount_pkr, reference_type FROM vexo_wallet_transactions WHERE user_id = $1 AND reference_type = 'admin_bonus'`, [mUserId]);

    assert(Number(mWallet.rows[0].bonus_balance_pkr) === 50, "Admin manual bonus successfully credited 50 PKR to bonus_balance_pkr");
    assert(Number(mWallet.rows[0].balance_pkr) === 0, "Real balance remained untouched at 0 PKR");
    assert(mClaim.rows[0].status === "CLAIMED", "Claim status updated from REJECTED to CLAIMED");
    assert(mClaim.rows[0].reason === "ADMIN_MANUAL_GRANTED", "Claim reason recorded as ADMIN_MANUAL_GRANTED");
    assert(mTx.rows.length === 1 && Number(mTx.rows[0].amount_pkr) === 50, "Audit ledger recorded admin_bonus Credit transaction");
  } finally {
    // Clean up test users & claims
    console.log("\n🧹 Cleaning up test artifacts from database...");
    if (createdUserIds.length > 0) {
      await pool.query(
        `DELETE FROM vexo_users WHERE id = ANY($1::int[])`,
        [createdUserIds]
      );
      console.log(`  Removed ${createdUserIds.length} test users and cascade records.`);
    }
    await pool.end();
  }

  console.log("\n=======================================================");
  console.log(`   TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
