#!/usr/bin/env node

/**
 * VEXO SMM - Automated Order Status Sync & Partial Refunds Cron Runner
 *
 * Usage:
 *   node scripts/sync-orders.js
 *   npm run sync-orders
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env.local file not found at " + envPath);
    process.exit(1);
  }

  const env = {};
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const DATABASE_URL = env.DATABASE_URL;
const RIZVI_API_URL = env.RIZVI_API_URL || "https://rizvismmpanels.com/api/v2";
const RIZVI_API_KEY = env.RIZVI_API_KEY;

if (!DATABASE_URL) {
  console.error("❌ Error: DATABASE_URL is missing from .env.local");
  process.exit(1);
}

if (!RIZVI_API_KEY) {
  console.error("❌ Error: RIZVI_API_KEY is missing from .env.local");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function fetchProviderStatus(orderId) {
  const body = new URLSearchParams({
    key: RIZVI_API_KEY,
    action: "status",
    order: orderId,
  });

  const res = await fetch(RIZVI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Provider returned HTTP ${res.status}`);
  }

  return res.json();
}

async function main() {
  console.log("\n=======================================================");
  console.log("   🔄 VEXO SMM - ORDER SYNC & PARTIAL REFUNDS RUNNER   ");
  console.log("=======================================================\n");

  try {
    const ordersRes = await pool.query(
      `SELECT id, user_id, provider_order_id, service_id, quantity, charge_pkr, status, created_at
       FROM vexo_orders
       WHERE provider_order_id IS NOT NULL
         AND status IN ('Pending', 'Processing', 'In progress', 'In Progress', 'Payment Reserved')
       ORDER BY created_at ASC
       LIMIT 150`
    );

    const orders = ordersRes.rows;
    console.log(`📋 Found ${orders.length} active order(s) awaiting status update.\n`);

    if (orders.length === 0) {
      console.log("✨ All orders are currently up-to-date! No action needed.\n");
      return;
    }

    const report = [];
    let updatedCount = 0;
    let partialRefundsCount = 0;
    let totalRefundedPkr = 0;

    for (const order of orders) {
      const pId = String(order.provider_order_id).trim();

      try {
        const provData = await fetchProviderStatus(pId);
        if (!provData || provData.error) {
          report.push({
            orderId: order.id.slice(0, 8),
            providerId: pId,
            oldStatus: order.status,
            newStatus: "Error",
            refundPkr: "₨0",
            action: `Provider Error: ${provData?.error || "Unknown"}`,
          });
          continue;
        }

        const rawStatus = String(provData.status || "").trim().toLowerCase();

        // 1. PARTIAL DELIVERY
        if (rawStatus === "partial") {
          const rawRemains = Number(provData.remains || 0);
          const originalQty = Number(order.quantity || 1);
          const remains = Math.max(0, Math.min(rawRemains, originalQty));
          const charge = Number(order.charge_pkr || 0);

          const refundPkr =
            remains > 0 && originalQty > 0
              ? Math.round(((remains / originalQty) * charge) * 100) / 100
              : 0;

          const client = await pool.connect();
          try {
            await client.query("BEGIN");

            const checkRefund = await client.query(
              `SELECT id FROM vexo_wallet_transactions
               WHERE reference_type = 'partial_refund' AND reference_id = $1 LIMIT 1`,
              [String(order.id)]
            );

            if (!checkRefund.rows[0] && refundPkr > 0) {
              await client.query(
                `INSERT INTO vexo_wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
                [order.user_id]
              );
              await client.query(
                `UPDATE vexo_wallets SET balance_pkr = balance_pkr + $1, updated_at = NOW() WHERE user_id = $2`,
                [refundPkr, order.user_id]
              );
              await client.query(
                `INSERT INTO vexo_wallet_transactions (user_id, type, amount_pkr, reference_type, reference_id, description)
                 VALUES ($1, 'Refund', $2, 'partial_refund', $3, $4)`,
                [
                  order.user_id,
                  refundPkr,
                  String(order.id),
                  `Partial refund for order ${order.id}: ${remains}/${originalQty} unfulfilled.`,
                ]
              );
              totalRefundedPkr += refundPkr;
              partialRefundsCount++;
            }

            await client.query(
              `UPDATE vexo_orders
               SET status = 'Partial', failure_reason = $1, updated_at = NOW()
               WHERE id = $2`,
              [`Partial: ${remains}/${originalQty} unfulfilled. Refunded ₨${refundPkr}`, order.id]
            );

            await client.query("COMMIT");
            updatedCount++;
            report.push({
              orderId: order.id.slice(0, 8),
              providerId: pId,
              oldStatus: order.status,
              newStatus: "Partial",
              refundPkr: `₨${refundPkr}`,
              action: `✅ Auto-refunded ₨${refundPkr} (${remains} remains)`,
            });
          } catch (e) {
            await client.query("ROLLBACK").catch(() => {});
            throw e;
          } finally {
            client.release();
          }
          continue;
        }

        // 2. CANCELED / CANCELLED / FAILED
        if (rawStatus === "canceled" || rawStatus === "cancelled" || rawStatus === "failed") {
          const client = await pool.connect();
          try {
            await client.query("BEGIN");
            const checkRefund = await client.query(
              `SELECT id FROM vexo_wallet_transactions
               WHERE reference_type IN ('order_refund', 'partial_refund') AND reference_id = $1 LIMIT 1`,
              [String(order.id)]
            );

            const charge = Number(order.charge_pkr || 0);
            if (!checkRefund.rows[0] && charge > 0) {
              await client.query(
                `INSERT INTO vexo_wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
                [order.user_id]
              );
              await client.query(
                `UPDATE vexo_wallets SET balance_pkr = balance_pkr + $1, updated_at = NOW() WHERE user_id = $2`,
                [charge, order.user_id]
              );
              await client.query(
                `INSERT INTO vexo_wallet_transactions (user_id, type, amount_pkr, reference_type, reference_id, description)
                 VALUES ($1, 'Refund', $2, 'order_refund', $3, $4)`,
                [order.user_id, charge, String(order.id), `Full refund for cancelled order ${order.id}.`]
              );
              totalRefundedPkr += charge;
            }

            await client.query(
              `UPDATE vexo_orders
               SET status = 'Cancelled', failure_reason = 'Cancelled by provider and refunded in full.', updated_at = NOW()
               WHERE id = $1`,
              [order.id]
            );
            await client.query("COMMIT");
            updatedCount++;
            report.push({
              orderId: order.id.slice(0, 8),
              providerId: pId,
              oldStatus: order.status,
              newStatus: "Cancelled",
              refundPkr: `₨${charge}`,
              action: `✅ Full refund ₨${charge} issued`,
            });
          } catch (e) {
            await client.query("ROLLBACK").catch(() => {});
            throw e;
          } finally {
            client.release();
          }
          continue;
        }

        // 3. COMPLETED, PROCESSING, IN PROGRESS
        let norm = "In progress";
        if (rawStatus === "completed") norm = "Completed";
        else if (rawStatus === "processing") norm = "Processing";
        else if (rawStatus === "in progress" || rawStatus === "inprogress") norm = "In progress";
        else if (rawStatus === "pending") norm = "Pending";

        if (norm.toLowerCase() !== String(order.status).toLowerCase()) {
          await pool.query(
            `UPDATE vexo_orders SET status = $1, updated_at = NOW() WHERE id = $2`,
            [norm, order.id]
          );
          updatedCount++;
          report.push({
            orderId: order.id.slice(0, 8),
            providerId: pId,
            oldStatus: order.status,
            newStatus: norm,
            refundPkr: "₨0",
            action: `Updated: ${order.status} ➔ ${norm}`,
          });
        } else {
          report.push({
            orderId: order.id.slice(0, 8),
            providerId: pId,
            oldStatus: order.status,
            newStatus: norm,
            refundPkr: "₨0",
            action: "Status unchanged",
          });
        }
      } catch (err) {
        report.push({
          orderId: order.id.slice(0, 8),
          providerId: pId,
          oldStatus: order.status,
          newStatus: "Error",
          refundPkr: "₨0",
          action: `Failed: ${err.message}`,
        });
      }
    }

    console.table(report);
    console.log("-------------------------------------------------------");
    console.log(`✅ Total Checked Orders : ${orders.length}`);
    console.log(`🔄 Status Updates Applied: ${updatedCount}`);
    console.log(`💸 Partial Refunds Issued: ${partialRefundsCount}`);
    console.log(`💰 Total Refunded Amount : ₨${Math.round(totalRefundedPkr * 100) / 100}`);
    console.log("-------------------------------------------------------\n");
  } catch (err) {
    console.error("❌ Cron Execution Error:", err.message);
  } finally {
    await pool.end();
  }
}

main();
