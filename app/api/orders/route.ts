import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { db } from "@/lib/db";
import { ensureWalletSchema } from "@/lib/wallet";
import { syncOrders } from "@/lib/order-sync";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    await ensureWalletSchema();

    // Automatically synchronize active non-final orders for this user
    try {
      await syncOrders({ userId: user.id, limit: 10, minAgeSeconds: 10 });
    } catch (syncErr) {
      console.warn("[OrdersAPI] Auto-sync non-fatal warning:", syncErr);
    }

    const result = await db.query(
      `SELECT id, provider_order_id, service_id, service_name, platform, link,
              quantity, COALESCE(rate_pkr, rate, 0) AS rate_pkr, charge_pkr, status,
              failure_reason, start_count, remains, created_at, updated_at
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
      startCount: r.start_count != null && String(r.start_count).trim() !== "" ? String(r.start_count).trim() : null,
      remains: r.remains != null && String(r.remains).trim() !== "" ? String(r.remains).trim() : null,
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

    // Synchronize recent orders across all active providers with full refund handling
    await syncOrders({ userId: user.id, limit: 20, minAgeSeconds: 0 });

    // Return the updated list
    const result = await db.query(
      `SELECT id, provider_order_id, service_id, service_name, platform, link,
              quantity, COALESCE(rate_pkr, rate, 0) AS rate_pkr, charge_pkr, status,
              failure_reason, start_count, remains, created_at, updated_at
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
      startCount: r.start_count != null && String(r.start_count).trim() !== "" ? String(r.start_count).trim() : null,
      remains: r.remains != null && String(r.remains).trim() !== "" ? String(r.remains).trim() : null,
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
