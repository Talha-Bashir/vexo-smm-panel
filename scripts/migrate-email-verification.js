const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let dbUrl = '';
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL=')) {
    dbUrl = trimmed.substring('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
  }
}

async function migrate() {
  const pool = new Pool({ connectionString: dbUrl });
  try {
    console.log("Applying email verification schema...");
    await pool.query(`
      ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

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

      -- Mark existing accounts as verified so current users are unaffected
      UPDATE vexo_users SET email_verified = TRUE, email_verified_at = NOW() WHERE email_verified = FALSE;
    `);
    console.log("Schema applied successfully! Existing users marked as verified.");

    const res = await pool.query("SELECT COUNT(*) FROM vexo_users WHERE email_verified = TRUE");
    console.log("Verified users count:", res.rows[0].count);
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
  }
}

migrate();
