import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { db } from "@/lib/db";
import { ensureWalletSchema } from "@/lib/wallet";
import { requestRizviRefill, getRizviRefillStatus } from "@/lib/rizvi";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    await ensureWalletSchema();

    const { searchParams } = new URL(req.url);
    const shouldSync = searchParams.get("sync") === "true";

    // If sync requested, update pending refills
    if (shouldSync) {
      const pendingRefills = await db.query(
        `SELECT id, provider_refill_id, status
         FROM vexo_order_refills
         WHERE user_id = $1
           AND provider_refill_id IS NOT NULL
           AND status IN ('Pending', 'In progress', 'In Progress')
         ORDER BY created_at DESC
         LIMIT 15`,
        [user.id]
      );

      for (const row of pendingRefills.rows) {
        try {
          const providerStatus = await getRizviRefillStatus(
            String(row.provider_refill_id)
          );
          const statusObj =
            typeof providerStatus === "object" && providerStatus !== null
              ? (providerStatus as Record<string, unknown>)
              : null;

          if (statusObj?.status) {
            const rawStatus = String(statusObj.status).trim();
            const normalized =
              rawStatus.charAt(0).toUpperCase() +
              rawStatus.slice(1).toLowerCase();

            if (normalized !== row.status) {
              await db.query(
                `UPDATE vexo_order_refills
                 SET status = $1, updated_at = NOW()
                 WHERE id = $2`,
                [normalized, row.id]
              );
            }
          }
        } catch (syncErr) {
          console.warn(`Could not sync refill ${row.id}:`, syncErr);
        }
      }
    }

    const result = await db.query(
      `SELECT 
         r.id,
         r.order_id,
         r.provider_order_id,
         r.provider_refill_id,
         r.status,
         r.created_at,
         r.updated_at,
         o.service_name,
         o.link,
         o.quantity,
         o.charge_pkr
       FROM vexo_order_refills r
       JOIN vexo_orders o ON o.id = r.order_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT 100`,
      [user.id]
    );

    const refills = result.rows.map((r) => ({
      id: String(r.id),
      orderId: String(r.order_id),
      providerOrderId: r.provider_order_id ? String(r.provider_order_id) : null,
      refillId: r.provider_refill_id ? String(r.provider_refill_id) : null,
      serviceName: r.service_name || "Unknown Service",
      link: r.link,
      quantity: Number(r.quantity),
      charge: Number(r.charge_pkr),
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return NextResponse.json({ success: true, refills });
  } catch (error) {
    console.error("VEXO GET REFILLS ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unable to load refills.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    await ensureWalletSchema();

    const body = await req.json().catch(() => ({}));
    const orderId = body?.orderId?.trim();

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID is required." },
        { status: 400 }
      );
    }

    // Look up the order for this specific user
    const orderResult = await db.query(
      `SELECT id, provider_order_id, service_id, service_name, status
       FROM vexo_orders
       WHERE (id::text = $1 OR provider_order_id = $1)
         AND user_id = $2
       LIMIT 1`,
      [orderId, user.id]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Order not found or does not belong to you." },
        { status: 404 }
      );
    }

    const order = orderResult.rows[0];

    if (!order.provider_order_id) {
      return NextResponse.json(
        {
          success: false,
          error: "This order has not been dispatched to the provider yet.",
        },
        { status: 400 }
      );
    }

    // Check if a refill is already active
    const activeRefillResult = await db.query(
      `SELECT id, status FROM vexo_order_refills
       WHERE order_id = $1
         AND status IN ('Pending', 'In progress', 'In Progress')
       LIMIT 1`,
      [order.id]
    );

    if (activeRefillResult.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A refill request is already pending or in progress for this order.",
        },
        { status: 400 }
      );
    }

    // Call Rizvi Refill API
    const refillResponse = await requestRizviRefill(
      String(order.provider_order_id)
    );

    const respObj =
      typeof refillResponse === "object" && refillResponse !== null
        ? (refillResponse as Record<string, unknown>)
        : null;

    if (respObj?.error) {
      return NextResponse.json(
        {
          success: false,
          error: String(respObj.error),
        },
        { status: 400 }
      );
    }

    const providerRefillId = respObj?.refill ? String(respObj.refill) : null;

    // Save refill record into DB
    const insertResult = await db.query(
      `INSERT INTO vexo_order_refills (
         order_id,
         user_id,
         provider_order_id,
         provider_refill_id,
         status
       )
       VALUES ($1, $2, $3, $4, 'Pending')
       RETURNING id, order_id, provider_order_id, provider_refill_id, status, created_at`,
      [order.id, user.id, order.provider_order_id, providerRefillId]
    );

    const newRefill = insertResult.rows[0];

    return NextResponse.json({
      success: true,
      message: "Refill request submitted successfully!",
      refill: {
        id: String(newRefill.id),
        orderId: String(newRefill.order_id),
        providerOrderId: newRefill.provider_order_id,
        refillId: newRefill.provider_refill_id,
        status: newRefill.status,
        createdAt: newRefill.created_at,
      },
    });
  } catch (error) {
    console.error("VEXO SUBMIT REFILL ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit refill request.",
      },
      { status: 500 }
    );
  }
}
