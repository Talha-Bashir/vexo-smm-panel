import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { db } from "@/lib/db";
import { ensureWalletSchema } from "@/lib/wallet";
import { getRizviOrderStatus } from "@/lib/rizvi";

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

    const result = await getRizviOrderStatus(orderId);

    // If provider returned status, sync it back to the database record
    const statusObj = typeof result === "object" && result !== null
      ? (result as Record<string, unknown>)
      : null;

    const newStatus = statusObj?.status ? String(statusObj.status).trim() : "";
    if (newStatus && newStatus.toLowerCase() !== String(orderCheck.rows[0].status).toLowerCase()) {
      const normalized =
        newStatus.charAt(0).toUpperCase() + newStatus.slice(1).toLowerCase();
      await db.query(
        `UPDATE vexo_orders SET status = $1, updated_at = NOW() WHERE id = $2`,
        [normalized, orderCheck.rows[0].id]
      );
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("VEXO ORDER STATUS ERROR:", error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unable to retrieve order status",
    }, { status: 500 });
  }
}
