-- VEXO wallet + Add Funds migration
-- Requires the existing vexo_users table from VEXO authentication.

CREATE TABLE IF NOT EXISTS vexo_wallets (
  user_id INTEGER PRIMARY KEY REFERENCES vexo_users(id) ON DELETE CASCADE,
  balance_pkr NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vexo_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
  method VARCHAR(40) NOT NULL,
  amount_pkr NUMERIC(14,2) NOT NULL CHECK (amount_pkr >= 100 AND amount_pkr <= 500000),
  transaction_id VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL,
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS vexo_deposits_user_created_idx ON vexo_deposits(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS vexo_deposits_status_created_idx ON vexo_deposits(status, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS vexo_deposits_method_transaction_uidx ON vexo_deposits(method, transaction_id);

-- Admin is configured simply with ADMIN_EMAIL in .env.local.
