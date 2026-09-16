-- VEXO admin schema. The application also creates these tables automatically.
-- Run this only after vexo_users exists.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS vexo_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL,
  idempotency_key VARCHAR(120) UNIQUE, provider_order_id VARCHAR(120), service_id VARCHAR(120) NOT NULL,
  service_name TEXT, platform VARCHAR(50), link TEXT NOT NULL, quantity INTEGER NOT NULL,
  rate_pkr NUMERIC(14,6), rate NUMERIC(14,6), charge_pkr NUMERIC(14,2), status VARCHAR(40) NOT NULL DEFAULT 'Pending',
  failure_reason TEXT, provider_response JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS vexo_service_overrides (
  service_id VARCHAR(120) PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT TRUE, popular BOOLEAN NOT NULL DEFAULT FALSE,
  rate_multiplier NUMERIC(12,6) NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS vexo_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title VARCHAR(160) NOT NULL, message TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS vexo_admin_activity (
  id BIGSERIAL PRIMARY KEY, admin_user_id INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL, target_type VARCHAR(80), target_id VARCHAR(160), details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
