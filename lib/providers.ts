import { db } from "@/lib/db";

export interface ProviderConfig {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  currency: string;
  enabled: boolean;
}

export const STATIC_PROVIDERS: ProviderConfig[] = [
  {
    id: process.env.PROVIDER_1_ID || "pak_smm",
    name: process.env.PROVIDER_1_NAME || "PAK SMM Panels",
    apiUrl: process.env.PROVIDER_1_URL || "https://paksmmpanels.com/api/v2",
    apiKey: process.env.PROVIDER_1_KEY || "",
    currency: "USD",
    enabled: true,
  },
  {
    id: process.env.PROVIDER_2_ID || "smooth_smm",
    name: process.env.PROVIDER_2_NAME || "Smooth SMM",
    apiUrl: process.env.PROVIDER_2_URL || "https://smoothsmm.com/api/v2",
    apiKey: process.env.PROVIDER_2_KEY || "",
    currency: "USD",
    enabled: true,
  },
  {
    id: process.env.PROVIDER_3_ID || "am_smm",
    name: process.env.PROVIDER_3_NAME || "AM SMM Panel",
    apiUrl: process.env.PROVIDER_3_URL || "https://amsmmpanel.com/api/v2",
    apiKey: process.env.PROVIDER_3_KEY || "",
    currency: "USD",
    enabled: true,
  },
  {
    id: process.env.PROVIDER_4_ID || "pakistan_smm",
    name: process.env.PROVIDER_4_NAME || "Pakistan SMM Panel",
    apiUrl: process.env.PROVIDER_4_URL || "https://pakistansmmpanel.pk/api/v2",
    apiKey: process.env.PROVIDER_4_KEY || "",
    currency: "USD",
    enabled: true,
  },
  {
    id: process.env.PROVIDER_5_ID || "rizvi_smm",
    name: process.env.PROVIDER_5_NAME || "Rizvi SMM Panels",
    apiUrl: process.env.PROVIDER_5_URL || "https://rizvismmpanels.com/api/v2",
    apiKey: process.env.PROVIDER_5_KEY || process.env.RIZVI_API_KEY || "",
    currency: "USD",
    enabled: true,
  },
];

let schemaInitPromise: Promise<void> | null = null;

export async function ensureProvidersSchema(): Promise<void> {
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      await db.query(`
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
        CREATE INDEX IF NOT EXISTS vexo_provider_services_rate_idx ON vexo_provider_services(rate_usd ASC);

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
          min INTEGER NOT NULL DEFAULT 10,
          max INTEGER NOT NULL DEFAULT 100000,
          refill BOOLEAN DEFAULT FALSE,
          cancel BOOLEAN DEFAULT FALSE,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          popular BOOLEAN NOT NULL DEFAULT FALSE,
          fallback_queue JSONB DEFAULT '[]',
          provider_rates JSONB DEFAULT '{}',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS vexo_routed_services_platform_idx ON vexo_routed_services(platform);
        CREATE UNIQUE INDEX IF NOT EXISTS vexo_routed_services_group_uidx ON vexo_routed_services(service_group_key);
        CREATE INDEX IF NOT EXISTS vexo_routed_services_enabled_idx ON vexo_routed_services(enabled);

        ALTER TABLE vexo_provider_services ALTER COLUMN rate_usd TYPE NUMERIC(20,6);
        ALTER TABLE vexo_provider_services ALTER COLUMN min TYPE BIGINT;
        ALTER TABLE vexo_provider_services ALTER COLUMN max TYPE BIGINT;

        ALTER TABLE vexo_routed_services ALTER COLUMN base_rate_usd TYPE NUMERIC(20,6);
        ALTER TABLE vexo_routed_services ALTER COLUMN rate_pkr TYPE NUMERIC(20,6);
        ALTER TABLE vexo_routed_services ALTER COLUMN min TYPE BIGINT;
        ALTER TABLE vexo_routed_services ALTER COLUMN max TYPE BIGINT;

        ALTER TABLE vexo_provider_services ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
        ALTER TABLE vexo_routed_services ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS provider_id VARCHAR(50);
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS failover_attempts JSONB DEFAULT '[]';
      `);

      // Seed / update static providers in vexo_providers
      for (const p of STATIC_PROVIDERS) {
        await db.query(
          `INSERT INTO vexo_providers (id, name, api_url, api_key, currency, enabled)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             api_url = EXCLUDED.api_url,
             api_key = CASE
               WHEN EXCLUDED.api_key IS NOT NULL AND EXCLUDED.api_key <> ''
               THEN EXCLUDED.api_key
               ELSE vexo_providers.api_key
             END`,
          [p.id, p.name, p.apiUrl, p.apiKey, p.currency, p.enabled]
        );
      }
    })().catch((err) => {
      schemaInitPromise = null;
      throw err;
    });
  }
  return schemaInitPromise;
}

