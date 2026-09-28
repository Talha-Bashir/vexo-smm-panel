import { db } from "@/lib/db";
import { ensureWalletSchema } from "@/lib/wallet";
import { getRizviOrderStatus } from "@/lib/rizvi";
import {
  fetchProviderOrderStatus,
  getRegisteredProviders,
  STATIC_PROVIDERS,
  ProviderConfig,
} from "@/lib/providers";

export interface SyncResultDetail {
  orderId: string;
  providerOrderId: string;
  userId: number;
  oldStatus: string;
  newStatus: string;
  remains?: number;
  startCount?: string | null;
  refundPkr?: number;
  action: "updated" | "partial_refunded" | "cancelled_refunded" | "no_change" | "error";
  error?: string;
}

export interface SyncResult {
  success: boolean;
  timestamp: string;
  totalChecked: number;
  updatedCount: number;
  partialRefundsCount: number;
  errorsCount: number;
  totalRefundedPkr: number;
  details: SyncResultDetail[];
}

export interface SyncOrdersOptions {
  userId?: number;
  orderId?: string;
  limit?: number;
  minAgeSeconds?: number;
}

/**
 * Automatically syncs active orders with upstream SMM providers.
 *
 * Capabilities:
 * - Detects order completion and transitions status to 'Completed'.
 * - Detects partial completion, updates remains & start count, and issues exact proportional wallet refunds.
 * - Detects cancellation or provider failure, updates status to 'Cancelled', and issues 100% wallet refunds.
 * - Automatically routes each order to its designated provider (PAK SMM, Smooth SMM, Pakistan SMM, Rizvi SMM, etc.).
 * - Throttles repeat checks using minAgeSeconds so dashboard polling does not spam provider APIs.
 */
