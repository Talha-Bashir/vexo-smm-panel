const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

// Load DATABASE_URL from .env.local
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
let dbUrl = "";
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed.startsWith("DATABASE_URL=")) {
    dbUrl = trimmed.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
    break;
  }
}

if (!dbUrl) {
  console.error("No DATABASE_URL found in .env.local");
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

const EXPORT_DIR = path.join(__dirname, "..", "database", "database_exports");

async function initSchema(client) {
  console.log("🛠️ Initializing complete database schema...");

  await client.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    -- 1. vexo_users
    CREATE TABLE IF NOT EXISTS vexo_users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      referral_code VARCHAR(32) UNIQUE,
      referred_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL,
      api_key VARCHAR(64) UNIQUE,
      referral_balance_pkr NUMERIC(14,2) NOT NULL DEFAULT 0,
      role VARCHAR(32) NOT NULL DEFAULT 'user',
      permissions JSONB NOT NULL DEFAULT '{}',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL,
      whatsapp VARCHAR(32),
      whatsapp_prompted BOOLEAN NOT NULL DEFAULT FALSE,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      email_verified_at TIMESTAMPTZ,
      free_trial_claimed BOOLEAN NOT NULL DEFAULT FALSE,
      free_trial_claimed_at TIMESTAMPTZ,
      reengaged_at TIMESTAMPTZ,
      reengagement_count INTEGER NOT NULL DEFAULT 0,
      custom_discount_percent NUMERIC(5,2) DEFAULT 0,
      custom_rates JSONB DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS vexo_users_referral_code_idx ON vexo_users(referral_code);
    CREATE INDEX IF NOT EXISTS vexo_users_referred_by_idx ON vexo_users(referred_by);
    CREATE INDEX IF NOT EXISTS vexo_users_api_key_idx ON vexo_users(api_key);
    CREATE INDEX IF NOT EXISTS vexo_users_role_idx ON vexo_users(role);

    -- 2. vexo_sessions
    CREATE TABLE IF NOT EXISTS vexo_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS vexo_sessions_token_hash_idx ON vexo_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS vexo_sessions_user_id_idx ON vexo_sessions(user_id);

    -- 3. vexo_email_verifications
    CREATE TABLE IF NOT EXISTS vexo_email_verifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL,
      code_hash VARCHAR(64) NOT NULL,
      code_salt VARCHAR(32) NOT NULL,
      type VARCHAR(32) NOT NULL,
      payload JSONB DEFAULT '{}',
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS vexo_email_verif_lookup_idx ON vexo_email_verifications(email, type, created_at DESC);

    -- 4. vexo_wallets
    CREATE TABLE IF NOT EXISTS vexo_wallets (
      user_id INTEGER PRIMARY KEY REFERENCES vexo_users(id) ON DELETE CASCADE,
      balance_pkr NUMERIC(14,2) NOT NULL DEFAULT 0,
      bonus_balance_pkr NUMERIC(14,2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 5. vexo_deposits
    CREATE TABLE IF NOT EXISTS vexo_deposits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
      method VARCHAR(40) NOT NULL,
      amount_pkr NUMERIC(14,2) NOT NULL,
      bonus_pkr NUMERIC(14,2) NOT NULL DEFAULT 0,
      transaction_id VARCHAR(120) NOT NULL,
      screenshot TEXT,
      sender_source VARCHAR(60),
      status VARCHAR(20) NOT NULL DEFAULT 'Pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ,
      reviewed_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL,
      rejection_reason TEXT
    );
    CREATE INDEX IF NOT EXISTS vexo_deposits_user_created_idx ON vexo_deposits(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS vexo_deposits_status_created_idx ON vexo_deposits(status, created_at ASC);

    -- 6. vexo_wallet_transactions
    CREATE TABLE IF NOT EXISTS vexo_wallet_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL,
      amount_pkr NUMERIC(14,2) NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      description TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS vexo_wallet_transactions_user_created_idx ON vexo_wallet_transactions(user_id, created_at DESC);

    -- 7. vexo_providers
    CREATE TABLE IF NOT EXISTS vexo_providers (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      api_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      balance_usd NUMERIC(14,4) DEFAULT 0,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      priority INTEGER DEFAULT 1,
      last_sync_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 8. vexo_provider_services
    CREATE TABLE IF NOT EXISTS vexo_provider_services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_id VARCHAR(50) NOT NULL REFERENCES vexo_providers(id) ON DELETE CASCADE,
      remote_service_id VARCHAR(100) NOT NULL,
      name TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'Default',
      category TEXT NOT NULL,
      rate_usd NUMERIC(14,6) NOT NULL,
      min INTEGER NOT NULL,
      max INTEGER NOT NULL,
      refill BOOLEAN DEFAULT FALSE,
      cancel BOOLEAN DEFAULT FALSE,
      is_guaranteed BOOLEAN DEFAULT FALSE,
      service_group_key VARCHAR(120),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_provider_remote_service UNIQUE (provider_id, remote_service_id)
    );
    CREATE INDEX IF NOT EXISTS vexo_provider_services_prov_idx ON vexo_provider_services(provider_id);
    CREATE INDEX IF NOT EXISTS vexo_provider_services_group_idx ON vexo_provider_services(service_group_key);

    -- 9. vexo_routed_services
    CREATE TABLE IF NOT EXISTS vexo_routed_services (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      platform VARCHAR(50) NOT NULL,
      category TEXT NOT NULL,
      service_group_key VARCHAR(120) NOT NULL,
      is_guaranteed BOOLEAN DEFAULT TRUE,
      auto_route BOOLEAN NOT NULL DEFAULT TRUE,
      active_provider_id VARCHAR(50) REFERENCES vexo_providers(id) ON DELETE SET NULL,
      active_remote_service_id VARCHAR(100),
      base_rate_usd NUMERIC(14,6) NOT NULL DEFAULT 0,
      rate_multiplier NUMERIC(12,6) NOT NULL DEFAULT 1.07,
      rate_pkr NUMERIC(14,6) NOT NULL DEFAULT 0,
      custom_rate_pkr NUMERIC(20,6),
      min INTEGER NOT NULL DEFAULT 10,
      max INTEGER NOT NULL DEFAULT 100000,
      refill BOOLEAN DEFAULT FALSE,
      cancel BOOLEAN DEFAULT FALSE,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 10. vexo_service_overrides
    CREATE TABLE IF NOT EXISTS vexo_service_overrides (
      service_id VARCHAR(120) PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      popular BOOLEAN NOT NULL DEFAULT FALSE,
      rate_multiplier NUMERIC(12,6) NOT NULL DEFAULT 1,
      custom_description TEXT,
      custom_rate_pkr NUMERIC(20,6),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL
    );

    -- 11. vexo_orders
    CREATE TABLE IF NOT EXISTS vexo_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL,
      idempotency_key VARCHAR(120) UNIQUE,
      provider_order_id VARCHAR(120),
      service_id VARCHAR(120) NOT NULL,
      service_name TEXT,
      platform VARCHAR(50),
      link TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      rate_pkr NUMERIC(14,6),
      rate NUMERIC(14,6),
      charge_pkr NUMERIC(14,2),
      bonus_charge_pkr NUMERIC(14,2) NOT NULL DEFAULT 0,
      real_charge_pkr NUMERIC(14,2) NOT NULL DEFAULT 0,
      cost_pkr NUMERIC(14,2),
      cost_usd NUMERIC(14,6),
      status VARCHAR(40) NOT NULL DEFAULT 'Pending',
      failure_reason TEXT,
      provider_response JSONB,
      start_count VARCHAR(50),
      remains VARCHAR(50),
      whatsapp VARCHAR(32),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS vexo_orders_user_created_idx ON vexo_orders(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS vexo_orders_status_created_idx ON vexo_orders(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS vexo_orders_provider_idx ON vexo_orders(provider_order_id);

    -- 12. vexo_order_refills
    CREATE TABLE IF NOT EXISTS vexo_order_refills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES vexo_orders(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
      provider_order_id VARCHAR(120),
      provider_refill_id VARCHAR(120),
      status VARCHAR(40) NOT NULL DEFAULT 'Pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 13. vexo_platform_settings
    CREATE TABLE IF NOT EXISTS vexo_platform_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL
    );

    -- 14. vexo_admin_activity
    CREATE TABLE IF NOT EXISTS vexo_admin_activity (
      id BIGSERIAL PRIMARY KEY,
      admin_user_id INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL,
      action VARCHAR(80) NOT NULL,
      target_type VARCHAR(80),
      target_id VARCHAR(160),
      details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 15. vexo_announcements
    CREATE TABLE IF NOT EXISTS vexo_announcements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(160) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'announcement',
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      scheduled_at TIMESTAMPTZ,
      event_link TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL
    );

    -- 16. vexo_balance_alert_state
    CREATE TABLE IF NOT EXISTS vexo_balance_alert_state (
      provider_id VARCHAR(50) PRIMARY KEY,
      last_alert_level VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
      last_balance NUMERIC(14,4),
      last_currency VARCHAR(10) DEFAULT 'USD',
      last_error TEXT,
      last_notified_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 17. vexo_blog_posts
    CREATE TABLE IF NOT EXISTS vexo_blog_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug VARCHAR(160) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      meta_title VARCHAR(255),
      meta_description TEXT,
      summary TEXT NOT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'Pakistan Guides',
      tags TEXT[] DEFAULT '{}',
      author_name VARCHAR(100) NOT NULL DEFAULT 'VEXARO Team',
      author_role VARCHAR(100) DEFAULT 'SMM Strategist',
      read_time VARCHAR(40) DEFAULT '5 min read',
      cover_icon VARCHAR(20) DEFAULT '🚀',
      published BOOLEAN NOT NULL DEFAULT TRUE,
      content_markdown TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 18. vexo_blog_analytics
    CREATE TABLE IF NOT EXISTS vexo_blog_analytics (
      slug VARCHAR(160) PRIMARY KEY,
      views BIGINT NOT NULL DEFAULT 0,
      impressions BIGINT NOT NULL DEFAULT 0,
      unique_readers BIGINT NOT NULL DEFAULT 0,
      likes BIGINT NOT NULL DEFAULT 0,
      shares BIGINT NOT NULL DEFAULT 0,
      last_viewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 19. vexo_blog_views_log
    CREATE TABLE IF NOT EXISTS vexo_blog_views_log (
      id BIGSERIAL PRIMARY KEY,
      slug VARCHAR(160) NOT NULL,
      ip_hash VARCHAR(64),
      event_type VARCHAR(20) NOT NULL DEFAULT 'view',
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 20. vexo_coupons
    CREATE TABLE IF NOT EXISTS vexo_coupons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) UNIQUE NOT NULL,
      prize_pkr NUMERIC(14,2) NOT NULL,
      reward_type VARCHAR(20) NOT NULL DEFAULT 'bonus',
      max_uses INTEGER DEFAULT NULL,
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

    -- 21. vexo_coupon_redemptions
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

    -- 22. vexo_signup_bonus_claims
    CREATE TABLE IF NOT EXISTS vexo_signup_bonus_claims (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL UNIQUE REFERENCES vexo_users(id) ON DELETE CASCADE,
      amount_pkr NUMERIC(14,2) NOT NULL DEFAULT 50.00,
      status VARCHAR(30) NOT NULL,
      reason VARCHAR(80) NOT NULL,
      device_fingerprint VARCHAR(128),
      client_ip VARCHAR(64),
      normalized_email VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 23. vexo_referral_earnings
    CREATE TABLE IF NOT EXISTS vexo_referral_earnings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referrer_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
      referee_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
      order_id UUID REFERENCES vexo_orders(id) ON DELETE SET NULL,
      order_amount_pkr NUMERIC(14,2) NOT NULL,
      commission_pkr NUMERIC(14,2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 24. vexo_referral_withdrawals
    CREATE TABLE IF NOT EXISTS vexo_referral_withdrawals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
      amount_pkr NUMERIC(14,2) NOT NULL,
      amount_usd NUMERIC(10,2) NOT NULL,
      method VARCHAR(50) NOT NULL,
      account_number VARCHAR(100) NOT NULL,
      account_title VARCHAR(120) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'Pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ,
      rejection_reason TEXT
    );

    -- 25. vexo_support_tickets
    CREATE TABLE IF NOT EXISTS vexo_support_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
      subject VARCHAR(200) NOT NULL,
      category VARCHAR(60) NOT NULL,
      order_id VARCHAR(120),
      message TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'Open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 26. vexo_tool_subscriptions
    CREATE TABLE IF NOT EXISTS vexo_tool_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
      tool_id VARCHAR(100) NOT NULL,
      tool_name VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL,
      plan_duration VARCHAR(50) NOT NULL,
      price_pkr NUMERIC(14,2) NOT NULL,
      delivery_contact VARCHAR(255) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'Active',
      license_or_access TEXT NOT NULL,
      instructions TEXT NOT NULL,
      delivery_type VARCHAR(50) DEFAULT 'LICENSE_KEY',
      provider_order_code VARCHAR(100),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 27. vexo_whatsapp_notifications & vexo_whatsapp_bot_controls
    CREATE TABLE IF NOT EXISTS vexo_whatsapp_notifications (
      id BIGSERIAL PRIMARY KEY,
      phone VARCHAR(40) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(40) NOT NULL,
      reference_id VARCHAR(100),
      status VARCHAR(20) DEFAULT 'pending',
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      sent_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS vexo_whatsapp_bot_controls (
      phone VARCHAR(40) PRIMARY KEY,
      is_ignored BOOLEAN DEFAULT FALSE,
      is_paused BOOLEAN DEFAULT FALSE,
      paused_until TIMESTAMPTZ,
      reason TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log("✅ Schema initialized successfully!");
}

async function insertRows(client, tableName, rows) {
  if (!rows || rows.length === 0) return 0;

  // Filter columns to those in first row
  const first = rows[0];
  const cols = Object.keys(first);

  let inserted = 0;
  // Batch size 50 to avoid parameter limit in postgres (max ~65535)
  const batchSize = Math.max(1, Math.floor(1000 / cols.length));

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const valueClauses = [];
    const params = [];

    chunk.forEach((row, rowIdx) => {
      const rowParams = cols.map((col, colIdx) => {
        let val = row[col];
        if (typeof val === "object" && val !== null && !Array.isArray(val) && !(val instanceof Date)) {
          val = JSON.stringify(val);
        }
        params.push(val);
        return `$${params.length}`;
      });
      valueClauses.push(`(${rowParams.join(", ")})`);
    });

    const query = `
      INSERT INTO "${tableName}" (${cols.map(c => `"${c}"`).join(", ")})
      VALUES ${valueClauses.join(", ")}
      ON CONFLICT DO NOTHING;
    `;

    try {
      await client.query(query, params);
      inserted += chunk.length;
    } catch (err) {
      console.warn(`  ⚠️ Warning inserting batch into ${tableName}: ${err.message}`);
    }
  }

  return inserted;
}

async function main() {
  const client = await pool.connect();
  try {
    await initSchema(client);

    const tablesInOrder = [
      "vexo_users",
      "vexo_wallets",
      "vexo_providers",
      "vexo_provider_services",
      "vexo_routed_services",
      "vexo_service_overrides",
      "vexo_platform_settings",
      "vexo_orders",
      "vexo_deposits",
      "vexo_wallet_transactions",
      "vexo_announcements",
      "vexo_admin_activity",
      "vexo_balance_alert_state",
      "vexo_blog_posts",
      "vexo_blog_analytics",
      "vexo_blog_views_log",
      "vexo_coupons",
      "vexo_coupon_redemptions",
      "vexo_signup_bonus_claims",
      "vexo_tool_subscriptions",
      "vexo_sessions",
      "vexo_support_tickets",
      "vexo_referral_earnings",
      "vexo_referral_withdrawals",
      "vexo_order_refills"
    ];

    console.log("\n📦 Importing data from exports...");
    for (const table of tablesInOrder) {
      const jsonFile = path.join(EXPORT_DIR, `${table}.json`);
      if (fs.existsSync(jsonFile)) {
        try {
          const raw = fs.readFileSync(jsonFile, "utf8");
          const data = JSON.parse(raw);
          if (Array.isArray(data) && data.length > 0) {
            const count = await insertRows(client, table, data);
            console.log(`  ✓ Restored ${table}: ${count} rows`);
          } else {
            console.log(`  - ${table}: 0 rows (skipped)`);
          }
        } catch (e) {
          console.error(`  ❌ Error processing ${table}:`, e.message);
        }
      }
    }

    // Reset sequences
    console.log("\n🔄 Updating auto-increment sequences...");
    const seqFixes = [
      `SELECT setval('vexo_users_id_seq', COALESCE((SELECT MAX(id) FROM vexo_users), 1));`,
      `SELECT setval('vexo_routed_services_id_seq', COALESCE((SELECT MAX(id) FROM vexo_routed_services), 1));`,
      `SELECT setval('vexo_admin_activity_id_seq', COALESCE((SELECT MAX(id) FROM vexo_admin_activity), 1));`,
      `SELECT setval('vexo_blog_views_log_id_seq', COALESCE((SELECT MAX(id) FROM vexo_blog_views_log), 1));`
    ];
    for (const q of seqFixes) {
      try {
        await client.query(q);
      } catch (e) {
        // sequence might not exist or already set
      }
    }

    // Verify users count
    const verifyUsers = await client.query("SELECT COUNT(*) FROM vexo_users;");
    const verifyWallets = await client.query("SELECT COUNT(*) FROM vexo_wallets;");
    const verifyOrders = await client.query("SELECT COUNT(*) FROM vexo_orders;");
    const verifyProviders = await client.query("SELECT COUNT(*) FROM vexo_providers;");
    const verifyRouted = await client.query("SELECT COUNT(*) FROM vexo_routed_services;");

    console.log("\n🎉 RESTORATION COMPLETE!");
    console.log(`  Total Users in new database: ${verifyUsers.rows[0].count}`);
    console.log(`  Total Wallets in new database: ${verifyWallets.rows[0].count}`);
    console.log(`  Total Orders in new database: ${verifyOrders.rows[0].count}`);
    console.log(`  Total Providers: ${verifyProviders.rows[0].count}`);
    console.log(`  Total Routed Services: ${verifyRouted.rows[0].count}`);

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
