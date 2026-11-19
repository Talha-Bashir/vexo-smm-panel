import { Pool } from "pg";

const rawConnectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!rawConnectionString) {
  throw new Error("DATABASE_URL (or POSTGRES_URL) is missing from environment variables");
}

const connectionString = rawConnectionString.replace(/[?&]channel_binding=require/g, "");

export const db = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

let dbPromise: Promise<void> | null = null;

export async function ensureDatabase() {
  if (!dbPromise) {
    dbPromise = db
      .query(`
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE IF NOT EXISTS vexo_users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS vexo_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
          token_hash VARCHAR(64) NOT NULL UNIQUE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS vexo_sessions_token_hash_idx ON vexo_sessions(token_hash);
        CREATE INDEX IF NOT EXISTS vexo_sessions_user_id_idx ON vexo_sessions(user_id);

        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(32) UNIQUE;
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS referred_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL;
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS api_key VARCHAR(64) UNIQUE;
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS referral_balance_pkr NUMERIC(14,2) NOT NULL DEFAULT 0;
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'user';
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}';
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL;
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(32);
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS whatsapp_prompted BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS free_trial_claimed BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS free_trial_claimed_at TIMESTAMPTZ;
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS reengaged_at TIMESTAMPTZ;
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS reengagement_count INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS last_ip VARCHAR(64);
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS last_country VARCHAR(10);
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS last_city VARCHAR(100);
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS signup_ip VARCHAR(64);
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS signup_country VARCHAR(10);
        ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

        CREATE TABLE IF NOT EXISTS vexo_visitor_logs (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL,
          user_email VARCHAR(255),
          ip_address VARCHAR(64) NOT NULL,
          country VARCHAR(10),
          city VARCHAR(100),
          path TEXT,
          method VARCHAR(10) DEFAULT 'GET',
          user_agent TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS vexo_visitor_logs_ip_idx ON vexo_visitor_logs(ip_address);
        CREATE INDEX IF NOT EXISTS vexo_visitor_logs_country_idx ON vexo_visitor_logs(country);
        CREATE INDEX IF NOT EXISTS vexo_visitor_logs_user_idx ON vexo_visitor_logs(user_id);
        CREATE INDEX IF NOT EXISTS vexo_visitor_logs_created_idx ON vexo_visitor_logs(created_at DESC);

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

        CREATE INDEX IF NOT EXISTS vexo_users_referral_code_idx ON vexo_users(referral_code);
        CREATE INDEX IF NOT EXISTS vexo_users_referred_by_idx ON vexo_users(referred_by);
        CREATE INDEX IF NOT EXISTS vexo_users_api_key_idx ON vexo_users(api_key);
        CREATE INDEX IF NOT EXISTS vexo_users_role_idx ON vexo_users(role);

        CREATE TABLE IF NOT EXISTS vexo_referral_earnings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          referrer_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
          referee_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
          order_id UUID REFERENCES vexo_orders(id) ON DELETE SET NULL,
          order_amount_pkr NUMERIC(14,2) NOT NULL,
          commission_pkr NUMERIC(14,2) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS vexo_referral_earnings_referrer_idx ON vexo_referral_earnings(referrer_id, created_at DESC);

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
        CREATE INDEX IF NOT EXISTS vexo_referral_withdrawals_user_idx ON vexo_referral_withdrawals(user_id, created_at DESC);

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
        CREATE INDEX IF NOT EXISTS vexo_support_tickets_user_idx ON vexo_support_tickets(user_id, created_at DESC);
      `)
      .then(() => undefined)
      .catch((err) => {
        dbPromise = null;
        throw err;
      });
  }
  return dbPromise;
}
