import { NextResponse } from "next/server";
import { getRizviServices, addRizviOrder } from "@/lib/rizvi";
import { calculateVexoCharge, getVexoRate } from "@/lib/pricing";
import { getLiveUsdToPkrRate, calculateLivePricePkr, calculateLiveChargePkr, isPackageService } from "@/lib/exchange-rate";
import { getRequestUser } from "@/lib/request-user";
import { db } from "@/lib/db";
import { ensureAdminSchema } from "@/lib/admin";
import { ensureProvidersSchema } from "@/lib/providers";
import { dispatchOrderWithFailover } from "@/lib/order-dispatch";
import {
  InsufficientWalletBalanceError,
  markOrderProviderSuccess,
  refundFailedOrder,
  reserveWalletForOrder,
} from "@/lib/wallet";

type RizviService = {
  service: number;
  name: string;
  category?: string;
  type?: string;
  min: number;
  max: number;
  rate: string | number;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const serviceId = String(body.serviceId || "").trim();
    const link = String(body.link || "").trim();
    const quantity = String(body.quantity || "").trim();
    const idempotencyKey = String(body.idempotencyKey || "").trim();

    if (!idempotencyKey || idempotencyKey.length > 120) {
      return NextResponse.json({ success: false, error: "Invalid order request key." }, { status: 400 });
    }
    if (!serviceId) return NextResponse.json({ success: false, error: "Service is required" }, { status: 400 });
    if (!link) return NextResponse.json({ success: false, error: "Link or username is required" }, { status: 400 });
    if (link.length > 2048) return NextResponse.json({ success: false, error: "Link or username is too long" }, { status: 400 });

    const sanitizedLink = link.replace(/<[^>]*>?/gm, "").trim();
    if (sanitizedLink.toLowerCase().startsWith("javascript:") || sanitizedLink.toLowerCase().startsWith("data:")) {
      return NextResponse.json({ success: false, error: "Invalid target link format." }, { status: 400 });
    }

    const numericQuantity = Number(quantity);
    if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) {
      return NextResponse.json({ success: false, error: "Quantity must be a positive whole number" }, { status: 400 });
    }

    await ensureProvidersSchema();
    await ensureAdminSchema();

    const liveUsdToPkr = await getLiveUsdToPkrRate();

    let serviceName = "SMM Service";
    let platform = String((body.platform || "").trim());
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
        return NextResponse.json({ success: false, error: "Selected service is currently disabled" }, { status: 400 });
      }
      serviceName = routed.name;
      platform = platform || routed.platform || "SMM";
      const mult = Number(routed.rate_multiplier || 1.07);
      rate = calculateLivePricePkr(routed.base_rate_usd, mult, liveUsdToPkr);
      min = Number(routed.min || 1);
      max = Number(routed.max || 100000);
      const isPkg = isPackageService(undefined, min, max);
      charge = calculateLiveChargePkr(rate, numericQuantity, isPkg);
    } else {
      // Legacy catalog fallback
      const servicesResponse = await getRizviServices();
      if (!Array.isArray(servicesResponse)) {
        return NextResponse.json({ success: false, error: "Unable to verify service limits" }, { status: 502 });
      }

      const legacyService = (servicesResponse as RizviService[]).find(
        (item) => String(item.service) === serviceId
      );

      if (!legacyService) {
        return NextResponse.json({ success: false, error: "Selected service is no longer available" }, { status: 400 });
      }

      const overrideResult = await db.query(
        `SELECT enabled, rate_multiplier FROM vexo_service_overrides WHERE service_id = $1 LIMIT 1`,
        [serviceId]
      );
      const override = overrideResult.rows[0];
      if (override && override.enabled === false) {
        return NextResponse.json({ success: false, error: "Selected service is currently unavailable" }, { status: 400 });
      }

      const rateMultiplier = override && Number(override.rate_multiplier) > 0 ? Number(override.rate_multiplier) : 1;
      serviceName = legacyService.name;
      platform = platform || String(legacyService.category || "General");
      min = Number(legacyService.min);
      max = Number(legacyService.max);
      rate = getVexoRate(legacyService.rate, rateMultiplier, liveUsdToPkr);
      charge = calculateLiveChargePkr(rate, numericQuantity, isPackageService(legacyService.type, min, max));
    }

    if (!Number.isFinite(min) || !Number.isFinite(max) || numericQuantity < min || numericQuantity > max) {
      return NextResponse.json({
        success: false,
        error: `Quantity must be between ${min.toLocaleString()} and ${max.toLocaleString()}`,
      }, { status: 400 });
    }

    const reservation = await reserveWalletForOrder({
      userId: Number(user.id),
      orderIdempotencyKey: idempotencyKey,
      serviceId,
      serviceName,
      platform,
      link: sanitizedLink,
      quantity: numericQuantity,
      ratePkr: rate,
      chargePkr: charge,
    });

    if (reservation.existing) {
      const existing = reservation.order;
      return NextResponse.json({
        success: true,
        duplicate: true,
        orderId: existing.provider_order_id ? String(existing.provider_order_id) : undefined,
        vexoOrderId: String(existing.id),
        rate,
        charge: Number(existing.charge_pkr),
        status: existing.status,
        balancePkr: null,
      });
    }

    const vexoOrderId = String(reservation.order.id);

    try {
      // Dispatch order to cheapest provider with automatic multi-provider failover
      const dispatchResult = await dispatchOrderWithFailover(serviceId, link, numericQuantity);

      if (!dispatchResult.success || !dispatchResult.orderId) {
        const reason = dispatchResult.error || "All upstream providers failed to accept the order.";
        await refundFailedOrder(vexoOrderId, reason);
        return NextResponse.json({
          success: false,
          error: `${reason} Your wallet balance was refunded in full.`,
          failoverAttempts: dispatchResult.failoverAttempts,
        }, { status: 502 });
      }

      const providerOrderId = dispatchResult.orderId;

      try {
        await markOrderProviderSuccess(vexoOrderId, providerOrderId);

        // Record provider and failover history in order record
        await db.query(
          `UPDATE vexo_orders
           SET provider_id = $1, failover_attempts = $2
           WHERE id = $3`,
          [dispatchResult.providerId || null, JSON.stringify(dispatchResult.failoverAttempts), vexoOrderId]
        );

        // Award 5% referral commission if user was invited by another user
        try {
          const refereeResult = await db.query(
            `SELECT referred_by FROM vexo_users WHERE id = $1 LIMIT 1`,
            [user.id]
          );
          const referrerId = refereeResult.rows[0]?.referred_by;
          if (referrerId && Number(referrerId) > 0 && Number(referrerId) !== Number(user.id)) {
            const commissionPkr = Math.round(charge * 0.05 * 100) / 100;
            if (commissionPkr >= 0.01) {
              await db.query(
                `UPDATE vexo_users 
                 SET referral_balance_pkr = COALESCE(referral_balance_pkr, 0) + $1 
                 WHERE id = $2`,
                [commissionPkr, referrerId]
              );
              await db.query(
                `INSERT INTO vexo_referral_earnings (referrer_id, referee_id, order_id, order_amount_pkr, commission_pkr)
                 VALUES ($1, $2, $3, $4, $5)`,
                [referrerId, user.id, vexoOrderId, charge, commissionPkr]
              );
            }
          }
        } catch (commErr) {
          console.warn("Could not award referral commission for order:", vexoOrderId, commErr);
        }
      } catch (databaseError) {
        console.error("VEXO ORDER FINALIZE ERROR:", databaseError);
        return NextResponse.json({
          success: false,
          error: "Your order was accepted by the provider, but VEXO could not finalize the order record. Your wallet debit was kept safely and the order needs admin reconciliation.",
          orderId: providerOrderId,
          vexoOrderId,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        orderId: providerOrderId,
        vexoOrderId,
        provider: dispatchResult.providerName,
        rate,
        charge,
        balancePkr: reservation.balancePkr,
        failoverAttempts: dispatchResult.failoverAttempts,
      });
    } catch (dispatchErr) {
      const reason = dispatchErr instanceof Error ? dispatchErr.message : "Unable to place provider order.";
      await refundFailedOrder(vexoOrderId, reason);
      return NextResponse.json({ success: false, error: `${reason} Your wallet has been refunded.` }, { status: 502 });
    }
  } catch (error) {
    if (error instanceof InsufficientWalletBalanceError) {
      return NextResponse.json({
        success: false,
        error: `Insufficient wallet balance. This order costs ₨${error.requiredPkr.toLocaleString()}, but your available balance is ₨${error.balancePkr.toLocaleString()}.`,
        balancePkr: error.balancePkr,
        requiredPkr: error.requiredPkr,
        code: "INSUFFICIENT_BALANCE",
      }, { status: 402 });
    }

    console.error("VEXO ORDER ERROR:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unable to place order",
    }, { status: 500 });
  }
}