export async function syncOrders(options: SyncOrdersOptions = {}): Promise<SyncResult> {
  try {
    await ensureWalletSchema();
  } catch (schemaErr) {
    console.warn("[ORDER_SYNC] ensureWalletSchema non-fatal warning:", schemaErr);
  }

  const limit = Math.max(1, Math.min(options.limit || 25, 100));
  const minAgeSeconds = options.minAgeSeconds ?? 15;
  const userId = options.userId ? Number(options.userId) : null;
  const orderId = options.orderId ? String(options.orderId).trim() : null;

  // 1. Fetch registered providers
  let providers: ProviderConfig[] = [];
  try {
    providers = await getRegisteredProviders();
  } catch (provErr) {
    console.warn("[ORDER_SYNC] Provider DB fetch warning, falling back to static config:", provErr);
    providers = STATIC_PROVIDERS;
  }

  const provMap = new Map<string, ProviderConfig>(providers.map((p) => [p.id, p]));
  // Map common provider aliases
  if (provMap.has("rizvi_smm")) provMap.set("rizvi", provMap.get("rizvi_smm")!);
  if (provMap.has("pak_smm")) provMap.set("pak", provMap.get("pak_smm")!);
  if (provMap.has("smooth_smm")) provMap.set("smooth", provMap.get("smooth_smm")!);
  if (provMap.has("pakistan_smm")) provMap.set("pakistan", provMap.get("pakistan_smm")!);
  if (provMap.has("am_smm")) provMap.set("am", provMap.get("am_smm")!);

  // 2. Query active orders awaiting status sync
  let whereClause = `WHERE provider_order_id IS NOT NULL
                     AND status IN ('Pending', 'Processing', 'In progress', 'In Progress', 'Payment Reserved')`;
  const params: unknown[] = [];

  if (userId) {
    params.push(userId);
    whereClause += ` AND user_id = $${params.length}`;
  }

  if (orderId) {
    params.push(orderId);
    whereClause += ` AND (id::TEXT = $${params.length} OR provider_order_id = $${params.length})`;
  }

  if (minAgeSeconds > 0 && !orderId) {
    params.push(`${minAgeSeconds} seconds`);
    whereClause += ` AND (updated_at IS NULL OR updated_at < NOW() - $${params.length}::INTERVAL)`;
  }

  params.push(limit);
  const sql = `SELECT id, user_id, provider_order_id, provider_id, service_id, quantity, charge_pkr,
                      COALESCE(bonus_charge_pkr, 0) AS bonus_charge_pkr,
                      COALESCE(real_charge_pkr, 0) AS real_charge_pkr,
                      status, created_at, updated_at
               FROM vexo_orders
               ${whereClause}
               ORDER BY updated_at ASC NULLS FIRST, created_at ASC
               LIMIT $${params.length}`;

  const activeOrdersQuery = await db.query(sql, params);
  const orders = activeOrdersQuery.rows;

  const details: SyncResultDetail[] = [];
  let updatedCount = 0;
  let partialRefundsCount = 0;
  let totalRefundedPkr = 0;
  let errorsCount = 0;

  for (const order of orders) {
    const providerOrderId = String(order.provider_order_id).trim();
    const providerId = order.provider_id ? String(order.provider_id).trim() : null;

    try {
      let statusObj: Record<string, unknown> | null = null;
      let targetProvider: ProviderConfig | null = null;

      if (providerId && provMap.has(providerId)) {
        targetProvider = provMap.get(providerId)!;
      } else if (provMap.has("rizvi_smm")) {
        targetProvider = provMap.get("rizvi_smm")!;
      } else if (providers.length > 0) {
        targetProvider = providers[0];
      }

      if (targetProvider) {
        statusObj = await fetchProviderOrderStatus(targetProvider, providerOrderId, 7000);
      } else {
        const provStatus = await getRizviOrderStatus(providerOrderId);
        statusObj =
          typeof provStatus === "object" && provStatus !== null
            ? (provStatus as Record<string, unknown>)
            : null;
      }

      if (!statusObj || statusObj.error) {
        const errorMsg = String(statusObj?.error || "Invalid or empty response from upstream provider");
        errorsCount++;
        // Touch updated_at so we don't hammer the failing provider immediately on next tick
        await db.query(`UPDATE vexo_orders SET updated_at = NOW() WHERE id = $1`, [order.id]).catch(() => {});
        details.push({
          orderId: String(order.id),
          providerOrderId,
          userId: Number(order.user_id),
          oldStatus: order.status,
          newStatus: order.status,
          action: "error",
          error: errorMsg,
        });
        continue;
      }

      const rawStatus = String(statusObj.status || "").trim().toLowerCase();
      if (!rawStatus) {
        await db.query(`UPDATE vexo_orders SET updated_at = NOW() WHERE id = $1`, [order.id]).catch(() => {});
        details.push({
          orderId: String(order.id),
          providerOrderId,
          userId: Number(order.user_id),
          oldStatus: order.status,
          newStatus: order.status,
          action: "no_change",
        });
        continue;
      }

      const startCount = statusObj?.start_count != null && String(statusObj.start_count).trim() !== "" ? String(statusObj.start_count).trim() : null;
      const rawRemainsStr = statusObj?.remains != null && String(statusObj.remains).trim() !== "" ? String(statusObj.remains).trim() : null;

      // CASE 1: Upstream returned PARTIAL delivery
      if (rawStatus === "partial") {
        const rawRemains = Number(statusObj.remains || 0);
        const originalQty = Number(order.quantity || 1);
        const remains = Math.max(0, Math.min(rawRemains, originalQty));
        const chargePkr = Number(order.charge_pkr || 0);

        // Calculate unfulfilled ratio: (remains / original_quantity) * charge_pkr
        const refundPkr =
          remains > 0 && originalQty > 0
            ? Math.round(((remains / originalQty) * chargePkr) * 100) / 100
            : 0;

        let client;
        try {
          client = await db.connect();
          await client.query("BEGIN");

          const existingRefund = await client.query(
            `SELECT id FROM vexo_wallet_transactions
             WHERE reference_type IN ('partial_refund', 'partial_bonus_refund') AND reference_id = $1
             LIMIT 1`,
            [String(order.id)]
          );

          if (!existingRefund.rows[0] && refundPkr > 0) {
            await client.query(
              `INSERT INTO vexo_wallets (user_id) VALUES ($1)
               ON CONFLICT (user_id) DO NOTHING`,
              [order.user_id]
            );

            const origBonus = Number(order.bonus_charge_pkr || 0);
            const origReal = Number(order.real_charge_pkr || 0);
            const totalOrigCharge = chargePkr > 0 ? chargePkr : (origBonus + origReal);

            let bonusPartialRefund = 0;
            let realPartialRefund = refundPkr;

            if (totalOrigCharge > 0 && origBonus > 0) {
              const bonusRatio = origBonus / totalOrigCharge;
              bonusPartialRefund = Math.min(origBonus, Math.round(refundPkr * bonusRatio * 100) / 100);
              realPartialRefund = Math.round((refundPkr - bonusPartialRefund) * 100) / 100;
            }

            await client.query(
              `UPDATE vexo_wallets
               SET balance_pkr = balance_pkr + $1,
                   bonus_balance_pkr = bonus_balance_pkr + $2,
                   updated_at = NOW()
               WHERE user_id = $3`,
              [realPartialRefund, bonusPartialRefund, order.user_id]
            );

            if (realPartialRefund > 0) {
              await client.query(
                `INSERT INTO vexo_wallet_transactions (user_id, type, amount_pkr, reference_type, reference_id, description)
                 VALUES ($1, 'Refund', $2, 'partial_refund', $3, $4)
                 ON CONFLICT (reference_type, reference_id) DO NOTHING`,
                [
                  order.user_id,
                  realPartialRefund,
                  String(order.id),
                  `Partial refund for order ${order.id}: ${remains} of ${originalQty} remains unfulfilled.`,
                ]
              );
            }

            if (bonusPartialRefund > 0) {
              await client.query(
                `INSERT INTO vexo_wallet_transactions (user_id, type, amount_pkr, reference_type, reference_id, description)
                 VALUES ($1, 'Refund', $2, 'partial_bonus_refund', $3, $4)
                 ON CONFLICT (reference_type, reference_id) DO NOTHING`,
                [
                  order.user_id,
                  bonusPartialRefund,
                  String(order.id),
                  `Partial promotional bonus refund for order ${order.id}: ${remains} of ${originalQty} unfulfilled.`,
                ]
              );
            }

            totalRefundedPkr += refundPkr;
            partialRefundsCount++;
          }

          const reasonMsg = `Partial delivery: ${remains} remaining of ${originalQty}. Refunded ₨${refundPkr}.`;
          await client.query(
            `UPDATE vexo_orders
             SET status = 'Partial',
                 failure_reason = $1,
                 start_count = COALESCE($2, start_count),
                 remains = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [reasonMsg, startCount, String(remains), order.id]
          );

          await client.query("COMMIT");

          updatedCount++;
          details.push({
            orderId: String(order.id),
            providerOrderId,
            userId: Number(order.user_id),
            oldStatus: order.status,
            newStatus: "Partial",
            remains,
            startCount,
            refundPkr,
            action: "partial_refunded",
          });
        } catch (partialErr) {
          if (client) await client.query("ROLLBACK").catch(() => undefined);
          errorsCount++;
          details.push({
            orderId: String(order.id),
            providerOrderId,
            userId: Number(order.user_id),
            oldStatus: order.status,
            newStatus: order.status,
            action: "error",
            error: partialErr instanceof Error ? partialErr.message : "Partial refund database transaction failed",
          });
        } finally {
          if (client) client.release();
        }
        continue;
      }

      // CASE 2: Upstream returned CANCELED / CANCELLED / FAILED / REJECTED / REFUNDED
      const isCancelled =
        rawStatus === "canceled" ||
        rawStatus === "cancelled" ||
        rawStatus === "failed" ||
        rawStatus === "rejected" ||
        rawStatus === "refunded";

      if (isCancelled) {
        let client;
        try {
          client = await db.connect();
          await client.query("BEGIN");

          const existingRefund = await client.query(
            `SELECT id FROM vexo_wallet_transactions
             WHERE (reference_type IN ('order_refund', 'order_bonus_refund', 'partial_refund')) AND reference_id = $1
             LIMIT 1`,
            [String(order.id)]
          );

          const chargePkr = Number(order.charge_pkr || 0);

          if (!existingRefund.rows[0] && chargePkr > 0) {
            await client.query(
              `INSERT INTO vexo_wallets (user_id) VALUES ($1)
               ON CONFLICT (user_id) DO NOTHING`,
              [order.user_id]
            );

            let bonusRefund = Number(order.bonus_charge_pkr || 0);
            let realRefund = Number(order.real_charge_pkr || 0);
            if (bonusRefund === 0 && realRefund === 0 && chargePkr > 0) {
              realRefund = chargePkr;
            }

            await client.query(
              `UPDATE vexo_wallets
               SET balance_pkr = balance_pkr + $1,
                   bonus_balance_pkr = bonus_balance_pkr + $2,
                   updated_at = NOW()
               WHERE user_id = $3`,
              [realRefund, bonusRefund, order.user_id]
            );

            if (realRefund > 0) {
              await client.query(
                `INSERT INTO vexo_wallet_transactions (user_id, type, amount_pkr, reference_type, reference_id, description)
                 VALUES ($1, 'Refund', $2, 'order_refund', $3, $4)
                 ON CONFLICT (reference_type, reference_id) DO NOTHING`,
                [
                  order.user_id,
                  realRefund,
                  String(order.id),
                  `Full refund for cancelled order ${order.id}.`,
                ]
              );
            }

            if (bonusRefund > 0) {
              await client.query(
                `INSERT INTO vexo_wallet_transactions (user_id, type, amount_pkr, reference_type, reference_id, description)
                 VALUES ($1, 'Refund', $2, 'order_bonus_refund', $3, $4)
                 ON CONFLICT (reference_type, reference_id) DO NOTHING`,
                [
                  order.user_id,
                  bonusRefund,
                  String(order.id),
                  `Promotional bonus credit restored for cancelled order ${order.id}.`,
                ]
              );
            }

            totalRefundedPkr += chargePkr;
          }

          await client.query(
            `UPDATE vexo_orders
             SET status = 'Cancelled',
                 failure_reason = 'Order was cancelled by provider and refunded in full.',
                 start_count = COALESCE($1, start_count),
                 remains = COALESCE($2, remains),
                 updated_at = NOW()
             WHERE id = $3`,
            [startCount, rawRemainsStr, order.id]
          );

          await client.query("COMMIT");

          updatedCount++;
          details.push({
            orderId: String(order.id),
            providerOrderId,
            userId: Number(order.user_id),
            oldStatus: order.status,
            newStatus: "Cancelled",
            refundPkr: chargePkr,
            startCount,
            action: "cancelled_refunded",
          });
        } catch (cancelErr) {
          if (client) await client.query("ROLLBACK").catch(() => undefined);
          errorsCount++;
          details.push({
            orderId: String(order.id),
            providerOrderId,
            userId: Number(order.user_id),
            oldStatus: order.status,
            newStatus: order.status,
            action: "error",
            error: cancelErr instanceof Error ? cancelErr.message : "Cancellation refund database transaction failed",
          });
        } finally {
          if (client) client.release();
        }
        continue;
      }

      // CASE 3: Upstream COMPLETED, PROCESSING, IN PROGRESS, PENDING
      let normalizedStatus = "In progress";
      if (rawStatus === "completed") normalizedStatus = "Completed";
      else if (rawStatus === "processing") normalizedStatus = "Processing";
      else if (rawStatus === "in progress" || rawStatus === "inprogress") normalizedStatus = "In progress";
      else if (rawStatus === "pending") normalizedStatus = "Pending";

      const hasStatusChange = normalizedStatus.toLowerCase() !== String(order.status).toLowerCase();
      const hasCountChange = startCount !== null || rawRemainsStr !== null;

      if (hasStatusChange || hasCountChange) {
        await db.query(
          `UPDATE vexo_orders
           SET status = $1,
               start_count = COALESCE($2, start_count),
               remains = COALESCE($3, remains),
               updated_at = NOW()
           WHERE id = $4`,
          [normalizedStatus, startCount, rawRemainsStr, order.id]
        );
        updatedCount++;
        details.push({
          orderId: String(order.id),
          providerOrderId,
          userId: Number(order.user_id),
          oldStatus: order.status,
          newStatus: normalizedStatus,
          startCount,
          remains: rawRemainsStr != null ? Number(rawRemainsStr) : undefined,
          action: "updated",
        });
      } else {
        // Touch updated_at for throttle tracking
        await db.query(`UPDATE vexo_orders SET updated_at = NOW() WHERE id = $1`, [order.id]);
        details.push({
          orderId: String(order.id),
          providerOrderId,
          userId: Number(order.user_id),
          oldStatus: order.status,
          newStatus: normalizedStatus,
          action: "no_change",
        });
      }
    } catch (orderErr) {
      errorsCount++;
      await db.query(`UPDATE vexo_orders SET updated_at = NOW() WHERE id = $1`, [order.id]).catch(() => {});
      details.push({
        orderId: String(order.id),
        providerOrderId,
        userId: Number(order.user_id),
        oldStatus: order.status,
        newStatus: order.status,
        action: "error",
        error: orderErr instanceof Error ? orderErr.message : "Sync error",
      });
    }
  }

  return {
    success: true,
    timestamp: new Date().toISOString(),
    totalChecked: orders.length,
    updatedCount,
    partialRefundsCount,
    errorsCount,
    totalRefundedPkr: Math.round(totalRefundedPkr * 100) / 100,
    details,
  };
}
