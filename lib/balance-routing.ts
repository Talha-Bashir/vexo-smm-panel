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
      `SELECT id, balance_usd, enabled FROM vexo_providers WHERE enabled = true`
    );
    for (const row of res.rows) {
      balanceMap.set(String(row.id), Number(row.balance_usd || 0));
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
  for (const item of queue) {
    const pId = String(item.providerId || "");
    const bal = balances.get(pId) ?? 0;
    if (bal >= minThresholdUsd) {
      return {
        candidate: {
          rank: item.rank,
          providerId: pId,
          providerName: item.providerName,
          remoteServiceId: String(item.remoteServiceId),
          rateUsd: Number(item.rateUsd),
          isGuaranteed: item.isGuaranteed,
        },
        isFunded: true,
      };
    }
  }

  // 2. Fallback: If no provider has >= threshold, use the primary (cheapest) candidate
  const primaryQueue = queue[0];
  return {
    candidate: {
      rank: 1,
      providerId: primaryQueue ? String(primaryQueue.providerId) : defaultProviderId,
      providerName: primaryQueue?.providerName,
      remoteServiceId: primaryQueue ? String(primaryQueue.remoteServiceId) : defaultRemoteServiceId,
      rateUsd: primaryQueue ? Number(primaryQueue.rateUsd) : defaultBaseRateUsd,
      isGuaranteed: primaryQueue?.isGuaranteed,
    },
    isFunded: false,
  };
}

/**
 * Calculates live effective pricing based on the active funded provider.
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
  const mult = Number(service.rate_multiplier || 1.07);
  const defaultBaseUsd = Number(service.base_rate_usd || 0);

  const { candidate, isFunded } = selectFundedProviderCandidate(
    service.fallback_queue,
    service.active_provider_id,
    service.active_remote_service_id,
    defaultBaseUsd,
    balances,
    minThresholdUsd
  );

  const baseRateUsd = candidate.rateUsd > 0 ? candidate.rateUsd : defaultBaseUsd;
  const rateUsd = Math.round(baseRateUsd * mult * 10000) / 10000;
  const ratePkr = calculateLivePricePkr(baseRateUsd, mult, liveUsdToPkr);

  return {
    activeProviderId: candidate.providerId,
    activeRemoteServiceId: candidate.remoteServiceId,
    baseRateUsd,
    rateMultiplier: mult,
    rateUsd,
    ratePkr,
    isFunded,
  };
}
