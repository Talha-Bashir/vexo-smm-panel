import {
  checkElevateXHealth,
  getElevateXBalance,
  getElevateXConfig,
  setElevateXConfig,
  getElevateXProducts,
  createElevateXOrder,
  getElevateXOrder,
  type ElevateXProduct,
  type ElevateXBalanceResponse,
  type ElevateXOrderResponse,
} from "./elevatex-api";

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

export async function getGGSomaConfig() {
  return getElevateXConfig();
}

export async function setGGSomaConfig(config: { apiKey?: string; apiUrl?: string; markupPercent?: number }, updatedBy?: number) {
  return setElevateXConfig(config, updatedBy);
}

export async function checkGGSomaHealth(): Promise<{ ok: boolean; service?: string; version?: number; error?: string }> {
  const res = await checkElevateXHealth();
  return {
    ok: res.ok,
    service: res.service || "ElevateX Light-Speed Reseller Gateway",
    version: 1,
    error: res.error,
  };
}

export async function getGGSomaBalance(explicitKey?: string): Promise<{
  ok: boolean;
  balance?: string;
  balance_pkr?: string;
  currency?: string;
  user_id?: number;
  label?: string;
  tier?: string;
  discount_pct?: number;
  rate_limit_per_min?: number;
  total_orders?: number;
  total_volume_usdt?: string;
  error?: string;
}> {
  const res = await getElevateXBalance(explicitKey);
  if (!res.ok) {
    return { ok: false, error: res.error || "Failed to retrieve balance" };
  }
  return {
    ok: true,
    balance: res.balance_usdt || "0.00",
    balance_pkr: res.balance_pkr || "0",
    currency: "USD",
    user_id: res.user_id,
    label: res.label,
    tier: res.tier,
    discount_pct: res.discount_pct,
    rate_limit_per_min: res.rate_limit_per_min,
    total_orders: res.total_orders,
    total_volume_usdt: res.total_volume_usdt,
  };
}

export async function getGGSomaProviders(): Promise<{ ok: boolean; providers?: Array<Record<string, unknown>>; error?: string }> {
  return {
    ok: true,
    providers: [
      { id: 1, key: "elevatex", name: "ElevateX Store Gateway", emoji: { normal: "⚡", display: "⚡" } },
    ],
  };
}

export async function getGGSomaProducts(provider?: string): Promise<{ ok: boolean; products?: GGSomaProduct[]; error?: string }> {
  const res = await getElevateXProducts();
  if (!res.ok || !res.products) {
    return { ok: false, error: res.error || "Failed to retrieve products catalog" };
  }

  const mapped: GGSomaProduct[] = res.products
    .filter((p) => {
      const price = parseFloat(p.price_usdt || "0");
      const isTestZero = p.name.toUpperCase().includes("API ORDER TESTING") || price <= 0;
      return !isTestZero;
    })
    .map((p, idx) => {
      const rawDelivery = (p.description || "").toLowerCase().includes("link") || p.name.toLowerCase().includes("link")
      ? "LINK"
      : (p.description || "").toLowerCase().includes("coupon") || p.name.toLowerCase().includes("coupon")
        ? "COUPON"
        : "READY_ACCOUNT";

    // Extract duration from name or default 30
    let duration = 30;
    const daysMatch = p.name.match(/(\d+)\s*(days|day|d)/i);
    const monthsMatch = p.name.match(/(\d+)\s*(months|month|m)/i);
    const yearsMatch = p.name.match(/(\d+)\s*(years|year|y)/i);

    if (daysMatch) duration = parseInt(daysMatch[1], 10);
    else if (monthsMatch) duration = parseInt(monthsMatch[1], 10) * 30;
    else if (yearsMatch) duration = parseInt(yearsMatch[1], 10) * 365;

    return {
      id: idx + 1,
      slug: p.id,
      productCode: p.id,
      name: p.name,
      provider: {
        id: 1,
        key: "elevatex",
        name: "ElevateX Store Gateway",
      },
      deliveryType: rawDelivery,
      yourPrice: p.price_usdt || "0.00",
      currency: "USD",
      durationDays: duration,
      warranty: {
        enabled: Boolean(p.warranty),
        days: duration > 30 ? 30 : duration,
      },
      stock: {
        inStock: p.stock > 0,
        count: p.stock,
        maxQuantity: p.stock,
      },
      description: p.description || p.name,
    };
  });

  return { ok: true, products: mapped };
}

export async function getGGSomaProduct(ref: string | number): Promise<{ ok: boolean; product?: GGSomaProduct; error?: string }> {
  const all = await getGGSomaProducts();
  if (!all.ok || !all.products) return { ok: false, error: "Product not found" };
  const target = all.products.find(p => p.slug === String(ref) || String(p.id) === String(ref));
  if (!target) return { ok: false, error: "Product not found" };
  return { ok: true, product: target };
}

export async function createGGSomaOrder(params: {
  productSlug?: string;
  productId?: number | string;
  productCode?: string;
  quantity?: number;
  externalOrderId: string;
}): Promise<GGSomaOrderResponse> {
  const targetId = params.productSlug || params.productCode || String(params.productId || "");
  const res = await createElevateXOrder({
    productId: targetId,
    quantity: params.quantity || 1,
    customRef: params.externalOrderId,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: {
        code: "FAILED",
        message: res.error || "Order creation failed",
      },
    };
  }

  const deliveryContent = Array.isArray(res.delivery) ? res.delivery.join("\n") : (res.delivery || "");

  return {
    ok: true,
    orderCode: res.order_id,
    externalOrderId: res.custom_ref,
    status: res.status,
    product: {
      slug: res.product_id || targetId,
      name: res.product_name || targetId,
    },
    quantity: res.quantity || 1,
    unitPrice: res.unit_price_usdt,
    totalCharged: res.total_usdt,
    currency: "USD",
    balanceAfter: res.remaining_balance_usdt,
    delivery: {
      content: deliveryContent,
      instructions: "Delivered via ElevateX Reseller Gateway.",
    },
  };
}

export async function getGGSomaOrder(orderCode: string): Promise<{ ok: boolean; order?: GGSomaOrderResponse; error?: string }> {
  const res = await getElevateXOrder(orderCode);
  if (!res.ok || !res.order) return { ok: false, error: res.error || "Order not found" };
  return {
    ok: true,
    order: {
      ok: true,
      orderCode: res.order.order_id,
      externalOrderId: res.order.custom_ref,
      status: res.order.status,
      delivery: {
        content: Array.isArray(res.order.delivery) ? res.order.delivery.join("\n") : "",
      },
    },
  };
}

export async function getGGSomaUsage(): Promise<{ ok: boolean; usage?: GGSomaUsage; error?: string }> {
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
    } as any,
  };
}
