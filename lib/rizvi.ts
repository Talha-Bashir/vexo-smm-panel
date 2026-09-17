const API_URL =
  process.env.RIZVI_API_URL || "https://rizvismmpanels.com/api/v2";

const API_KEY =
  process.env.RIZVI_API_KEY || process.env.PROVIDER_5_KEY || "04968c4867c7385287482cf0cf73246d";

type RizviResponse = unknown;

async function rizviRequest(
  params: Record<string, string>
): Promise<RizviResponse> {
  if (!API_KEY) {
    throw new Error("RIZVI_API_KEY is missing from .env.local");
  }

  const body = new URLSearchParams({
    key: API_KEY,
    ...params,
  });

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const text = await response.text();

  if (process.env.NODE_ENV === "development" && process.env.DEBUG_API === "true") {
    console.log("RIZVI HTTP STATUS:", response.status);
  }

  if (!response.ok) {
    throw new Error(`Rizvi API returned HTTP ${response.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Rizvi returned invalid JSON: ${text}`);
  }
}

let cachedServices: unknown = null;
let servicesCachedAt = 0;
const SERVICES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getRizviServices(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedServices && now - servicesCachedAt < SERVICES_CACHE_TTL) {
    return cachedServices;
  }

  try {
    const data = await rizviRequest({
      action: "services",
    });
    cachedServices = data;
    servicesCachedAt = now;
    return data;
  } catch (error) {
    if (cachedServices) {
      console.warn("Returning stale Rizvi services due to error:", error);
      return cachedServices;
    }
    throw error;
  }
}

export async function getRizviBalance() {
  return rizviRequest({
    action: "balance",
  });
}

export async function getRizviOrderStatus(orderId: string) {
  return rizviRequest({
    action: "status",
    order: orderId,
  });
}

export async function addRizviOrder(
  serviceId: string,
  link: string,
  quantity: string
) {
  return rizviRequest({
    action: "add",
    service: serviceId,
    link,
    quantity,
  });
}

export async function requestRizviRefill(orderId: string) {
  return rizviRequest({
    action: "refill",
    order: orderId,
  });
}

export async function getRizviRefillStatus(refillId: string) {
  return rizviRequest({
    action: "refill_status",
    refill: refillId,
  });
}