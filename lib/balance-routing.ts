import { db } from "@/lib/db";
import { calculateLivePricePkr } from "@/lib/exchange-rate";

export const MIN_PROVIDER_BALANCE_THRESHOLD_USD = 0.50;

export interface FallbackQueueCandidate {
  rank: number;
  providerId: string;
  providerName?: string;
  remoteServiceId: string;
  rateUsd: number;
  isGuaranteed?: boolean;
}

export interface EffectiveServicePricing {
  activeProviderId: string;
  activeRemoteServiceId: string;
  baseRateUsd: number;
  rateMultiplier: number;
  rateUsd: number;
  ratePkr: number;
  isFunded: boolean;
}

/**
 * Retrieves current cached provider balances from PostgreSQL.
 * Fast single-query execution with zero external network overhead.
 */
export async function getCachedProviderBalances(): Promise<Map<string, number>> {
  const balanceMap = new Map<string, number>();
  try {
    const res = await db.query(
      `SELECT id, balance_usd, enabled, last_sync_at
       FROM vexo_providers
       WHERE enabled = true`
    );
    const now = Date.now();
    const maxStaleMs = 24 * 60 * 60 * 1000; // 24 hours
    for (const row of res.rows) {
      const lastSync = row.last_sync_at ? new Date(row.last_sync_at).getTime() : 0;
      const isFresh = lastSync > 0 && now - lastSync <= maxStaleMs;
      balanceMap.set(String(row.id), isFresh ? Number(row.balance_usd || 0) : 0);
    }
  } catch (err) {
    console.warn("Could not query provider balances:", err);
  }
  return balanceMap;
}

/**
 * Finds the lowest-cost funded candidate provider in the service's fallback queue.
 * If none meet the threshold, safely falls back to the primary (cheapest) candidate.
 */
export function selectFundedProviderCandidate(
  fallbackQueue: FallbackQueueCandidate[] | null | undefined,
  defaultProviderId: string,
  defaultRemoteServiceId: string,
  defaultBaseRateUsd: number,
  balances: Map<string, number>,
  minThresholdUsd: number = MIN_PROVIDER_BALANCE_THRESHOLD_USD
): { candidate: FallbackQueueCandidate; isFunded: boolean } {
  const queue = Array.isArray(fallbackQueue) ? fallbackQueue : [];

  // 1. Search for the lowest-cost provider that actually has balance >= threshold
  //    within a reasonable rate tolerance of the primary service rate
  for (const item of queue) {
    const pId = String(item.providerId || "");
    const bal = balances.get(pId) ?? 0;
    const itemRate = Number(item.rateUsd || 0);
    const withinTolerance = defaultBaseRateUsd <= 0 || itemRate <= defaultBaseRateUsd * 1.05;
    if (bal >= minThresholdUsd && withinTolerance) {
      return {
        candidate: {
          rank: item.rank,
          providerId: pId,
          providerName: item.providerName,
          remoteServiceId: String(item.remoteServiceId),
          rateUsd: itemRate,
          isGuaranteed: item.isGuaranteed,
        },
        isFunded: true,
      };
    }
  }

  // 2. Fallback: Use the service's active provider & rate so catalog price always matches the upstream API
  const primaryQueue = queue.find(
    (q) => String(q.providerId) === String(defaultProviderId) && String(q.remoteServiceId) === String(defaultRemoteServiceId)
  ) || queue[0];

  const activeProviderId = defaultProviderId || (primaryQueue ? String(primaryQueue.providerId) : "");
  const activeRemoteServiceId = defaultRemoteServiceId || (primaryQueue ? String(primaryQueue.remoteServiceId) : "");
  const activeBaseRateUsd = defaultBaseRateUsd > 0 ? defaultBaseRateUsd : (primaryQueue ? Number(primaryQueue.rateUsd) : 0);

  return {
    candidate: {
      rank: 1,
      providerId: activeProviderId,
      providerName: primaryQueue?.providerName,
      remoteServiceId: activeRemoteServiceId,
      rateUsd: activeBaseRateUsd,
      isGuaranteed: primaryQueue?.isGuaranteed,
    },
    isFunded: (balances.get(activeProviderId) ?? 0) >= minThresholdUsd,
  };
}

/**
 * Calculates live effective pricing based on the service's active upstream provider rate.
 */
export function resolveEffectiveServicePricing(
  service: {
    active_provider_id: string;
    active_remote_service_id: string;
    base_rate_usd: number | string;
    rate_multiplier?: number | string;
    fallback_queue?: FallbackQueueCandidate[];
  },
  balances: Map<string, number>,
  liveUsdToPkr: number,
  minThresholdUsd: number = MIN_PROVIDER_BALANCE_THRESHOLD_USD
): EffectiveServicePricing {
  const rawMult = Number(service.rate_multiplier);
  const mult = Number.isFinite(rawMult) && rawMult > 0 ? rawMult : 1.07;
  const defaultBaseUsd = Number(service.base_rate_usd || 0);

  const { candidate, isFunded } = selectFundedProviderCandidate(
    service.fallback_queue,
    service.active_provider_id,
    service.active_remote_service_id,
    defaultBaseUsd,
    balances,
    minThresholdUsd
  );

  // Always use the service's own base_rate_usd for display/order pricing so prices match the upstream API
  const baseRateUsd = defaultBaseUsd > 0 ? defaultBaseUsd : candidate.rateUsd;
  const rateUsd = Math.round(baseRateUsd * mult * 10000) / 10000;
  const ratePkr = calculateLivePricePkr(baseRateUsd, mult, liveUsdToPkr);

  return {
    activeProviderId: service.active_provider_id || candidate.providerId,
    activeRemoteServiceId: service.active_remote_service_id || candidate.remoteServiceId,
    baseRateUsd,
    rateMultiplier: mult,
    rateUsd,
    ratePkr,
    isFunded,
  };
}
