import { db } from "@/lib/db";

export const DEFAULT_ELEVATEX_BASE_URL = "https://shop.elevatexbyzaid.com/api/v1";
export const DEFAULT_ELEVATEX_API_KEY = "elx_live_d51b6cc732614d6193403be374080a18ffda4a65";

export interface ElevateXRawProduct {
  id: string; // e.g. "elx-9BF63764"
  name: string;
  category: string;
  stock: number;
  price_usdt: string;
  price_pkr: string;
  retail_price_usdt?: string;
  warranty?: string;
  description?: string;
  [key: string]: unknown;
}

export interface ElevateXProduct {
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
  isUnderMaintenance?: boolean;
}

export type ElevateXCatalogProduct = ElevateXProduct;

export interface ElevateXBalanceResponse {
  ok: boolean;
  user_id?: number;
  label?: string;
  tier?: string;
  discount_pct?: number;
  balance?: string;
  balance_usdt?: string;
  balance_pkr?: string;
  currency?: string;
  rate_limit_per_min?: number;
  total_orders?: number;
  total_volume_usdt?: string;
  status?: string;
  error?: string;
  [key: string]: unknown;
}

export interface ElevateXOrderDelivery {
  link?: string;
  code?: string;
  content?: string;
  format?: string;
  instructions?: string;
}

export interface ElevateXOrderResponse {
  ok: boolean;
  order_id?: string;
  orderCode?: string;
  custom_ref?: string;
  externalOrderId?: string;
  product_id?: string;
  product_name?: string;
  product?: {
    slug: string;
    name: string;
    productCode?: string;
  };
  quantity?: number;
  unit_price_usdt?: string;
  unitPrice?: string;
  total_usdt?: string;
  totalCharged?: string;
  currency?: string;
  remaining_balance_usdt?: string;
  balanceAfter?: string;
  status?: string;
  deliveryType?: "LINK" | "COUPON" | "READY_ACCOUNT";
  delivery?: ElevateXOrderDelivery;
  raw_delivery?: string[];
  lines?: Array<{ orderCode: string; code?: string; link?: string; content?: string }>;
  created_at?: string;
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
    required?: number;
    balance?: number;
  } | string;
  [key: string]: unknown;
}

export interface ElevateXUsage {
  balance?: string;
  currency?: string;
  apiOrdersTotal?: number;
  apiSpendTotal?: string;
  apiOrders24h?: number;
  apiSpend24h?: string;
  requestCountToday?: number;
  errorCountToday?: number;
  rateLimitPerMin?: number;
  [key: string]: unknown;
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
      `SELECT key, value FROM vexo_platform_settings WHERE key IN ('elevatex_api_key', 'elevatex_api_url', 'elevatex_markup_percent')`
    );
    for (const row of res.rows) {
      if (row.key === "elevatex_api_key" && row.value?.trim()) apiKey = row.value.trim();
      if (row.key === "elevatex_api_url" && row.value?.trim()) apiUrl = row.value.trim();
      if (row.key === "elevatex_markup_percent" && !isNaN(Number(row.value))) {
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
      signal: AbortSignal.timeout(4500),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const errMsg = json?.error || json?.message || `HTTP ${res.status}: ${res.statusText}`;
      const isMaint = res.status === 503 || res.status === 502 || String(errMsg).toLowerCase().includes("maint");
      return { ok: false, status: res.status, data: json, error: errMsg, isMaintenance: isMaint } as any;
    }

    return { ok: true, status: res.status, data: json };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: err instanceof Error ? err.message : "Network error contacting ElevateX Gateway",
      isMaintenance: true,
    } as any;
  }
}

export interface ElevateXHealthResponse {
  ok: boolean;
  service?: string;
  status?: string;
  version?: number | string;
  isMaintenance?: boolean;
  error?: string;
  [key: string]: unknown;
}

let cachedHealthState: { result: ElevateXHealthResponse; time: number } | null = null;

