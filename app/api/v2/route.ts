import { NextResponse } from "next/server";
import crypto from "crypto";
import { db, ensureDatabase } from "@/lib/db";
import { ensureAdminSchema } from "@/lib/admin";
import { ensureProvidersSchema } from "@/lib/providers";
import { dispatchOrderWithFailover } from "@/lib/order-dispatch";
import { getRizviServices, addRizviOrder, getRizviOrderStatus, requestRizviRefill, getRizviRefillStatus } from "@/lib/rizvi";
import { getVexoRate, calculateVexoCharge } from "@/lib/pricing";
import { getLiveUsdToPkrRate, calculateLivePricePkr, calculateLiveChargePkr, isPackageService } from "@/lib/exchange-rate";
import { reserveWalletForOrder, markOrderProviderSuccess, refundFailedOrder, getUserWallet } from "@/lib/wallet";

export const dynamic = "force-dynamic";

async function getParams(request: Request): Promise<Record<string, string>> {
  const params: Record<string, string> = {};

  // Check URL query params first
  const { searchParams } = new URL(request.url);
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const json = await request.json();
      if (json && typeof json === "object") {
        for (const [key, value] of Object.entries(json)) {
          params[key] = String(value ?? "");
        }
      }
    } catch {
      // ignore
    }
  } else if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    try {
      const formData = await request.formData();
      formData.forEach((val, key) => {
        params[key] = String(val);
      });
    } catch {
      // ignore
    }
  } else {
    try {
      const text = await request.text();
      if (text) {
        const bodyParams = new URLSearchParams(text);
        bodyParams.forEach((val, key) => {
          params[key] = val;
        });
      }
    } catch {
      // ignore
    }
  }

  return params;
}

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    await ensureAdminSchema();

    const params = await getParams(request);
    const key = params.key?.trim();
    const action = params.action?.trim()?.toLowerCase();

    if (!key) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    // Authenticate user by API key
    const userResult = await db.query(
      `SELECT id, name, email FROM vexo_users WHERE api_key = $1 LIMIT 1`,
      [key]
    );

    if (!userResult.rows[0]) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const user = userResult.rows[0];

    // ACTION: SERVICES
    if (action === "services") {
      await ensureProvidersSchema();
      const liveUsdToPkr = await getLiveUsdToPkrRate();

      const routedRes = await db.query(
        `SELECT id, name, platform, category, rate_pkr, base_rate_usd, rate_multiplier, min, max, refill, cancel, is_guaranteed
         FROM vexo_routed_services
         WHERE enabled = true
         ORDER BY platform ASC, rate_pkr ASC`
      );

      if (routedRes.rows.length > 0) {
        const list = routedRes.rows.map((item) => {
          const mult = Number(item.rate_multiplier || 1.07);
          const liveRate = calculateLivePricePkr(item.base_rate_usd, mult, liveUsdToPkr);
          return {
            service: item.id,
            name: item.name,
            type: "Default",
            category: item.category || item.platform,
            rate: liveRate.toFixed(4),
            min: Number(item.min || 10),
            max: Number(item.max || 100000),
            refill: Boolean(item.refill || item.is_guaranteed),
            cancel: Boolean(item.cancel),
          };
        });
        return NextResponse.json(list);
      }

      // Legacy fallback
      const [services, overridesResult] = await Promise.all([
        getRizviServices(),
        db.query(`SELECT service_id, enabled, popular, rate_multiplier FROM vexo_service_overrides`),
      ]);

      if (!Array.isArray(services)) {
        return NextResponse.json({ error: "Unable to load services" }, { status: 502 });
      }

      const overrideMap = new Map<string, { enabled: boolean; rate_multiplier: number }>();
      for (const row of overridesResult.rows) {
        overrideMap.set(String(row.service_id), {
          enabled: row.enabled !== false,
          rate_multiplier: Number(row.rate_multiplier || 1),
        });
      }

      const list = (services as Array<Record<string, unknown>>)
        .filter((item) => {
          const id = String(item.service ?? "");
          const override = overrideMap.get(id);
          return override ? override.enabled : true;
        })
        .map((item) => {
          const id = String(item.service ?? "");
          const override = overrideMap.get(id);
          const mult = override?.rate_multiplier && override.rate_multiplier > 0 ? override.rate_multiplier : 1;
          const vexoPrice = getVexoRate(Number(item.rate || 0), mult, liveUsdToPkr);

          return {
            service: item.service,
            name: item.name,
            type: item.type || "Default",
            category: item.category,
            rate: vexoPrice.toFixed(4),
            min: Number(item.min),
            max: Number(item.max),
            refill: Boolean(item.refill),
            cancel: Boolean(item.cancel),
          };
        });

      return NextResponse.json(list);
    }

    // ACTION: BALANCE
    if (action === "balance") {
      const wallet = await getUserWallet(user.id);
      return NextResponse.json({
        balance: Number(wallet.balancePkr).toFixed(2),
        currency: "PKR",
      });
    }

    // ACTION: ADD
    if (action === "add") {
      const serviceId = params.service?.trim();
      const link = params.link?.trim();
      const quantity = Number(params.quantity);

      if (!serviceId) return NextResponse.json({ error: "Service is required" }, { status: 400 });
      if (!link) return NextResponse.json({ error: "Link is required" }, { status: 400 });
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json({ error: "Quantity must be a positive whole number" }, { status: 400 });
      }

      await ensureProvidersSchema();
      await ensureAdminSchema();

      const liveUsdToPkr = await getLiveUsdToPkrRate();

      let serviceName = "SMM Service";
      let rate = 0;
      let charge = 0;
      let min = 1;
      let max = 100000;

      // 1. Check vexo_routed_services
      const isNum = /^\d+$/.test(serviceId);
      const routedRes = await db.query(
        isNum
          ? `SELECT id, name, platform, category, rate_pkr, base_rate_usd, rate_multiplier, min, max, enabled FROM vexo_routed_services WHERE id = $1 LIMIT 1`
          : `SELECT id, name, platform, category, rate_pkr, base_rate_usd, rate_multiplier, min, max, enabled FROM vexo_routed_services WHERE service_group_key = $1 OR id::text = $1 LIMIT 1`,
        [isNum ? Number(serviceId) : serviceId]
      );

      if (routedRes.rows.length > 0) {
        const routed = routedRes.rows[0];
        if (routed.enabled === false) {
          return NextResponse.json({ error: "Service is currently disabled" }, { status: 400 });
        }
        serviceName = routed.name;
        const mult = Number(routed.rate_multiplier || 1.07);
        rate = calculateLivePricePkr(routed.base_rate_usd, mult, liveUsdToPkr);
        min = Number(routed.min || 1);
        max = Number(routed.max || 100000);
        const isPkg = isPackageService(undefined, min, max);
        charge = calculateLiveChargePkr(rate, quantity, isPkg);
      } else {
        // Legacy fallback
        const services = await getRizviServices();
        if (!Array.isArray(services)) {
          return NextResponse.json({ error: "Unable to verify service limits" }, { status: 502 });
        }

        const s = services.find((item: Record<string, unknown>) => String(item.service) === serviceId);
        if (!s) {
          return NextResponse.json({ error: "Service not found or inactive" }, { status: 400 });
        }

        const overrideResult = await db.query(
          `SELECT enabled, rate_multiplier FROM vexo_service_overrides WHERE service_id = $1 LIMIT 1`,
          [serviceId]
        );
        const override = overrideResult.rows[0];
        if (override && override.enabled === false) {
          return NextResponse.json({ error: "Service is currently disabled" }, { status: 400 });
        }

        const mult = override && Number(override.rate_multiplier) > 0 ? Number(override.rate_multiplier) : 1;
        serviceName = String(s.name || "");
        min = Number(s.min);
        max = Number(s.max);
        rate = getVexoRate(s.rate, mult, liveUsdToPkr);
        charge = calculateLiveChargePkr(rate, quantity, isPackageService(String(s.type || ""), min, max));
      }

      if (quantity < min || quantity > max) {
        return NextResponse.json({ error: `Quantity must be between ${min} and ${max}` }, { status: 400 });
      }

      const idempotencyKey = "api_" + crypto.randomBytes(16).toString("hex");

      let reservation;
      try {
        reservation = await reserveWalletForOrder({
          userId: user.id,
          orderIdempotencyKey: idempotencyKey,
          serviceId,
          serviceName,
          platform: "API",
          link,
          quantity,
          ratePkr: rate,
          chargePkr: charge,
        });
      } catch (reserveError) {
        return NextResponse.json({
          error: reserveError instanceof Error ? reserveError.message : "Insufficient balance or wallet error",
        }, { status: 400 });
      }

      const vexoOrderId = String(reservation.order.id);

      try {
        // Dispatch to cheapest provider with automatic multi-provider failover
        const dispatchResult = await dispatchOrderWithFailover(serviceId, link, quantity);

        if (!dispatchResult.success || !dispatchResult.orderId) {
          const reason = dispatchResult.error || "All upstream providers failed to accept the order.";
          await refundFailedOrder(vexoOrderId, reason);
          return NextResponse.json({ error: reason }, { status: 400 });
        }

        const providerOrderId = dispatchResult.orderId;

        await markOrderProviderSuccess(vexoOrderId, String(providerOrderId));

        await db.query(
          `UPDATE vexo_orders SET provider_id = $1, failover_attempts = $2 WHERE id = $3`,
          [dispatchResult.providerId || null, JSON.stringify(dispatchResult.failoverAttempts), vexoOrderId]
        );

        return NextResponse.json({
          order: Number(providerOrderId) || providerOrderId,
        });
      } catch (err) {
        await refundFailedOrder(vexoOrderId, err instanceof Error ? err.message : "Provider request failed");
        return NextResponse.json({ error: "Failed to dispatch order to provider" }, { status: 500 });
      }
    }

    // ACTION: STATUS
    if (action === "status") {
      const orderId = params.order?.trim();
      if (!orderId) {
        return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
      }

      const orderResult = await db.query(
        `SELECT id, provider_order_id, charge_pkr, status
         FROM vexo_orders
         WHERE (provider_order_id = $1 OR id::text = $1) AND user_id = $2
         LIMIT 1`,
        [orderId, user.id]
      );

      if (!orderResult.rows[0]) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const order = orderResult.rows[0];

      if (order.provider_order_id) {
        try {
          const provStatus = await getRizviOrderStatus(String(order.provider_order_id));
          const pObj = typeof provStatus === "object" && provStatus !== null ? (provStatus as Record<string, unknown>) : null;
          if (pObj && !pObj.error) {
            return NextResponse.json({
              charge: Number(order.charge_pkr).toFixed(4),
              start_count: pObj.start_count ? String(pObj.start_count) : "0",
              status: pObj.status ? String(pObj.status) : order.status,
              remains: pObj.remains ? String(pObj.remains) : "0",
              currency: "PKR",
            });
          }
        } catch {
          // fallback to local status
        }
      }

      return NextResponse.json({
        charge: Number(order.charge_pkr).toFixed(4),
        start_count: "0",
        status: order.status,
        remains: "0",
        currency: "PKR",
      });
    }

    // ACTION: REFILL
    if (action === "refill") {
      const orderId = params.order?.trim();
      if (!orderId) return NextResponse.json({ error: "Order ID is required" }, { status: 400 });

      const orderResult = await db.query(
        `SELECT id, provider_order_id FROM vexo_orders
         WHERE (provider_order_id = $1 OR id::text = $1) AND user_id = $2
         LIMIT 1`,
        [orderId, user.id]
      );

      if (!orderResult.rows[0] || !orderResult.rows[0].provider_order_id) {
        return NextResponse.json({ error: "Order not found or not eligible" }, { status: 404 });
      }

      const order = orderResult.rows[0];
      const resp = await requestRizviRefill(String(order.provider_order_id));
      const respObj = typeof resp === "object" && resp !== null ? (resp as Record<string, unknown>) : null;

      if (respObj?.error) {
        return NextResponse.json({ error: String(respObj.error) }, { status: 400 });
      }

      const refillId = respObj?.refill ? String(respObj.refill) : null;
      await db.query(
        `INSERT INTO vexo_order_refills(order_id, user_id, provider_order_id, provider_refill_id, status)
         VALUES($1, $2, $3, $4, 'Pending')`,
        [order.id, user.id, order.provider_order_id, refillId]
      );

      return NextResponse.json({ refill: refillId });
    }

    // ACTION: REFILL_STATUS
    if (action === "refill_status") {
      const refillId = params.refill?.trim();
      if (!refillId) return NextResponse.json({ error: "Refill ID is required" }, { status: 400 });

      const resp = await getRizviRefillStatus(refillId);
      const respObj = typeof resp === "object" && resp !== null ? (resp as Record<string, unknown>) : null;

      if (respObj?.status) {
        return NextResponse.json({ status: String(respObj.status) });
      }
      return NextResponse.json({ status: "Pending" });
    }

    return NextResponse.json({ error: "Invalid action specified" }, { status: 400 });
  } catch (error) {
    console.error("VEXO API V2 ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal API error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
