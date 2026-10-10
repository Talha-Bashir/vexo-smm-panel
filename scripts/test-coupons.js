const { Pool } = require('pg');
const fs = require('fs');

// Read .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrlLine = envFile.split('\n').find(l => l.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine ? dbUrlLine.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '') : '';

if (!dbUrl) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log("Connecting to PostgreSQL...");
  const client = await pool.connect();
  try {
    console.log("Running coupon table creation...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS vexo_coupons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        prize_pkr NUMERIC(14,2) NOT NULL CHECK (prize_pkr > 0),
        reward_type VARCHAR(20) NOT NULL DEFAULT 'bonus',
        max_uses INTEGER DEFAULT NULL,
        used_count INTEGER NOT NULL DEFAULT 0,
        per_user_limit INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        expires_at TIMESTAMPTZ DEFAULT NULL,
        description TEXT,
        created_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

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

      INSERT INTO vexo_coupons (code, prize_pkr, reward_type, max_uses, per_user_limit, is_active, description)
      VALUES ('WELCOME50', 50.00, 'bonus', NULL, 1, TRUE, 'Official welcome bonus coupon for new users')
      ON CONFLICT (UPPER(code)) DO NOTHING;
    `);

    const res = await client.query(`SELECT id, code, prize_pkr, reward_type, is_active, used_count FROM vexo_coupons`);
    console.log("Current coupons in database:");
    console.table(res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => {
  console.error("Migration error:", e);
  process.exit(1);
});