/**
 * Ping / Health Check (Sub-millisecond uptime check with 8-second memory cache)
 */
export async function checkElevateXHealth(forceRefresh = false): Promise<ElevateXHealthResponse> {
  const now = Date.now();
  if (!forceRefresh && cachedHealthState && (now - cachedHealthState.time < 8000)) {
    return cachedHealthState.result;
  }

  const { apiUrl } = await getElevateXConfig();
  try {
    const res = await fetch(`${apiUrl}/ping`, { cache: "no-store", signal: AbortSignal.timeout(3500) });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const errRes: ElevateXHealthResponse = {
        ok: false,
        status: "maintenance",
        isMaintenance: true,
        error: data?.error || `HTTP ${res.status}`,
      };
      cachedHealthState = { result: errRes, time: now };
      return errRes;
    }

    const isMaint = Boolean(
      data?.status === "maintenance" ||
      data?.status === "offline" ||
      data?.maintenance === true ||
      (typeof data?.status === "string" && data.status.toLowerCase().includes("maintain"))
    );

    const result: ElevateXHealthResponse = {
      ok: res.ok && !isMaint,
      service: data?.service || "ElevateX Light-Speed Reseller Gateway",
      version: 1,
      isMaintenance: isMaint,
      status: data?.status || (isMaint ? "maintenance" : "ok"),
      error: data?.error,
    };

    cachedHealthState = { result, time: now };
    return result;
  } catch (err) {
    const failRes: ElevateXHealthResponse = {
      ok: false,
      service: "ElevateX Light-Speed Reseller Gateway",
      version: 1,
      status: "maintenance",
      isMaintenance: true,
      error: err instanceof Error ? err.message : "ElevateX ping timed out or offline",
    };
    cachedHealthState = { result: failRes, time: now };
    return failRes;
  }
}

export interface ElevateBotMaintenanceStatus {
  isMaintenance: boolean;
  message: string;
  mode?: "auto" | "force_on" | "force_off";
  reason?: "upstream_maintenance" | "api_disabled" | "admin_toggle" | "unreachable" | "none";
  upstreamStatus?: string;
}

/**
 * Check whether Elevate Bot is currently under maintenance
 * (evaluates database platform settings, API toggles, and AUTOMATIC upstream gateway health)
 */
export async function getElevateBotMaintenanceStatus(prefetchedHealth?: ElevateXHealthResponse): Promise<ElevateBotMaintenanceStatus> {
  let manualMode: "auto" | "force_on" | "force_off" = "auto";
  let customMsg = "We are maintaining our services, please come back later.";
  let apiEnabled = true;

  // 1. Check database platform settings
  try {
    const res = await db.query(
      `SELECT key, value FROM vexo_platform_settings WHERE key IN ('elevatex_maintenance_mode', 'elevatex_maintenance_message', 'api_toggle_elevatex_bot')`
    );

    for (const row of res.rows) {
      if (row.key === "elevatex_maintenance_mode") {
        const val = String(row.value).trim().toLowerCase();
        if (val === "true" || val === "force_on" || val === "on") {
          manualMode = "force_on";
        } else if (val === "false" || val === "force_off" || val === "off") {
          manualMode = "force_off";
        } else {
          manualMode = "auto";
        }
      }
      if (row.key === "elevatex_maintenance_message" && row.value?.trim()) {
        customMsg = row.value.trim();
      }
      if (row.key === "api_toggle_elevatex_bot" && String(row.value).trim().toLowerCase() === "false") {
        apiEnabled = false;
      }
    }

    // Explicit manual override by administrator
    if (manualMode === "force_on") {
      return {
        isMaintenance: true,
        message: customMsg,
        mode: "force_on",
        reason: "admin_toggle",
      };
    }

    if (!apiEnabled) {
      return {
        isMaintenance: true,
        message: customMsg,
        mode: manualMode,
        reason: "api_disabled",
      };
    }

    if (manualMode === "force_off") {
      return {
        isMaintenance: false,
        message: "",
        mode: "force_off",
        reason: "none",
      };
    }
  } catch {
    // If DB check fails, proceed with auto detection
  }

  // 2. AUTOMATIC MODE: Probe upstream Telegram bot / ElevateX gateway health
  try {
    const health = prefetchedHealth || (await checkElevateXHealth());
    if (health.isMaintenance || health.status === "maintenance" || !health.ok) {
      return {
        isMaintenance: true,
        message: customMsg || "We are maintaining our services, please come back later.",
        mode: "auto",
        reason: health.status === "maintenance" ? "upstream_maintenance" : "unreachable",
        upstreamStatus: health.status || "offline",
      };
    }
  } catch {
    return {
      isMaintenance: true,
      message: customMsg || "We are maintaining our services, please come back later.",
      mode: "auto",
      reason: "unreachable",
      upstreamStatus: "offline",
    };
  }

  return {
    isMaintenance: false,
    message: "",
    mode: "auto",
    reason: "none",
    upstreamStatus: "online",
  };
}

