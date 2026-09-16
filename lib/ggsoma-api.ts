import { db } from "@/lib/db";

const DEFAULT_BASE_URL = "https://ggsoma.store/api/partner/v1";

export interface GGSomaProduct {
  id: number;
  slug: string;
  productCode?: string;
  name: string;
  provider?: {
    id: number;
    key: string;
    name: string;
    emoji?: { normal?: string; display?: string };
  };
  deliveryType: "LINK" | "COUPON" | "READY_ACCOUNT";
  sortOrder?: number;
  catalogPrice?: string;
  yourPrice: string; // USD unit price for reseller
  currency: string;  // "USD"
  durationDays?: number;
  warranty?: { enabled: boolean; days: number };
  stock?: { inStock: boolean; count: number; maxQuantity: number };
  bulkDiscount?: {
    enabled: boolean;
    tiers?: { minQuantity: number; maxQuantity: number | null; unitPrice: string }[];
  };
  flags?: {
    sensitiveDelivery: boolean;
    hasInstructions: boolean;
    instantDelivery: boolean;
  };
  description?: string;
  instructions?: string;
}

export interface GGSomaOrderDelivery {
  link?: string;
  code?: string;
  content?: string;
  format?: string;
  instructions?: string;
}

export interface GGSomaOrderResponse {
  ok: boolean;
  orderCode?: string;
  externalOrderId?: string;
  status?: string;
  deliveryType?: "LINK" | "COUPON" | "READY_ACCOUNT";
  product?: {
    slug: string;
    name: string;
    productCode?: string;
  };
  quantity?: number;
  unitPrice?: string;
  totalCharged?: string;
  currency?: string;
  balanceAfter?: string;
  delivery?: GGSomaOrderDelivery;
  lines?: Array<{ orderCode: string; code?: string; link?: string; content?: string }>;
  error?: {
    code: string;
    message: string;
    requestId?: string;
    required?: number;
    balance?: number;
  };
}

export interface GGSomaUsage {
  balance?: string;
  currency?: string;
  apiOrdersTotal?: number;
  apiSpendTotal?: string;
  apiOrders24h?: number;
  apiSpend24h?: string;
  requestCountToday?: number;
  errorCountToday?: number;
}

/**
 * Get active Partner API settings (from DB or process.env)
 */
export async function getGGSomaConfig(): Promise<{ apiUrl: string; apiKey: string; markupPercent: number }> {
  let apiKey = process.env.GGSOMA_API_KEY || "";
  let apiUrl = process.env.GGSOMA_API_URL || DEFAULT_BASE_URL;
  let markupPercent = 8; // default 8% markup

  try {
    const res = await db.query(
      `SELECT key, value FROM vexo_platform_settings WHERE key IN ('ggsoma_api_key', 'ggsoma_api_url', 'ggsoma_markup_percent')`
    );
    for (const row of res.rows) {
      if (row.key === "ggsoma_api_key" && row.value?.trim()) apiKey = row.value.trim();
      if (row.key === "ggsoma_api_url" && row.value?.trim()) apiUrl = row.value.trim();
      if (row.key === "ggsoma_markup_percent" && !isNaN(Number(row.value))) markupPercent = Number(row.value);
    }
  } catch {
    // Database might not be ready or table empty, proceed with env
  }

  return { apiUrl: apiUrl.replace(/\/+$/, ""), apiKey, markupPercent };
}

/**
 * Save Partner API settings into vexo_platform_settings
 */
export async function setGGSomaConfig(config: { apiKey?: string; apiUrl?: string; markupPercent?: number }, updatedBy?: number): Promise<void> {
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
         VALUES ('ggsoma_api_key', $1, NOW(), $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
        [config.apiKey.trim(), updatedBy || null]
      );
    }

    if (config.apiUrl !== undefined) {
      await client.query(
        `INSERT INTO vexo_platform_settings (key, value, updated_at, updated_by)
         VALUES ('ggsoma_api_url', $1, NOW(), $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
        [config.apiUrl.trim(), updatedBy || null]
      );
    }

    if (config.markupPercent !== undefined) {
      await client.query(
        `INSERT INTO vexo_platform_settings (key, value, updated_at, updated_by)
         VALUES ('ggsoma_markup_percent', $1, NOW(), $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
        [String(config.markupPercent), updatedBy || null]
      );
    }
  } finally {
    client.release();
  }
}

/**
 * Helper to execute HTTP requests against Partner API
 */
