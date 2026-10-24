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
import { getCachedProviderBalances, resolveEffectiveServicePricing } from "@/lib/balance-routing";
import { sendSubscriptionTelegramAlert } from "@/lib/balance-monitor/telegram";

import { checkMaintenanceApiBlock } from "@/lib/maintenance";
import { queueWhatsAppNotification, getUserWhatsAppPhone } from "@/lib/whatsapp-queue";

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
    const maintenanceBlock = await checkMaintenanceApiBlock();
    if (maintenanceBlock) return maintenanceBlock;

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
    let category = "";
    let rate = 0;
    let charge = 0;
    let min = 1;
    let max = 100000;
    let preferredProviderId: string | undefined = undefined;
    let maxAllowedCostUsd: number | undefined = undefined;
    let effectiveBaseUsd = 0;

    // 1. Check vexo_routed_services
    const isNum = /^\d+$/.test(serviceId);
    const routedRes = await db.query(
      isNum
        ? `SELECT id, name, platform, category, rate_pkr, custom_rate_pkr, base_rate_usd, rate_multiplier, min, max, enabled, active_provider_id, active_remote_service_id, fallback_queue, auto_route FROM vexo_routed_services WHERE id = $1 LIMIT 1`
        : `SELECT id, name, platform, category, rate_pkr, custom_rate_pkr, base_rate_usd, rate_multiplier, min, max, enabled, active_provider_id, active_remote_service_id, fallback_queue, auto_route FROM vexo_routed_services WHERE service_group_key = $1 OR id::text = $1 LIMIT 1`,
      [isNum ? Number(serviceId) : serviceId]
    );

    let isFreeTrial = false;

    if (routedRes.rows.length > 0) {
      const routed = routedRes.rows[0];
      if (routed.enabled === false) {
        return NextResponse.json({ success: false, error: "Selected service is currently disabled" }, { status: 400 });
      }
      serviceName = routed.name;
      category = routed.category || "";
      platform = platform || routed.platform || "SMM";

      isFreeTrial =
        category.includes("Free Test Trial") ||
        String(routed.service_group_key || "").startsWith("free_trial_") ||
        (Number(routed.custom_rate_pkr) === 0 && Number(routed.rate_pkr) === 0 && Number(routed.base_rate_usd) === 0);

      if (isFreeTrial) {
        // 1. Strict 1-Time Rule: Check if user already claimed free trial
        const userClaim = await db.query(
          `SELECT id FROM vexo_free_trial_claims WHERE user_id = $1 LIMIT 1`,
          [user.id]
        );
        if (userClaim.rows.length > 0) {
          return NextResponse.json({
            success: false,
            error: "You have already claimed your 1-time free test trial. To order more followers, views, or likes, please add funds to your wallet.",
          }, { status: 400 });
        }

        // 2. Multi-account prevention: check client IP and fingerprint
        const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
        const deviceFingerprint = String(body.deviceFingerprint || "").trim();
        if (deviceFingerprint) {
          const fpClaim = await db.query(
            `SELECT id FROM vexo_free_trial_claims WHERE device_fingerprint = $1 LIMIT 1`,
            [deviceFingerprint]
          );
          if (fpClaim.rows.length > 0) {
            return NextResponse.json({
              success: false,
              error: "The 1-time free test trial has already been claimed on this device. Please add funds to your wallet to continue.",
            }, { status: 400 });
          }
        }

        // 3. Strict Quantity Validation
        // For views (services 1271, 1783): max 1000
        // For likes (services 1419, 470): max 50
        const isViews = /view/i.test(`${serviceName} ${category}`);
        const isLikes = /like/i.test(`${serviceName} ${category}`);

        if (isViews && numericQuantity > 1000) {
          return NextResponse.json({
            success: false,
            error: "Maximum free views allowed is 1,000 for the test trial.",
          }, { status: 400 });
        }
        if (isLikes && numericQuantity > 50) {
          return NextResponse.json({
            success: false,
            error: "Maximum free likes allowed is 50 for the test trial.",
          }, { status: 400 });
        }

        min = Number(routed.min || (isViews ? 100 : 10));
        max = isViews ? 1000 : (isLikes ? 50 : Number(routed.max || 1000));
        if (numericQuantity < min) {
          return NextResponse.json({
            success: false,
            error: `Minimum quantity for this free trial is ${min}.`,
          }, { status: 400 });
        }

        rate = 0;
        charge = 0;
        effectiveBaseUsd = 0;
        preferredProviderId = routed.active_provider_id || "smooth_smm";
      } else {
        effectiveBaseUsd = Number(routed.base_rate_usd || 0);

        if (routed.auto_route !== false) {
          const balances = await getCachedProviderBalances();
          const pricing = resolveEffectiveServicePricing(routed, balances, liveUsdToPkr);
          rate = pricing.ratePkr;
          effectiveBaseUsd = pricing.baseRateUsd;
          preferredProviderId = pricing.activeProviderId;
        } else {
          const mult = Number(routed.rate_multiplier || 1.07);
          const rawCustom = Number(routed.custom_rate_pkr);
          if (Number.isFinite(rawCustom) && rawCustom > 0) {
            rate = rawCustom;
          } else {
            rate = calculateLivePricePkr(effectiveBaseUsd, mult, liveUsdToPkr);
          }
          preferredProviderId = routed.active_provider_id || undefined;
        }

        // Negative-Margin Protection: Floor customer price to never sell at a loss
        const minWholesalePkr = effectiveBaseUsd * liveUsdToPkr;
        const minProfitablePkr = Math.round(minWholesalePkr * 1.05 * 100) / 100;
        if (rate < minProfitablePkr) {
          rate = minProfitablePkr;
        }

        // Maximum wholesale cost allowed to prevent negative profit (Margin Protection)
        maxAllowedCostUsd = effectiveBaseUsd > 0 ? effectiveBaseUsd * 1.05 : undefined;

        min = Number(routed.min || 1);
        max = Number(routed.max || 100000);
        const isPkg = isPackageService(undefined, min, max);
        charge = calculateLiveChargePkr(rate, numericQuantity, isPkg);
      }
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
      category = String(legacyService.category || "");
      platform = platform || String(legacyService.category || "General");
      min = Number(legacyService.min);
      max = Number(legacyService.max);
      rate = getVexoRate(legacyService.rate, rateMultiplier, liveUsdToPkr);
      charge = calculateLiveChargePkr(rate, numericQuantity, isPackageService(legacyService.type, min, max));
    }

    const isSubscription =
      platform === "Subscriptions" ||
      platform.toLowerCase().includes("subscrip") ||
      category.toLowerCase().includes("subscrip") ||
      /canva|gemini|chatgpt|netflix|prime\s*video|iptv|envato|envento/i.test(`${category} ${serviceName}`);

    if (isSubscription) {
      platform = "Subscriptions";
    }

    // Apply custom user wholesale rate or global account discount if configured
    try {
      const userPricingRes = await db.query(
        `SELECT custom_discount_percent, custom_rates FROM vexo_users WHERE id = $1 LIMIT 1`,
        [Number(user.id)]
      );
      const userPricing = userPricingRes.rows[0];
      if (userPricing) {
        const customRates = (userPricing.custom_rates || {}) as Record<string, number>;
        const customDiscount = Number(userPricing.custom_discount_percent || 0);

        if (customRates[serviceId] && Number(customRates[serviceId]) > 0) {
          rate = Number(customRates[serviceId]);
          const isPkg = isPackageService(undefined, min, max);
          charge = calculateLiveChargePkr(rate, numericQuantity, isPkg);
        } else if (customDiscount > 0) {
          charge = Math.max(0.1, Math.round(charge * (1 - customDiscount / 100) * 100) / 100);
        }
      }
    } catch (pricingErr) {
      console.warn("Could not check custom pricing:", pricingErr);
    }

    if (!Number.isFinite(min) || !Number.isFinite(max) || numericQuantity < min || numericQuantity > max) {
      return NextResponse.json({
        success: false,
        error: `Quantity must be between ${min.toLocaleString()} and ${max.toLocaleString()}`,
      }, { status: 400 });
    }

    const userPhone =
      (body.whatsapp ? String(body.whatsapp).trim() : null) ||
      (user as unknown as { whatsapp?: string }).whatsapp ||
      (await getUserWhatsAppPhone(user.id));

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
      whatsapp: userPhone || undefined,
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
        createdAt: existing.created_at,
      });
    }

    const vexoOrderId = String(reservation.order.id);

    // If order is in Subscriptions category: DO NOT send to provider API, inform admin on Telegram
    if (isSubscription) {
      const providerOrderId = `SUB-${vexoOrderId}`;

      try {
        await markOrderProviderSuccess(vexoOrderId, providerOrderId);

        await db.query(
          `UPDATE vexo_orders
           SET provider_id = 'manual_telegram',
               status = 'Pending',
               cost_pkr = 0,
               cost_usd = 0
           WHERE id = $1`,
          [vexoOrderId]
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
          console.warn("Could not award referral commission for subscription order:", vexoOrderId, commErr);
        }

        // Notify Admin on Telegram for manual fulfillment (DO NOT send order to provider API)
        sendSubscriptionTelegramAlert({
          orderId: vexoOrderId,
          userName: user.name || "Customer",
          userEmail: user.email,
          serviceName,
          category: "Subscriptions",
          link: sanitizedLink,
          quantity: numericQuantity,
          chargePkr: charge,
          balancePkr: reservation.balancePkr,
          createdAt: reservation.order.created_at,
        }).catch((alertErr) => {
          console.error("Failed to send Telegram subscription alert:", alertErr);
        });

        return NextResponse.json({
          success: true,
          orderId: providerOrderId,
          vexoOrderId,
          provider: "Manual Fulfillment (Telegram)",
          rate,
          charge,
          status: "Pending",
          balancePkr: reservation.balancePkr,
          bonusBalancePkr: reservation.bonusBalancePkr,
          totalAvailablePkr: reservation.totalAvailablePkr,
          createdAt: reservation.order.created_at,
          message: "Subscription order placed successfully! Admin has been notified on Telegram for manual fulfillment.",
        });
      } catch (databaseError) {
        console.error("VEXO SUBSCRIPTION ORDER FINALIZE ERROR:", databaseError);
        return NextResponse.json({
          success: false,
          error: "Your subscription order was received, but could not be finalized. Please contact support.",
          orderId: providerOrderId,
          vexoOrderId,
        }, { status: 500 });
      }
    }

    try {
      // Dispatch order to funded provider with automatic multi-provider failover and margin protection
      const dispatchResult = await dispatchOrderWithFailover(serviceId, link, numericQuantity, {
        preferredProviderId,
        maxAllowedCostUsd,
      });

      if (!dispatchResult.success || !dispatchResult.orderId) {
        const reason = dispatchResult.error || "All upstream providers failed to accept the order.";
        await refundFailedOrder(vexoOrderId, reason);

        // Queue WhatsApp notification for failed/refunded order
        try {
          if (userPhone) {
            const shortId = vexoOrderId.slice(0, 8);
            const msg =
              `⚠️ *VEXARO Order Notice (#${shortId})*\n\n` +
              `Aapka order provider issue ki wajah se start nahi ho saka.\n\n` +
              `💰 *100% Refund:* Aapka balance (₨${Number(charge).toLocaleString()}) aapke wallet me *foran wapis refund* kar diya gaya hai! ✅\n\n` +
              `👉 Aap doosri recommended service select karke re-order kar sakte hain:\nhttps://vexarosmm.com/dashboard`;

            await queueWhatsAppNotification({
              phone: userPhone,
              message: msg,
              type: "order_refunded",
              referenceId: `order_refunded_${vexoOrderId}`,
              metadata: { orderId: vexoOrderId, userId: user.id },
            });
          }
        } catch (notifErr) {
          console.warn("[Order Refund WhatsApp Queue Error]:", notifErr);
        }
        return NextResponse.json({
          success: false,
          error: `${reason} Your wallet balance was refunded in full.`,
          failoverAttempts: dispatchResult.failoverAttempts,
        }, { status: 502 });
      }

      const providerOrderId = dispatchResult.orderId;

      try {
        await markOrderProviderSuccess(vexoOrderId, providerOrderId);

        const isPkg = isPackageService(undefined, min, max);
        const costUsd = effectiveBaseUsd > 0
          ? (isPkg ? effectiveBaseUsd : (effectiveBaseUsd * numericQuantity) / 1000)
          : Math.round((charge / 1.07 / liveUsdToPkr) * 10000) / 10000;
        const costPkr = Math.round(costUsd * liveUsdToPkr * 100) / 100;

        // Record provider, wholesale cost, and failover history in order record
        await db.query(
          `UPDATE vexo_orders
           SET provider_id = $1, failover_attempts = $2, cost_pkr = $3, cost_usd = $4
           WHERE id = $5`,
          [dispatchResult.providerId || null, JSON.stringify(dispatchResult.failoverAttempts), costPkr, costUsd, vexoOrderId]
        );

        if (isFreeTrial) {
          try {
            const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
            const deviceFingerprint = String(body.deviceFingerprint || "").trim();
            await db.query(
              `INSERT INTO vexo_free_trial_claims
               (user_id, order_id, service_id, service_name, platform, remote_service_id, quantity, link, client_ip, device_fingerprint)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                user.id,
                vexoOrderId,
                serviceId,
                serviceName,
                platform,
                dispatchResult.remoteServiceId || "",
                numericQuantity,
                sanitizedLink,
                clientIp,
                deviceFingerprint || null,
              ]
            );
            await db.query(
              `UPDATE vexo_users SET free_trial_claimed = TRUE, free_trial_claimed_at = NOW() WHERE id = $1`,
              [user.id]
            );
          } catch (ftErr) {
            console.error("Could not record free trial claim:", ftErr);
          }
        }

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
          error: "Your order was accepted by the provider, but VEXARO could not finalize the order record. Your wallet debit was kept safely and the order needs admin reconciliation.",
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
        bonusBalancePkr: reservation.bonusBalancePkr,
        totalAvailablePkr: reservation.totalAvailablePkr,
        failoverAttempts: dispatchResult.failoverAttempts,
        createdAt: reservation.order.created_at,
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
