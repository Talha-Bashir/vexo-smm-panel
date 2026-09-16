import { db } from "@/lib/db";
import { getRegisteredProviders, submitProviderOrder, ProviderConfig } from "@/lib/providers";
import { addRizviOrder } from "@/lib/rizvi";

export interface FailoverAttempt {
  providerId: string;
  providerName?: string;
  remoteServiceId: string;
  rateUsd?: number;
  success: boolean;
  orderId?: string;
  error?: string;
  timestamp: string;
}

export interface DispatchResult {
  success: boolean;
  orderId?: string;
  providerId?: string;
  providerName?: string;
  remoteServiceId?: string;
  failoverAttempts: FailoverAttempt[];
  error?: string;
}

/**
 * Dispatches an order to the cheapest/active provider with automatic failover.
 * If the primary provider fails (insufficient provider balance, provider offline, etc.),
 * the dispatcher seamlessly attempts the next lowest-cost provider in the fallback queue.
 */
export async function dispatchOrderWithFailover(
  serviceIdentifier: string,
  link: string,
  quantity: number
): Promise<DispatchResult> {
  const serviceIdStr = String(serviceIdentifier).trim();

  // 1. Look up routed service in vexo_routed_services
  let routedRow = null;
  try {
    const isNum = /^\d+$/.test(serviceIdStr);
    const routedRes = await db.query(
      isNum
        ? `SELECT * FROM vexo_routed_services WHERE id = $1 LIMIT 1`
        : `SELECT * FROM vexo_routed_services WHERE service_group_key = $1 OR id::text = $1 LIMIT 1`,
      [isNum ? Number(serviceIdStr) : serviceIdStr]
    );
    routedRow = routedRes.rows[0] || null;
  } catch (err) {
    console.warn("Could not query vexo_routed_services:", err);
  }

  // 2. If not found in routed services, attempt fallback to legacy Rizvi provider
  if (!routedRow) {
    try {
      const legacyRes = await addRizviOrder(serviceIdStr, link, String(quantity));
      const resultObj = typeof legacyRes === "object" && legacyRes !== null ? (legacyRes as Record<string, unknown>) : null;
      const nested = resultObj?.data && typeof resultObj.data === "object" ? (resultObj.data as Record<string, unknown>) : null;
      const rawId = resultObj?.order ?? resultObj?.order_id ?? resultObj?.id ?? nested?.order ?? nested?.order_id ?? nested?.id;
      const error = resultObj?.error ?? resultObj?.errors;

      if (error || !rawId) {
        const errMsg = error ? (typeof error === "string" ? error : JSON.stringify(error)) : "Provider did not return an order ID";
        return {
          success: false,
          error: errMsg,
          failoverAttempts: [{
            providerId: "rizvi",
            providerName: "Legacy Provider",
            remoteServiceId: serviceIdStr,
            success: false,
            error: errMsg,
            timestamp: new Date().toISOString(),
          }],
        };
      }

      return {
        success: true,
        orderId: String(rawId).trim(),
        providerId: "rizvi",
        providerName: "Legacy Provider",
        remoteServiceId: serviceIdStr,
        failoverAttempts: [{
          providerId: "rizvi",
          providerName: "Legacy Provider",
          remoteServiceId: serviceIdStr,
          success: true,
          orderId: String(rawId).trim(),
          timestamp: new Date().toISOString(),
        }],
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Legacy order dispatch failed",
        failoverAttempts: [{
          providerId: "rizvi",
          providerName: "Legacy Provider",
          remoteServiceId: serviceIdStr,
          success: false,
          error: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        }],
      };
    }
  }

  // 3. Multi-Provider Least-Cost Routing & Failover
  const providers = await getRegisteredProviders();
  const provMap = new Map<string, ProviderConfig>(providers.map((p) => [p.id, p]));

  const candidateList: Array<{ providerId: string; remoteServiceId: string; rank: number }> = [];
  const seenProviders = new Set<string>();

  // Primary: Active designated provider
  if (routedRow.active_provider_id && routedRow.active_remote_service_id) {
    candidateList.push({
      providerId: String(routedRow.active_provider_id),
      remoteServiceId: String(routedRow.active_remote_service_id),
      rank: 1,
    });
    seenProviders.add(String(routedRow.active_provider_id));
  }

  // Fallback queue (Ranks 2, 3, 4)
  const queue = Array.isArray(routedRow.fallback_queue) ? routedRow.fallback_queue : [];
  for (const item of queue) {
    const pId = String(item.providerId || "");
    const rId = String(item.remoteServiceId || "");
    if (pId && rId && !seenProviders.has(pId)) {
      candidateList.push({
        providerId: pId,
        remoteServiceId: rId,
        rank: candidateList.length + 1,
      });
      seenProviders.add(pId);
    }
  }

  const failoverAttempts: FailoverAttempt[] = [];
  let lastError = "No eligible providers configured in routing queue.";

  for (const candidate of candidateList) {
    const provider = provMap.get(candidate.providerId);
    if (!provider || !provider.enabled) {
      continue;
    }

    try {
      console.log(`[Order Dispatch] Attempting provider ${provider.name} (Service ID: ${candidate.remoteServiceId})...`);
      const res = await submitProviderOrder(provider, candidate.remoteServiceId, link, quantity);

      if (res && res.orderId) {
        failoverAttempts.push({
          providerId: provider.id,
          providerName: provider.name,
          remoteServiceId: candidate.remoteServiceId,
          success: true,
          orderId: res.orderId,
          timestamp: new Date().toISOString(),
        });

        console.log(`[Order Dispatch] ✓ SUCCESS via ${provider.name} (Remote Order ID: ${res.orderId})`);
        return {
          success: true,
          orderId: res.orderId,
          providerId: provider.id,
          providerName: provider.name,
          remoteServiceId: candidate.remoteServiceId,
          failoverAttempts,
        };
      } else {
        throw new Error("Provider response did not contain an order ID.");
      }
    } catch (provErr: unknown) {
      const errMsg = provErr instanceof Error ? provErr.message : String(provErr);
      lastError = errMsg;
      console.warn(`[Order Dispatch Failover] ✗ ${provider.name} failed: ${errMsg}. Trying next provider in fallback queue...`);

      failoverAttempts.push({
        providerId: provider.id,
        providerName: provider.name,
        remoteServiceId: candidate.remoteServiceId,
        success: false,
        error: errMsg,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // All upstream providers failed
  return {
    success: false,
    error: `All providers failed to fulfill order. Last error: ${lastError}`,
    failoverAttempts,
  };
}
