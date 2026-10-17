/**
 * VEXO SMM - Live Exchange Rate Engine & Dynamic Price Calculator
 * 
 * Automatically synchronizes USD -> PKR exchange rates from live global forex feeds.
 * Ensures that if USD changes (e.g. 279 -> 290 PKR), all service prices in PKR
 * automatically recalculate in real-time with the configured 7% platform markup.
 */

import { isApiEnabled } from "@/lib/api-manager";

const DEFAULT_USD_TO_PKR = Number(process.env.USD_TO_PKR || "285.0");
export const DEFAULT_VEXO_MARKUP = Number(process.env.VEXO_MARKUP || "0.07"); // 7% profit margin
export const DEFAULT_RATE_MULTIPLIER = 1 + DEFAULT_VEXO_MARKUP; // 1.070000

// In-memory cache for live USD -> PKR rate
let cachedUsdToPkr: number | null = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

/**
 * Fetches the pure, auto-checked live USD to PKR exchange rate directly from global forex feeds.
 * Never manually set or modified.
 * USED STRICTLY FOR: Adding Funds / Deposits (0% markup guarantee for users).
 * 
 * Primary source: https://open.er-api.com/v6/latest/PKR (1 / rates.USD)
 * Secondary source: https://api.exchangerate-api.com/v4/latest/USD (rates.PKR)
 * Fallback: process.env.USD_TO_PKR or 278.0
 */
export async function getLiveForexUsdRate(): Promise<number> {
  if (!(await isApiEnabled("exchange_rates"))) {
    return DEFAULT_USD_TO_PKR;
  }

  const now = Date.now();
  if (cachedUsdToPkr && (now - lastFetchTimestamp) < CACHE_TTL_MS) {
    return cachedUsdToPkr;
  }

  // 1. Try Primary: open.er-api.com
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("https://open.er-api.com/v6/latest/PKR", {
      signal: controller.signal,
      headers: { "User-Agent": "VexaroSMM/1.0 (vexarosmm.com)" },
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const pkrToUsd = Number(data?.rates?.USD);
      if (Number.isFinite(pkrToUsd) && pkrToUsd > 0) {
        const rate = Math.round((1 / pkrToUsd) * 100) / 100;
        cachedUsdToPkr = rate;
        lastFetchTimestamp = now;
        return rate;
      }
    }
  } catch (err) {
    console.warn("Primary forex feed failed, trying secondary fallback:", (err as Error).message);
  }

  // 2. Try Secondary: exchangerate-api.com
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
      signal: controller.signal,
      headers: { "User-Agent": "VexaroSMM/1.0 (vexarosmm.com)" },
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const usdToPkr = Number(data?.rates?.PKR);
      if (Number.isFinite(usdToPkr) && usdToPkr > 0) {
        const rate = Math.round(usdToPkr * 100) / 100;
        cachedUsdToPkr = rate;
        lastFetchTimestamp = now;
        return rate;
      }
    }
  } catch (err) {
    console.warn("Secondary forex feed failed:", (err as Error).message);
  }

  // 3. Fallback to cached or env variable
  if (cachedUsdToPkr) {
    return cachedUsdToPkr;
  }
  return DEFAULT_USD_TO_PKR;
}

let cachedOrderRateData: { forexRate: number; markupPercent: number; effectiveRate: number; mode: string } | null = null;
let lastOrderRateFetchTimestamp = 0;
const ORDER_RATE_CACHE_TTL_MS = 30 * 1000; // 30 seconds cache for rapid admin updates

export function invalidateExchangeRateCache(): void {
  cachedUsdToPkr = null;
  lastFetchTimestamp = 0;
  cachedOrderRateData = null;
  lastOrderRateFetchTimestamp = 0;
}

/**
 * Reads the Dollar Markup percentage for Orders from platform settings.
 * Default is 8%.
 * This markup is applied strictly to service prices & orders, NEVER to deposits/wallet funding.
 */
export async function getOrderDollarMarkupPercent(): Promise<number> {
  try {
    const { getPlatformSetting } = await import("@/lib/admin");
    const markupStr = await getPlatformSetting("dollar_order_markup", "");
    if (markupStr && Number(markupStr) >= 0) {
      return Number(markupStr);
    }
    const globalMarginStr = await getPlatformSetting("global_profit_margin", "");
    if (globalMarginStr && Number(globalMarginStr) >= 0) {
      return Number(globalMarginStr);
    }
  } catch {
    // Database query fallback
  }
  return DEFAULT_VEXO_MARKUP * 100; // 7-8%
}