async function apiRequest<T>(endpoint: string, method: string = "GET", body?: unknown, explicitKey?: string): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const { apiUrl, apiKey: storedKey } = await getGGSomaConfig();
  const apiKey = explicitKey !== undefined ? explicitKey : storedKey;

  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
  };

  if (apiKey) {
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
      // @ts-ignore
      next: { revalidate: 0 },
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const errMsg = json?.error?.message || json?.message || `HTTP ${res.status}: ${res.statusText}`;
      return { ok: false, status: res.status, data: json, error: errMsg };
    }

    return { ok: true, status: res.status, data: json };
  } catch (err) {
    return { ok: false, status: 500, error: err instanceof Error ? err.message : "Network error contacting Partner API" };
  }
}

/**
 * Health check endpoint (No Auth)
 */
export async function checkGGSomaHealth(): Promise<{ ok: boolean; service?: string; version?: number; error?: string }> {
  const { apiUrl } = await getGGSomaConfig();
  try {
    const res = await fetch(`${apiUrl}/health`, { cache: "no-store" });
    const data = await res.json();
    return data;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Health check failed" };
  }
}

/**
 * Get Wallet Balance (USD)
 */
export async function getGGSomaBalance(explicitKey?: string): Promise<{ ok: boolean; balance?: string; currency?: string; error?: string }> {
  const res = await apiRequest<{ ok: boolean; balance: string; currency: string }>("/balance", "GET", undefined, explicitKey);
  if (!res.ok || !res.data) {
    return { ok: false, error: res.error || "Failed to retrieve balance" };
  }
  return res.data;
}

/**
 * Get Providers list
 */
export async function getGGSomaProviders(): Promise<{ ok: boolean; providers?: Array<Record<string, unknown>>; error?: string }> {
  const res = await apiRequest<{ data: Array<Record<string, unknown>> }>("/catalog/providers");
  if (!res.ok || !res.data) {
    return { ok: false, error: res.error || "Failed to retrieve providers" };
  }
  return { ok: true, providers: res.data.data };
}

/**
 * Get Products Catalog
 */
export async function getGGSomaProducts(provider?: string): Promise<{ ok: boolean; products?: GGSomaProduct[]; error?: string }> {
  const query = provider ? `?provider=${encodeURIComponent(provider)}` : "";
  const sep = query ? "&" : "?";
  const res = await apiRequest<{ data: GGSomaProduct[] }>(`/catalog/products${query}${sep}_t=${Date.now()}`);
  if (!res.ok || !res.data) {
    return { ok: false, error: res.error || "Failed to retrieve products catalog" };
  }
  return { ok: true, products: res.data.data || [] };
}

/**
 * Get Single Product Details
 */
export async function getGGSomaProduct(ref: string | number): Promise<{ ok: boolean; product?: GGSomaProduct; error?: string }> {
  const res = await apiRequest<GGSomaProduct>(`/catalog/products/${encodeURIComponent(ref)}`);
  if (!res.ok || !res.data) {
    return { ok: false, error: res.error || "Product not found" };
  }
  return { ok: true, product: res.data };
}

/**
 * Place Order (Instant Delivery)
 */
export async function createGGSomaOrder(params: {
  productSlug?: string;
  productId?: number;
  productCode?: string;
  quantity?: number;
  externalOrderId: string;
}): Promise<GGSomaOrderResponse> {
  const res = await apiRequest<GGSomaOrderResponse>("/orders", "POST", {
    productSlug: params.productSlug,
    productId: params.productId,
    productCode: params.productCode,
    quantity: params.quantity || 1,
    externalOrderId: params.externalOrderId,
  });

  if (!res.ok || !res.data) {
    return {
      ok: false,
      error: {
        code: (res.data as any)?.error?.code || "FAILED",
        message: res.error || "Order creation failed",
        required: (res.data as any)?.error?.required,
        balance: (res.data as any)?.error?.balance,
      },
    };
  }

  return res.data;
}

/**
 * Get Order Details + Delivery
 */
export async function getGGSomaOrder(orderCode: string): Promise<{ ok: boolean; order?: GGSomaOrderResponse; error?: string }> {
  const res = await apiRequest<GGSomaOrderResponse>(`/orders/${encodeURIComponent(orderCode)}`);
  if (!res.ok || !res.data) {
    return { ok: false, error: res.error || "Failed to retrieve order" };
  }
  return { ok: true, order: res.data };
}

/**
 * Get Usage Statistics
 */
export async function getGGSomaUsage(): Promise<{ ok: boolean; usage?: GGSomaUsage; error?: string }> {
  const res = await apiRequest<GGSomaUsage>("/usage");
  if (!res.ok || !res.data) {
    return { ok: false, error: res.error || "Failed to retrieve usage stats" };
  }
  return { ok: true, usage: res.data };
}