/**
 * Update Elevate Bot maintenance mode and message in database
 */
export async function setElevateBotMaintenance(
  setting: boolean | "auto" | "force_on" | "force_off",
  message?: string,
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

    const modeValue =
      setting === "auto"
        ? "auto"
        : setting === true || setting === "force_on"
          ? "force_on"
          : "force_off";

    await client.query(
      `INSERT INTO vexo_platform_settings (key, value, updated_at, updated_by)
       VALUES ('elevatex_maintenance_mode', $1, NOW(), $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
      [modeValue, updatedBy || null]
    );

    if (message !== undefined) {
      await client.query(
        `INSERT INTO vexo_platform_settings (key, value, updated_at, updated_by)
         VALUES ('elevatex_maintenance_message', $1, NOW(), $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
        [message.trim() || "We are maintaining our services, please come back later.", updatedBy || null]
      );
    }
  } finally {
    client.release();
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
  const bal = res.data;
  return {
    ...bal,
    ok: true,
    balance: bal.balance_usdt || "0.00",
    balance_usdt: bal.balance_usdt || "0.00",
    balance_pkr: bal.balance_pkr || "0",
    currency: "USD",
  };
}

/**
 * Get Raw Live Products Inventory Catalog from Gateway
 */
export async function getElevateXRawProducts(): Promise<{ ok: boolean; count?: number; products?: ElevateXRawProduct[]; error?: string }> {
  const res = await elevateXRequest<{ ok: boolean; count: number; products: ElevateXRawProduct[] }>(`/products?_t=${Date.now()}`);
  if (res.ok && res.data?.products && res.data.products.length > 0) {
    // Persist to DB cache so that if upstream goes offline during maintenance, services still show!
    try {
      await db.query(`
        INSERT INTO vexo_platform_settings (key, value, updated_at)
        VALUES ('elevatex_cached_products', $1, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `, [JSON.stringify(res.data.products)]).catch(() => {});
    } catch {}

    return { ok: true, count: res.data.count, products: res.data.products };
  }

  // If live fetch failed, attempt to retrieve from persistent cache
  try {
    const cacheRes = await db.query(
      `SELECT value FROM vexo_platform_settings WHERE key = 'elevatex_cached_products'`
    );
    if (cacheRes.rows.length > 0 && cacheRes.rows[0].value) {
      const cached = JSON.parse(cacheRes.rows[0].value);
      if (Array.isArray(cached) && cached.length > 0) {
        return { ok: true, count: cached.length, products: cached };
      }
    }
  } catch {}

  return { ok: false, error: res.error || "Failed to retrieve ElevateX products catalog" };
}

/**
 * Format raw products into clean ElevateXProduct objects
 */
