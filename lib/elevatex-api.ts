import { db } from "@/lib/db";

export const DEFAULT_ELEVATEX_BASE_URL = "https://shop.elevatexbyzaid.com/api/v1";
export const DEFAULT_ELEVATEX_API_KEY = "elx_live_d51b6cc732614d6193403be374080a18ffda4a65";

export interface ElevateXProduct {
  id: string; // e.g. "elx-9BF63764"
  name: string;
  category: string;
  stock: number;
  price_usdt: string;
  price_pkr: string;
  retail_price_usdt?: string;
  warranty?: string;
  description?: string;
}

export interface ElevateXBalanceResponse {
  ok: boolean;
  user_id?: number;
  label?: string;
  tier?: string;
  discount_pct?: number;
  balance_usdt?: string;
  balance_pkr?: string;
  rate_limit_per_min?: number;
  total_orders?: number;
  total_volume_usdt?: string;
  status?: string;
  error?: string;
}

export interface ElevateXOrderResponse {
  ok: boolean;
  order_id?: string;
  custom_ref?: string;
  product_id?: string;
  product_name?: string;
  quantity?: number;
  unit_price_usdt?: string;
  total_usdt?: string;
  remaining_balance_usdt?: string;
  status?: string;
  delivery?: string[];
  created_at?: string;
  error?: string;
}

export interface ElevateXConfig {
  apiUrl: string;
  apiKey: string;
  markupPercent: number;
}

/**
 * Get active ElevateX API settings (from DB or process.env)
 */
export async function getElevateXConfig(): Promise<ElevateXConfig> {
  let apiKey = process.env.ELEVATEX_API_KEY || DEFAULT_ELEVATEX_API_KEY;
  let apiUrl = process.env.ELEVATEX_API_URL || DEFAULT_ELEVATEX_BASE_URL;
  let markupPercent = 8; // default 8% markup

  try {
    const res = await db.query(
      `SELECT key, value FROM vexo_platform_settings WHERE key IN ('elevatex_api_key', 'elevatex_api_url', 'elevatex_markup_percent', 'ggsoma_api_key', 'ggsoma_api_url', 'ggsoma_markup_percent')`
    );
    for (const row of res.rows) {
      if (row.key === "elevatex_api_key" && row.value?.trim()) apiKey = row.value.trim();
      else if (row.key === "ggsoma_api_key" && row.value?.trim() && !apiKey) apiKey = row.value.trim();

      if (row.key === "elevatex_api_url" && row.value?.trim()) apiUrl = row.value.trim();
      else if (row.key === "ggsoma_api_url" && row.value?.trim() && !apiUrl) apiUrl = row.value.trim();

      if ((row.key === "elevatex_markup_percent" || row.key === "ggsoma_markup_percent") && !isNaN(Number(row.value))) {
        markupPercent = Number(row.value);
      }
    }
  } catch {
    // Database might not be ready or table empty, proceed with env
  }

  return { apiUrl: apiUrl.replace(/\/+$/, ""), apiKey, markupPercent };
}

/**
 * Save ElevateX API settings into vexo_platform_settings
 */
export async function setElevateXConfig(
  config: { apiKey?: string; apiUrl?: string; markupPercent?: number },
  updatedBy?: number
): Promise<void> {
  const client = await db.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS vexo_platform_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by INTEGER
      )
    `);

    if (config.apiKey !== undefined) {
      await client.query(
        `INSERT INTO vexo_platform_settings (key, value, updated_at, updated_by)
         VALUES ('elevatex_api_key', $1, NOW(), $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
        [config.apiKey.trim(), updatedBy || null]
      );
    }

    if (config.apiUrl !== undefined) {
      await client.query(
        `INSERT INTO vexo_platform_settings (key, value, updated_at, updated_by)
         VALUES ('elevatex_api_url', $1, NOW(), $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
        [config.apiUrl.trim(), updatedBy || null]
      );
    }

    if (config.markupPercent !== undefined) {
      await client.query(
        `INSERT INTO vexo_platform_settings (key, value, updated_at, updated_by)
         VALUES ('elevatex_markup_percent', $1, NOW(), $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
        [String(config.markupPercent), updatedBy || null]
      );
    }
  } finally {
    client.release();
  }
}

/**
 * Execute HTTP requests against ElevateX Reseller Gateway
 */
async function elevateXRequest<T>(
  endpoint: string,
  method: string = "GET",
  body?: unknown,
  explicitKey?: string
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const { apiUrl, apiKey: storedKey } = await getElevateXConfig();
  const apiKey = explicitKey !== undefined ? explicitKey : storedKey;

  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
  };

  if (apiKey) {
    headers["X-API-Key"] = apiKey.trim();
    headers["Authorization"] = `Bearer ${apiKey.trim()}`;
  }

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(`${apiUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const errMsg = json?.error || json?.message || `HTTP ${res.status}: ${res.statusText}`;
      return { ok: false, status: res.status, data: json, error: errMsg };
    }

    return { ok: true, status: res.status, data: json };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: err instanceof Error ? err.message : "Network error contacting ElevateX Gateway",
    };
  }
}

/**
 * Ping / Health Check (Sub-millisecond uptime check)
 */
export async function checkElevateXHealth(): Promise<{ ok: boolean; service?: string; status?: string; version?: string; error?: string }> {
  const { apiUrl } = await getElevateXConfig();
  try {
    const res = await fetch(`${apiUrl}/ping`, { cache: "no-store" });
    const data = await res.json();
    return data;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "ElevateX ping failed" };
  }
}

/**
 * Get Reseller Wallet Balance (USDT & PKR)
 */
export async function getElevateXBalance(explicitKey?: string): Promise<ElevateXBalanceResponse> {
  const res = await elevateXRequest<ElevateXBalanceResponse>("/balance", "GET", undefined, explicitKey);
  if (!res.ok || !res.data) {
    return { ok: false, error: res.error || "Failed to retrieve balance" };
  }
  return res.data;
}

/**
 * Get Live Products Inventory Catalog
 */
export async function getElevateXProducts(): Promise<{ ok: boolean; count?: number; products?: ElevateXProduct[]; error?: string }> {
  const res = await elevateXRequest<{ ok: boolean; count: number; products: ElevateXProduct[] }>(`/products?_t=${Date.now()}`);
  if (!res.ok || !res.data) {
    return { ok: false, error: res.error || "Failed to retrieve ElevateX products catalog" };
  }
  return { ok: true, count: res.data.count, products: res.data.products || [] };
}

/**
 * Execute an automated wholesale purchase on ElevateX
 */
export async function createElevateXOrder(params: {
  productId: string;
  quantity?: number;
  customRef: string;
}): Promise<ElevateXOrderResponse> {
  const res = await elevateXRequest<ElevateXOrderResponse>("/orders", "POST", {
    product_id: params.productId,
    quantity: params.quantity || 1,
    custom_ref: params.customRef,
  });

  if (!res.ok || !res.data) {
    return {
      ok: false,
      error: res.error || (res.data as any)?.error || "Order creation failed",
    };
  }

  return res.data;
}

/**
 * Check past order details and credentials
 */
export async function getElevateXOrder(orderId: string): Promise<{ ok: boolean; order?: ElevateXOrderResponse; error?: string }> {
  const res = await elevateXRequest<ElevateXOrderResponse>(`/orders/${encodeURIComponent(orderId)}`);
  if (!res.ok || !res.data) {
    return { ok: false, error: res.error || "Failed to retrieve ElevateX order" };
  }
  return { ok: true, order: res.data };
}
