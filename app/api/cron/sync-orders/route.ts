import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureWalletSchema } from "@/lib/wallet";
import { getRizviOrderStatus } from "@/lib/rizvi";
import { getRequestUser } from "@/lib/request-user";
import { fetchProviderOrderStatus, getRegisteredProviders, ProviderConfig } from "@/lib/providers";

export const dynamic = "force-dynamic";

interface SyncResultDetail {
  orderId: string;
  providerOrderId: string;
  userId: number;
  oldStatus: string;
  newStatus: string;
  remains?: number;
  refundPkr?: number;
  action: "updated" | "partial_refunded" | "cancelled_refunded" | "no_change" | "error";
  error?: string;
}

/**
 * Validates request authorization:
 * - Bearer token matching CRON_SECRET or query param ?secret=CRON_SECRET
 * - OR request coming from localhost
 * - OR request by an authenticated Admin user
 */
async function isAuthorized(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret")?.trim();

  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  // 1. If CRON_SECRET is set in environment, check match
  if (cronSecret) {
    if (bearerToken === cronSecret || querySecret === cronSecret) {
      return true;
    }
  }

  // 2. Allow requests originating from local loopback in development
  const host = request.headers.get("host") || "";
  if (process.env.NODE_ENV !== "production" && (host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host === "localhost")) {
    return true;
  }

  // 3. Allow requests by authenticated Admin user
  try {
    const user = await getRequestUser();
    if (user && user.is_admin) {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

export async function runOrderSync() {
  await ensureWalletSchema();

  // 1. Fetch registered providers and active non-final orders
  const providers = await getRegisteredProviders();
  const provMap = new Map<string, ProviderConfig>(providers.map((p) => [p.id, p]));

  const activeOrdersQuery = await db.query(
    `SELECT id, user_id, provider_order_id, provider_id, service_id, quantity, charge_pkr, status, created_at
     FROM vexo_orders
     WHERE provider_order_id IS NOT NULL
       AND status IN ('Pending', 'Processing', 'In progress', 'In Progress', 'Payment Reserved')
     ORDER BY created_at ASC
     LIMIT 100`
  );

  const orders = activeOrdersQuery.rows;
  const details: SyncResultDetail[] = [];
  let updatedCount = 0;
  let partialRefundsCount = 0;
  let totalRefundedPkr = 0;

  for (const order of orders) {
    const providerOrderId = String(order.provider_order_id).trim();
    const providerId = order.provider_id ? String(order.provider_id) : null;

    try {
      let statusObj: Record<string, unknown> | null = null;
      if (providerId && provMap.has(providerId)) {
        const p = provMap.get(providerId)!;
        statusObj = await fetchProviderOrderStatus(p, providerOrderId);
      } else {
        const provStatus = await getRizviOrderStatus(providerOrderId);
        statusObj =
          typeof provStatus === "object" && provStatus !== null
            ? (provStatus as Record<string, unknown>)
            : null;
      }

      if (!statusObj || statusObj.error) {
        details.push({
          orderId: String(order.id),
          providerOrderId,
          userId: Number(order.user_id),
          oldStatus: order.status,
          newStatus: order.status,
          action: "error",
          error: String(statusObj?.error || "Invalid response from provider"),
        });
        continue;
      }

      const rawStatus = String(statusObj.status || "").trim().toLowerCase();
      if (!rawStatus) {
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

        const client = await db.connect();
        try {
          await client.query("BEGIN");

          // Ensure idempotency: verify this order hasn't already received a partial refund
          const existingRefund = await client.query(
            `SELECT id FROM vexo_wallet_transactions
             WHERE reference_type = 'partial_refund' AND reference_id = $1
             LIMIT 1`,
            [String(order.id)]
          );

          if (!existingRefund.rows[0] && refundPkr > 0) {
            // Credit unfulfilled portion back to user wallet
            await client.query(
              `INSERT INTO vexo_wallets (user_id) VALUES ($1)
               ON CONFLICT (user_id) DO NOTHING`,
              [order.user_id]
            );

            await client.query(
              `UPDATE vexo_wallets
               SET balance_pkr = balance_pkr + $1, updated_at = NOW()
               WHERE user_id = $2`,
              [refundPkr, order.user_id]
            );

            await client.query(
              `INSERT INTO vexo_wallet_transactions (user_id, type, amount_pkr, reference_type, reference_id, description)
               VALUES ($1, 'Refund', $2, 'partial_refund', $3, $4)`,
              [
                order.user_id,
                refundPkr,
                String(order.id),
                `Partial refund for order ${order.id}: ${remains} of ${originalQty} remains unfulfilled.`,
              ]
            );

            totalRefundedPkr += refundPkr;
            partialRefundsCount++;
          }

          const reasonMsg = `Partial delivery: ${remains} remaining of ${originalQty}. Refunded ₨${refundPkr}.`;
          await client.query(
            `UPDATE vexo_orders
             SET status = 'Partial', failure_reason = $1, updated_at = NOW()
             WHERE id = $2`,
            [reasonMsg, order.id]
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
            refundPkr,
            action: "partial_refunded",
          });
        } catch (partialErr) {
          await client.query("ROLLBACK").catch(() => undefined);
          throw partialErr;
        } finally {
          client.release();
        }
        continue;
      }

      // CASE 2: Upstream returned CANCELED / CANCELLED / FAILED
      if (rawStatus === "canceled" || rawStatus === "cancelled" || rawStatus === "failed") {
        const client = await db.connect();
        try {
          await client.query("BEGIN");

          const existingRefund = await client.query(
            `SELECT id FROM vexo_wallet_transactions
             WHERE (reference_type IN ('order_refund', 'partial_refund')) AND reference_id = $1
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

            await client.query(
              `UPDATE vexo_wallets
               SET balance_pkr = balance_pkr + $1, updated_at = NOW()
               WHERE user_id = $2`,
              [chargePkr, order.user_id]
            );

            await client.query(
              `INSERT INTO vexo_wallet_transactions (user_id, type, amount_pkr, reference_type, reference_id, description)
               VALUES ($1, 'Refund', $2, 'order_refund', $3, $4)`,
              [
                order.user_id,
                chargePkr,
                String(order.id),
                `Full refund for cancelled order ${order.id}.`,
              ]
            );

            totalRefundedPkr += chargePkr;
          }

          await client.query(
            `UPDATE vexo_orders
             SET status = 'Cancelled', failure_reason = 'Order was cancelled by provider and refunded in full.', updated_at = NOW()
             WHERE id = $1`,
            [order.id]
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
            action: "cancelled_refunded",
          });
        } catch (cancelErr) {
          await client.query("ROLLBACK").catch(() => undefined);
          throw cancelErr;
        } finally {
          client.release();
        }
        continue;
      }

      // CASE 3: Upstream COMPLETED, PROCESSING, IN PROGRESS
      let normalizedStatus = "In progress";
      if (rawStatus === "completed") normalizedStatus = "Completed";
      else if (rawStatus === "processing") normalizedStatus = "Processing";
      else if (rawStatus === "in progress" || rawStatus === "inprogress") normalizedStatus = "In progress";
      else if (rawStatus === "pending") normalizedStatus = "Pending";

      if (normalizedStatus.toLowerCase() !== String(order.status).toLowerCase()) {
        await db.query(
          `UPDATE vexo_orders SET status = $1, updated_at = NOW() WHERE id = $2`,
          [normalizedStatus, order.id]
        );
        updatedCount++;
        details.push({
          orderId: String(order.id),
          providerOrderId,
          userId: Number(order.user_id),
          oldStatus: order.status,
          newStatus: normalizedStatus,
          action: "updated",
        });
      } else {
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
    totalRefundedPkr: Math.round(totalRefundedPkr * 100) / 100,
    details,
  };
}

export async function GET(request: Request) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Provide valid CRON_SECRET or run from localhost/admin session." },
      { status: 401 }
    );
  }

  try {
    const result = await runOrderSync();
    return NextResponse.json(result);
  } catch (error) {
    console.error("VEXO CRON SYNC ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Cron execution failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