function mapRawProductsToCatalog(rawProducts: ElevateXRawProduct[]): ElevateXProduct[] {
  return rawProducts
    .filter((p) => {
      const price = parseFloat(p.price_usdt || (p.price as any) || "0");
      const isTestZero = p.name.toUpperCase().includes("API ORDER TESTING") || price <= 0;
      const isManual = String(p.id).startsWith("MAN-");
      return !isTestZero && !isManual;
    })
    .map((p, idx) => {
      const rawDelivery = (p.description || "").toLowerCase().includes("link") || p.name.toLowerCase().includes("link")
        ? "LINK"
        : (p.description || "").toLowerCase().includes("coupon") || p.name.toLowerCase().includes("coupon")
          ? "COUPON"
          : "READY_ACCOUNT";

      let duration = 30;
      const daysMatch = p.name.match(/(\d+)\s*(days|day|d)/i);
      const monthsMatch = p.name.match(/(\d+)\s*(months|month|m)/i);
      const yearsMatch = p.name.match(/(\d+)\s*(years|year|y)/i);

      if (daysMatch) duration = parseInt(daysMatch[1], 10);
      else if (monthsMatch) duration = parseInt(monthsMatch[1], 10) * 30;
      else if (yearsMatch) duration = parseInt(yearsMatch[1], 10) * 365;

      const pStock = Number(p.stock ?? 0);

      return {
        id: idx + 1,
        slug: p.id,
        productCode: p.id,
        name: p.name,
        provider: {
          id: 1,
          key: "elevatex",
          name: "ElevateX Store Gateway",
          emoji: { normal: "⚡", display: "⚡" },
        },
        deliveryType: rawDelivery,
        yourPrice: String(p.price_usdt || (p.price as any) || "0.00"),
        currency: "USD",
        durationDays: duration,
        warranty: {
          enabled: Boolean(p.warranty),
          days: duration > 30 ? 30 : duration,
        },
        stock: {
          inStock: pStock > 0,
          count: pStock,
          maxQuantity: pStock,
        },
        description: p.description || p.name,
      };
    });
}

/**
 * Get Mapped and Formatted Live Products Catalog for Subscriptions & Dashboard
 */
export async function getElevateXProducts(_provider?: string): Promise<{ ok: boolean; products?: ElevateXProduct[]; count?: number; error?: string }> {
  const res = await getElevateXRawProducts();
  if (!res.ok || !res.products) {
    return { ok: false, error: res.error || "Failed to retrieve products catalog" };
  }

  const mapped = mapRawProductsToCatalog(res.products);
  return { ok: true, products: mapped, count: mapped.length };
}

export const getElevateXCatalogProducts = getElevateXProducts;

/**
 * Retrieve a specific ElevateX product by slug or numeric ID
 */
export async function getElevateXProduct(ref: string | number): Promise<{ ok: boolean; product?: ElevateXProduct; error?: string }> {
  const all = await getElevateXProducts();
  if (!all.ok || !all.products) return { ok: false, error: "Product not found" };
  const target = all.products.find(p => p.slug === String(ref) || String(p.id) === String(ref));
  if (!target) return { ok: false, error: "Product not found" };
  return { ok: true, product: target };
}

/**
 * Execute an automated wholesale purchase on ElevateX
 */
