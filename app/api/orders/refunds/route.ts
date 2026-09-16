import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { db } from "@/lib/db";
import { ensureWalletSchema } from "@/lib/wallet";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    await ensureWalletSchema();

    // Query refund transactions from wallet ledger joined with order details
    const txResults = await db.query(
      `SELECT 
         t.id AS tx_id,
         t.amount_pkr,
         t.reference_type,
         t.reference_id,
         t.description,
         t.created_at,
         o.id AS order_id,
         o.provider_order_id,
         o.service_name,
         o.platform,
         o.link,
         o.quantity,
         o.charge_pkr,
         o.status AS order_status,
         o.failure_reason
       FROM vexo_wallet_transactions t
       LEFT JOIN vexo_orders o ON (
         (t.reference_type = 'order_refund' AND o.id::text = t.reference_id)
         OR (o.id::text = t.reference_id)
       )
       WHERE t.user_id = $1 AND t.type = 'Refund'
       ORDER BY t.created_at DESC
       LIMIT 100`,
      [user.id]
    );

    // Also fetch any orders that have a refunded or cancelled status
    const orderResults = await db.query(
      `SELECT 
         id,
         provider_order_id,
         service_name,
         platform,
         link,
         quantity,
         charge_pkr,
         status,
         failure_reason,
         created_at,
         updated_at
       FROM vexo_orders
       WHERE user_id = $1
         AND (
           status IN ('Payment Refunded', 'Cancelled', 'Canceled', 'Refunded')
           OR status ILIKE '%refund%'
         )
       ORDER BY updated_at DESC
       LIMIT 100`,
      [user.id]
    );

    const seenTxOrderIds = new Set<string>();

    const refunds = txResults.rows.map((r) => {
      if (r.order_id) seenTxOrderIds.add(String(r.order_id));
      if (r.reference_id) seenTxOrderIds.add(String(r.reference_id));

      return {
        id: String(r.tx_id),
        orderId: r.order_id ? String(r.order_id) : r.reference_id,
        providerOrderId: r.provider_order_id ? String(r.provider_order_id) : null,
        serviceName: r.service_name || "Order Refund",
        platform: r.platform || "Wallet",
        link: r.link || "",
        quantity: r.quantity ? Number(r.quantity) : null,
        amount: Number(r.amount_pkr),
        reason: r.failure_reason || r.description,
        status: "Refunded to Wallet",
        createdAt: r.created_at,
      };
    });

    // Add any refunded orders that weren't captured by transactions
    for (const o of orderResults.rows) {
      const oId = String(o.id);
      if (!seenTxOrderIds.has(oId)) {
        refunds.push({
          id: oId,
          orderId: oId,
          providerOrderId: o.provider_order_id ? String(o.provider_order_id) : null,
          serviceName: o.service_name || "Refunded Order",
          platform: o.platform || "Other",
          link: o.link || "",
          quantity: o.quantity ? Number(o.quantity) : null,
          amount: Number(o.charge_pkr),
          reason: o.failure_reason || "Order could not be fulfilled and was refunded",
          status: o.status === "Payment Refunded" ? "Refunded to Wallet" : o.status,
          createdAt: o.created_at,
        });
      }
    }

    // Sort all refunds chronologically descending
    refunds.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ success: true, refunds });
  } catch (error) {
    console.error("VEXO GET REFUNDS ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unable to load refunds.",
      },
      { status: 500 }
    );
  }
}
