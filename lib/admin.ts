import { db } from "@/lib/db";
import { ensureWalletSchema } from "@/lib/wallet";

let adminSchemaPromise: Promise<void> | null = null;

export function ensureAdminSchema() {
  if (!adminSchemaPromise) {
    adminSchemaPromise = (async () => {
      await ensureWalletSchema();
      await db.query(`
        CREATE TABLE IF NOT EXISTS vexo_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL,
          provider_order_id VARCHAR(120),
          service_id VARCHAR(120) NOT NULL,
          service_name TEXT,
          link TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          rate NUMERIC(14,6),
          charge_pkr NUMERIC(14,2),
          status VARCHAR(40) NOT NULL DEFAULT 'Pending',
          provider_response JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS vexo_orders_user_created_idx ON vexo_orders(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS vexo_orders_status_created_idx ON vexo_orders(status, created_at DESC);
        CREATE INDEX IF NOT EXISTS vexo_orders_provider_idx ON vexo_orders(provider_order_id);

        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS rate_pkr NUMERIC(14,6);
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS rate NUMERIC(14,6);
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120);
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS failure_reason TEXT;
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS provider_response JSONB;

        CREATE TABLE IF NOT EXISTS vexo_service_overrides (
          service_id VARCHAR(120) PRIMARY KEY,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          popular BOOLEAN NOT NULL DEFAULT FALSE,
          rate_multiplier NUMERIC(12,6) NOT NULL DEFAULT 1,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS vexo_announcements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(160) NOT NULL,
          message TEXT NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS vexo_admin_activity (
          id BIGSERIAL PRIMARY KEY,
          admin_user_id INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL,
          action VARCHAR(80) NOT NULL,
          target_type VARCHAR(80),
          target_id VARCHAR(160),
          details JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS vexo_admin_activity_created_idx ON vexo_admin_activity(created_at DESC);

        CREATE TABLE IF NOT EXISTS vexo_platform_settings (
          key VARCHAR(100) PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL
        );
      `);
    })().catch((error) => {
      adminSchemaPromise = null;
      throw error;
    });
  }
  return adminSchemaPromise;
}

export async function getPlatformSetting(key: string, defaultValue: string = ""): Promise<string> {
  await ensureAdminSchema();
  try {
    const res = await db.query(`SELECT value FROM vexo_platform_settings WHERE key = $1 LIMIT 1`, [key]);
    if (res.rows.length > 0 && res.rows[0].value !== undefined && res.rows[0].value !== null) {
      return String(res.rows[0].value);
    }
  } catch (err) {
    console.error("Failed to read platform setting:", key, err);
  }
  return defaultValue;
}

export async function setPlatformSetting(key: string, value: string, adminUserId?: number): Promise<void> {
  await ensureAdminSchema();
  await db.query(
    `INSERT INTO vexo_platform_settings(key, value, updated_at, updated_by)
     VALUES($1, $2, NOW(), $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
    [key, value, adminUserId || null]
  );
}

export async function getAllPlatformSettings(): Promise<Record<string, string>> {
  await ensureAdminSchema();
  const settings: Record<string, string> = {
    platform_theme: "cyber-lime",
    global_profit_margin: "7",
    usd_to_pkr: "278.0",
    sadapay_number: "03197008275",
    sadapay_title: "Saeed Bashir",
  };
  try {
    const res = await db.query(`SELECT key, value FROM vexo_platform_settings`);
    for (const row of res.rows) {
      settings[row.key] = row.value;
    }
  } catch (err) {
    console.error("Failed to get all platform settings:", err);
  }
  return settings;
}

export async function logAdminActivity(
  adminUserId: number,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: unknown,
) {
  await ensureAdminSchema();
  await db.query(
    `INSERT INTO vexo_admin_activity(admin_user_id, action, target_type, target_id, details)
     VALUES($1,$2,$3,$4,$5::jsonb)`,
    [adminUserId, action, targetType || null, targetId || null, JSON.stringify(details ?? {})],
  );
}
