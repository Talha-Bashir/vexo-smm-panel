import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-guard";
import { ensureAdminSchema, logAdminActivity } from "@/lib/admin";
import { syncOrders } from "@/lib/order-sync";

export const dynamic = "force-dynamic";

async function guard() {
  const auth = await requireAdminPermission("orders");
  if (!auth.authorized) return { error: auth.response! };
  return { user: auth.user! };
}

export async function GET(req: Request) {
  try {
    const g = await guard();
    if (g.error) return g.error;
    await ensureAdminSchema();

    // Automatically synchronize active orders across providers (throttled to at most once per 30s)
    try {
      await syncOrders({ limit: 20, minAgeSeconds: 30 });
    } catch (syncErr) {
      console.warn("[AdminOrdersAPI] Auto-sync warning:", syncErr);
    }

    const p = new URL(req.url).searchParams;
    const q = p.get("q")?.trim() || "";
    const s = p.get("status")?.trim() || "";

    const r = await db.query(
      `SELECT o.id, o.user_id, u.name, u.email, o.provider_order_id,
              o.service_id, o.service_name, o.link, o.quantity,
              COALESCE(o.rate_pkr, o.rate, 0) AS rate_pkr,
              o.charge_pkr, o.status, o.start_count, o.remains, o.created_at, o.updated_at
       FROM vexo_orders o
       LEFT JOIN vexo_users u ON u.id = o.user_id
       WHERE ($1 = '' OR o.provider_order_id ILIKE '%' || $1 || '%' OR o.service_id ILIKE '%' || $1 || '%' OR o.service_name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%' OR o.id::text = $1)
         AND ($2 = '' OR o.status ILIKE $2)
       ORDER BY o.created_at DESC
       LIMIT 500`,
      [q, s]
    );

    return NextResponse.json({
      success: true,
      orders: r.rows.map((x) => ({
        id: x.id,
        userId: x.user_id,
        name: x.name,
        email: x.email,
        providerOrderId: x.provider_order_id,
        serviceId: x.service_id,
        serviceName: x.service_name,
        link: x.link,
        quantity: +x.quantity,
        rate: x.rate_pkr == null ? null : +x.rate_pkr,
        ratePkr: x.rate_pkr == null ? null : +x.rate_pkr,
        chargePkr: x.charge_pkr == null ? null : +x.charge_pkr,
        status: x.status,
        startCount: x.start_count != null && String(x.start_count).trim() !== "" ? String(x.start_count).trim() : null,
        remains: x.remains != null && String(x.remains).trim() !== "" ? String(x.remains).trim() : null,
        createdAt: x.created_at,
        updatedAt: x.updated_at,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unable to load orders." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const c = await db.connect();
  try {
    const g = await guard();
    if (g.error) return g.error;
    await ensureAdminSchema();
    const b = await req.json();

    const orderId = String(b?.orderId || b?.id || "").trim();
    if (!orderId) {
      return NextResponse.json({ success: false, error: "Missing orderId." }, { status: 400 });
    }

    // 1. One-click Order Refund to User Wallet
    if (b?.action === "refund") {
      await c.query("BEGIN");
      const ordRes = await c.query(
        `SELECT id, user_id, charge_pkr, status FROM vexo_orders WHERE id = $1 FOR UPDATE`,
        [orderId]
      );
      if (!ordRes.rows[0]) {
        await c.query("ROLLBACK");
        return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
      }

      const ord = ordRes.rows[0];
      const refundAmount = Number(b?.amount !== undefined ? b.amount : ord.charge_pkr);

      if (refundAmount > 0) {
        await c.query(
          `INSERT INTO vexo_wallets(user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
          [ord.user_id]
        );
        await c.query(
          `UPDATE vexo_wallets SET balance_pkr = balance_pkr + $1, updated_at = NOW() WHERE user_id = $2`,
          [refundAmount, ord.user_id]
        );
      }

      await c.query(
        `UPDATE vexo_orders SET status = 'Refunded', updated_at = NOW() WHERE id = $1`,
        [orderId]
      );

      await c.query(
        `INSERT INTO vexo_admin_activity(admin_user_id, action, target_type, target_id, details)
         VALUES ($1, 'order_refund', 'order', $2, $3::jsonb)`,
        [+g.user!.id, String(orderId), JSON.stringify({ userId: ord.user_id, refundAmount, prevStatus: ord.status })]
      );

      await c.query("COMMIT");
      return NextResponse.json({
        success: true,
        message: `Order #${orderId} refunded (₨${refundAmount.toFixed(2)} credited back to user wallet).`,
        status: "Refunded",
      });
    }

    // 2. Status update
    const status = String(b?.status || "").trim();
    const allowed = [
      "Pending",
      "Processing",
      "In progress",
      "Completed",
      "Partial",
      "Canceled",
      "Cancelled",
      "Refunded",
      "Failed",
    ];

    if (!status || !allowed.map((s) => s.toLowerCase()).includes(status.toLowerCase())) {
      return NextResponse.json({ success: false, error: "Invalid order status." }, { status: 400 });
    }

    // Normalize casing to nice Title Case
    const normalizedStatus = allowed.find((s) => s.toLowerCase() === status.toLowerCase()) || status;

    const r = await db.query(
      `UPDATE vexo_orders SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [orderId, normalizedStatus]
    );

    if (!r.rows[0]) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    await logAdminActivity(+g.user!.id, "order_status_change", "order", orderId, { status: normalizedStatus });
    return NextResponse.json({ success: true, message: `Order #${orderId} status set to ${normalizedStatus}.` });
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unable to update order." },
      { status: 500 }
    );
  } finally {
    c.release();
  }
}

export async function DELETE(req: Request) {
  try {
    const g = await guard();
    if (g.error) return g.error;
    await ensureAdminSchema();

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId") || searchParams.get("id");

    if (!orderId) {
      return NextResponse.json({ success: false, error: "Missing orderId." }, { status: 400 });
    }

    const del = await db.query(`DELETE FROM vexo_orders WHERE id = $1 RETURNING id`, [orderId]);
    if (!del.rows[0]) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    await logAdminActivity(+g.user!.id, "order_delete", "order", String(orderId), {});
    return NextResponse.json({ success: true, message: `Order #${orderId} deleted.` });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unable to delete order." },
      { status: 500 }
    );
  }
}
