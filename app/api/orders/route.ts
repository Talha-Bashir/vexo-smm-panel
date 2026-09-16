import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { db } from "@/lib/db";
import { ensureWalletSchema } from "@/lib/wallet";
import { getRizviOrderStatus } from "@/lib/rizvi";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    await ensureWalletSchema();

    const result = await db.query(
      `SELECT id, provider_order_id, service_id, service_name, platform, link,
              quantity, COALESCE(rate_pkr, rate, 0) AS rate_pkr, charge_pkr, status,
              failure_reason, created_at, updated_at
       FROM vexo_orders
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [user.id]
    );

    const orders = result.rows.map((r) => ({
      localId: String(r.id),
      orderId: r.provider_order_id ? String(r.provider_order_id) : undefined,
      serviceId: Number(r.service_id) || r.service_id,
      service: r.service_name || `Service #${r.service_id}`,
      platform: r.platform || "Other",
      link: r.link,
      quantity: Number(r.quantity),
      rate: Number(r.rate_pkr),
      charge: Number(r.charge_pkr),
      status: r.status,
      failureReason: r.failure_reason,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("VEXO GET ORDERS ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to load orders." },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    await ensureWalletSchema();

    // Select recent orders that can have updated status
    const pendingResult = await db.query(
      `SELECT id, provider_order_id, status
       FROM vexo_orders
       WHERE user_id = $1
         AND provider_order_id IS NOT NULL
         AND status IN ('Pending', 'Processing', 'In progress', 'In Progress')
       ORDER BY created_at DESC
       LIMIT 20`,
      [user.id]
    );

    for (const row of pendingResult.rows) {
      try {
        const providerStatus = await getRizviOrderStatus(String(row.provider_order_id));
        const statusObj = typeof providerStatus === "object" && providerStatus !== null
          ? (providerStatus as Record<string, unknown>)
          : null;

        const newStatus = statusObj?.status ? String(statusObj.status).trim() : "";
        if (newStatus && newStatus.toLowerCase() !== String(row.status).toLowerCase()) {
          const normalized =
            newStatus.charAt(0).toUpperCase() + newStatus.slice(1).toLowerCase();

          await db.query(
            `UPDATE vexo_orders SET status = $1, updated_at = NOW() WHERE id = $2`,
            [normalized, row.id]
          );
        }
      } catch (checkError) {
        console.warn(`Could not sync status for order ${row.id}:`, checkError);
      }
    }

    // Return the updated list
    const result = await db.query(
      `SELECT id, provider_order_id, service_id, service_name, platform, link,
              quantity, COALESCE(rate_pkr, rate, 0) AS rate_pkr, charge_pkr, status,
              failure_reason, created_at, updated_at
       FROM vexo_orders
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [user.id]
    );

    const orders = result.rows.map((r) => ({
      localId: String(r.id),
      orderId: r.provider_order_id ? String(r.provider_order_id) : undefined,
      serviceId: Number(r.service_id) || r.service_id,
      service: r.service_name || `Service #${r.service_id}`,
      platform: r.platform || "Other",
      link: r.link,
      quantity: Number(r.quantity),
      rate: Number(r.rate_pkr),
      charge: Number(r.charge_pkr),
      status: r.status,
      failureReason: r.failure_reason,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("VEXO SYNC ORDERS ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to sync orders." },
      { status: 500 }
    );
  }
}
