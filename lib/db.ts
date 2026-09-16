import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing from .env.local");
}

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