export async function getRegisteredProviders(): Promise<ProviderConfig[]> {
  await ensureProvidersSchema();
  const res = await db.query(
    `SELECT id, name, api_url, api_key, currency, enabled
     FROM vexo_providers
     ORDER BY priority ASC, id ASC`
  );

  if (res.rows.length === 0) {
    return STATIC_PROVIDERS;
  }

  return res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    apiUrl: row.api_url,
    apiKey: row.api_key,
    currency: row.currency || "USD",
    enabled: row.enabled !== false,
  }));
}

export async function getProviderById(providerId: string): Promise<ProviderConfig | null> {
  const providers = await getRegisteredProviders();
  return providers.find((p) => p.id === providerId) || null;
}

async function makeProviderRequest(provider: ProviderConfig, params: Record<string, string>, timeoutMs = 15000): Promise<unknown> {
  const body = new URLSearchParams({
    key: provider.apiKey,
    ...params,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(provider.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`${provider.name} returned HTTP ${res.status}: ${text.slice(0, 150)}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`${provider.name} returned invalid JSON: ${text.slice(0, 150)}`);
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`${provider.name} request timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchProviderBalance(provider: ProviderConfig): Promise<{ balance: number; currency: string }> {
  const data = (await makeProviderRequest(provider, { action: "balance" })) as Record<string, unknown>;
  const rawBalance = Number(data?.balance ?? 0);
  const currency = String(data?.currency ?? "USD").toUpperCase();

  await ensureProvidersSchema();
  await db.query(
    `UPDATE vexo_providers
     SET balance_usd = $1, currency = $2, last_sync_at = NOW()
     WHERE id = $3`,
    [rawBalance, currency, provider.id]
  );

  return { balance: rawBalance, currency };
}

export async function fetchProviderServices(provider: ProviderConfig): Promise<Array<Record<string, unknown>>> {
  const data = await makeProviderRequest(provider, { action: "services" }, 30000);
  if (!Array.isArray(data)) {
    throw new Error(`${provider.name} did not return a valid services array.`);
  }
  return data as Array<Record<string, unknown>>;
}

export async function submitProviderOrder(
  provider: ProviderConfig,
  remoteServiceId: string,
  link: string,
  quantity: number | string
): Promise<{ orderId: string; rawResponse: unknown }> {
  const data = (await makeProviderRequest(provider, {
    action: "add",
    service: String(remoteServiceId),
    link: String(link),
    quantity: String(quantity),
  })) as Record<string, unknown>;

  const nested = data?.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : null;
  const rawOrderId = data?.order ?? data?.order_id ?? data?.id ?? nested?.order ?? nested?.order_id ?? nested?.id;
  const error = data?.error ?? data?.errors;

  if (error || !rawOrderId) {
    const reason = error
      ? typeof error === "string"
        ? error
        : JSON.stringify(error)
      : "Provider did not return an order ID";
    throw new Error(reason);
  }

  return {
    orderId: String(rawOrderId).trim(),
    rawResponse: data,
  };
}

export async function fetchProviderOrderStatus(
  provider: ProviderConfig,
  remoteOrderId: string,
  timeoutMs = 15000
): Promise<Record<string, unknown>> {
  const data = (await makeProviderRequest(
    provider,
    {
      action: "status",
      order: String(remoteOrderId),
    },
    timeoutMs
  )) as Record<string, unknown>;

  return data;
}

export async function submitProviderRefill(
  provider: ProviderConfig,
  remoteOrderId: string
): Promise<{ refillId: string | null; rawResponse: unknown }> {
  const data = (await makeProviderRequest(provider, {
    action: "refill",
    order: String(remoteOrderId),
  })) as Record<string, unknown>;

  const refillId = data?.refill ? String(data.refill) : null;
  return { refillId, rawResponse: data };
}