export async function createElevateXOrder(params: {
  productId?: string | number;
  productSlug?: string;
  productCode?: string;
  quantity?: number;
  customRef?: string;
  externalOrderId?: string;
}): Promise<ElevateXOrderResponse> {
  const targetId = String(params.productSlug || params.productCode || params.productId || "");
  const orderRef = params.customRef || params.externalOrderId || `VEXO-${Date.now()}`;

  const res = await elevateXRequest<{
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
    delivery?: string[] | string;
    created_at?: string;
    error?: string;
  }>("/orders", "POST", {
    product_id: targetId,
    quantity: params.quantity || 1,
    custom_ref: orderRef,
  });

  if (!res.ok || !res.data) {
    const errMsg = res.error || (res.data as any)?.error || "Order creation failed";
    return {
      ok: false,
      error: {
        code: "FAILED",
        message: errMsg,
      },
    };
  }

  const rawData = res.data;
  const deliveryArray = Array.isArray(rawData.delivery) ? rawData.delivery : rawData.delivery ? [rawData.delivery] : [];
  const deliveryContent = deliveryArray.join("\n");

  const rawDeliveryType = (deliveryContent.toLowerCase().includes("http") || deliveryContent.toLowerCase().includes("link"))
    ? "LINK"
    : deliveryContent.toLowerCase().includes("coupon")
      ? "COUPON"
      : "READY_ACCOUNT";

  return {
    ok: true,
    order_id: rawData.order_id,
    orderCode: rawData.order_id,
    custom_ref: rawData.custom_ref,
    externalOrderId: rawData.custom_ref,
    status: rawData.status,
    deliveryType: rawDeliveryType,
    product_id: rawData.product_id || targetId,
    product_name: rawData.product_name || targetId,
    product: {
      slug: rawData.product_id || targetId,
      name: rawData.product_name || targetId,
    },
    quantity: rawData.quantity || params.quantity || 1,
    unit_price_usdt: rawData.unit_price_usdt,
    unitPrice: rawData.unit_price_usdt,
    total_usdt: rawData.total_usdt,
    totalCharged: rawData.total_usdt,
    currency: "USD",
    remaining_balance_usdt: rawData.remaining_balance_usdt,
    balanceAfter: rawData.remaining_balance_usdt,
    raw_delivery: deliveryArray,
    delivery: {
      content: deliveryContent,
      instructions: "Delivered via ElevateX Reseller Gateway.",
    },
    created_at: rawData.created_at,
  };
}

/**
 * Check past order details and credentials
 */
export async function getElevateXOrder(orderId: string): Promise<{ ok: boolean; order?: ElevateXOrderResponse; error?: string }> {
  const res = await elevateXRequest<{
    ok: boolean;
    order_id?: string;
    custom_ref?: string;
    status?: string;
    delivery?: string[] | string;
    product_id?: string;
    product_name?: string;
  }>(`/orders/${encodeURIComponent(orderId)}`);

  if (!res.ok || !res.data) {
    return { ok: false, error: res.error || "Failed to retrieve ElevateX order" };
  }

  const raw = res.data;
  const deliveryArray = Array.isArray(raw.delivery) ? raw.delivery : raw.delivery ? [raw.delivery] : [];
  return {
    ok: true,
    order: {
      ok: true,
      order_id: raw.order_id,
      orderCode: raw.order_id,
      custom_ref: raw.custom_ref,
      externalOrderId: raw.custom_ref,
      status: raw.status,
      delivery: {
        content: deliveryArray.join("\n"),
      },
    },
  };
}

/**
 * List available provider connections
 */
export async function getElevateXProviders(): Promise<{ ok: boolean; providers?: Array<Record<string, unknown>>; error?: string }> {
  return {
    ok: true,
    providers: [
      { id: 1, key: "elevatex", name: "ElevateX Store Gateway", emoji: { normal: "⚡", display: "⚡" } },
    ],
  };
}

/**
 * Get reseller API usage statistics
 */
export async function getElevateXUsage(): Promise<{ ok: boolean; usage?: ElevateXUsage; error?: string }> {
  const bal = await getElevateXBalance();
  if (!bal.ok) return { ok: false, error: bal.error };
  return {
    ok: true,
    usage: {
      balance: bal.balance_usdt || "0.00",
      currency: "USDT",
      apiOrdersTotal: bal.total_orders || 0,
      apiSpendTotal: bal.total_volume_usdt || "0.00",
      rateLimitPerMin: bal.rate_limit_per_min || 120,
    },
  };
}
