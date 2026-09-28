import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { db } from "@/lib/db";
import { ensureWalletSchema } from "@/lib/wallet";
import { syncOrders } from "@/lib/order-sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const orderId = String(body.orderId || "").trim();

    if (!orderId) {
      return NextResponse.json({ success: false, error: "Order ID is required." }, { status: 400 });
    }

    if (orderId.length > 100) {
      return NextResponse.json({ success: false, error: "Invalid order ID." }, { status: 400 });
    }

    await ensureWalletSchema();

    // Verify order ownership: order must belong to this user (or user is an admin)
    const orderCheck = await db.query(
      `SELECT id, status FROM vexo_orders
       WHERE provider_order_id = $1 AND (user_id = $2 OR $3 = true)
       LIMIT 1`,
      [orderId, user.id, user.is_admin]
    );

    if (!orderCheck.rows[0]) {
      return NextResponse.json({ success: false, error: "Order not found or unauthorized." }, { status: 404 });
    }

    await syncOrders({ orderId, limit: 1, minAgeSeconds: 0 });

    const updatedRow = await db.query(
      `SELECT id, provider_order_id, status, start_count, remains, updated_at
       FROM vexo_orders
       WHERE id = $1`,
      [orderCheck.rows[0].id]
    );

    return NextResponse.json({
      success: true,
      order: updatedRow.rows[0],
    });
  } catch (error) {
    console.error("VEXO ORDER STATUS ERROR:", error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unable to retrieve order status",
    }, { status: 500 });
  }
}