/**
 * Returns the effective Dollar rate used for calculating all service & order prices.
 * Supports:
 * 1. "manual" mode: Uses the admin-configured real dollar rate (e.g. ₨285.00 / USD).
 * 2. "auto" mode: Uses live global forex feed + configured dollar markup % (e.g. 277 * 1.08 = 299.16).
 */
export async function getOrderDollarRate(): Promise<{
  forexRate: number;
  markupPercent: number;
  effectiveRate: number;
  mode: "manual" | "auto";
}> {
  const now = Date.now();
  if (cachedOrderRateData && (now - lastOrderRateFetchTimestamp) < ORDER_RATE_CACHE_TTL_MS) {
    return cachedOrderRateData as { forexRate: number; markupPercent: number; effectiveRate: number; mode: "manual" | "auto" };
  }

  const forexRate = await getLiveForexUsdRate();
  let mode: "manual" | "auto" = "manual";
  let manualRate = 285.00;
  let markupPercent = 8.0;

  try {
    const { getPlatformSetting } = await import("@/lib/admin");
    const modeSetting = await getPlatformSetting("dollar_rate_mode", "manual");
    if (modeSetting === "auto") {
      mode = "auto";
    }

    const manualSetting = await getPlatformSetting("manual_dollar_rate", "") || await getPlatformSetting("usd_to_pkr", "285.00");
    const parsedManual = Number(manualSetting);
    if (Number.isFinite(parsedManual) && parsedManual >= 200 && parsedManual <= 600) {
      manualRate = parsedManual;
    }

    markupPercent = await getOrderDollarMarkupPercent();
  } catch (err) {
    console.warn("Failed to load platform dollar rate settings, using defaults:", err);
  }

  let effectiveRate: number;
  if (mode === "auto") {
    effectiveRate = Math.round(forexRate * (1 + markupPercent / 100) * 100) / 100;
  } else {
    effectiveRate = manualRate;
  }

  // Sanity check: Ensure effective rate is never dangerously low
  if (!Number.isFinite(effectiveRate) || effectiveRate < 200) {
    effectiveRate = 285.00;
  }

  const result = {
    forexRate,
    markupPercent,
    effectiveRate,
    mode,
  };

  cachedOrderRateData = result;
  lastOrderRateFetchTimestamp = now;

  return result;
}

/**
 * Returns the effective live USD to PKR rate for all service catalog pricing and order fulfillment.
 * Uses the real dollar rate (Manual setting or Forex + Markup) so that the admin NEVER suffers an exchange rate loss.
 */
export async function getLiveUsdToPkrRate(): Promise<number> {
  const orderRate = await getOrderDollarRate();
  return orderRate.effectiveRate;
}

/**
 * Calculates real-time PKR price from upstream USD rate, multiplier, and live exchange rate.
 * Formula: baseRateUsd * liveUsdToPkr * multiplier
 * Returns rounded price with up to 4 decimal places.
 */
export function calculateLivePricePkr(
  baseRateUsd: number | string,
  rateMultiplier: number | string = DEFAULT_RATE_MULTIPLIER,
  liveUsdToPkrRate: number = DEFAULT_USD_TO_PKR
): number {
  const usd = Number(baseRateUsd);
  if (!Number.isFinite(usd) || usd <= 0) return 0;

  const mult = Number(rateMultiplier);
  const effectiveMultiplier = Number.isFinite(mult) && mult > 0 ? mult : DEFAULT_RATE_MULTIPLIER;
  const rate = Number.isFinite(liveUsdToPkrRate) && liveUsdToPkrRate > 0 ? liveUsdToPkrRate : DEFAULT_USD_TO_PKR;

  return Math.round(usd * rate * effectiveMultiplier * 10000) / 10000;
}

export function isPackageService(
  serviceType?: string,
  min?: number | string,
  max?: number | string
): boolean {
  const isTypePkg = serviceType?.toLowerCase() === "package";
  const isOneLimit = Number(min) === 1 && Number(max) === 1;
  return Boolean(isTypePkg || isOneLimit);
}

export function calculateLiveChargePkr(
  ratePkr: number,
  quantity: number,
  isPkg: boolean = false
): number {
  const q = Number(quantity);
  const r = Number(ratePkr);
  if (!Number.isFinite(q) || q <= 0 || !Number.isFinite(r) || r <= 0) return 0;
  if (isPkg) {
    return Math.round((r * q + Number.EPSILON) * 100) / 100;
  }
  return Math.round(((q * (r / 1000)) + Number.EPSILON) * 100) / 100;
}
