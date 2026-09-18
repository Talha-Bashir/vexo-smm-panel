import { NextResponse } from "next/server";
import crypto from "crypto";
import { getRizviServices, addRizviOrder } from "@/lib/rizvi";
import { calculateVexoCharge, getVexoRate } from "@/lib/pricing";
import { getLiveUsdToPkrRate, calculateLivePricePkr, calculateLiveChargePkr, isPackageService } from "@/lib/exchange-rate";
import { getRequestUser } from "@/lib/request-user";
import { db } from "@/lib/db";
import { ensureAdminSchema } from "@/lib/admin";
import { ensureProvidersSchema } from "@/lib/providers";
import { dispatchOrderWithFailover } from "@/lib/order-dispatch";
import {
  ensureWalletSchema,
  getUserWallet,
  markOrderProviderSuccess,
  refundFailedOrder,
  reserveWalletForOrder,
} from "@/lib/wallet";

type RizviService = {
  service: number;
  name: string;
  type?: string;
  min: number;
  max: number;
  rate: string | number;
};

export const dynamic = "force-dynamic";

interface ParsedLine {
  lineNumber: number;
  raw: string;
  serviceId?: string;
  link?: string;
  quantity?: number;
  error?: string;
  serviceName?: string;
  platform?: string;
  rate?: number;
  charge?: number;
}

interface OrderExecutionResult {
  lineNumber: number;
  serviceId: string;
  serviceName: string;
  link: string;
  quantity: number;
  chargePkr: number;
  status: "Success" | "Failed";
  orderId?: string;
  vexoOrderId?: string;
  error?: string;
}

function parseOrderLine(raw: string, lineNumber: number): ParsedLine {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { lineNumber, raw, error: "Empty line" };
  }

  let parts: string[] = [];
  if (trimmed.includes("|")) {
    parts = trimmed.split("|").map((s) => s.trim());
  } else if (trimmed.includes(",")) {
    parts = trimmed.split(",").map((s) => s.trim());
  } else {
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    if (tokens.length >= 3) {
      const sId = tokens[0];
      const qty = tokens[tokens.length - 1];
      const lnk = tokens.slice(1, tokens.length - 1).join(" ");
      parts = [sId, lnk, qty];
    }
  }

  if (parts.length < 3) {
    return {
      lineNumber,
      raw,
      error: "Invalid format. Expected: service_id | link | quantity",
    };
  }

  const [serviceId, link, quantityStr] = parts;
  const quantity = Number(quantityStr);

  if (!serviceId || !/^\d+$/.test(serviceId)) {
    return { lineNumber, raw, error: "Service ID must be a numeric identifier" };
  }

  if (!link || link.length < 3) {
    return { lineNumber, raw, error: "Link or target username is required" };
  }

  if (link.length > 2048) {
    return { lineNumber, raw, error: "Link exceeds maximum length (2048 characters)" };
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { lineNumber, raw, error: "Quantity must be a positive whole number" };
  }

  return { lineNumber, raw, serviceId, link, quantity };
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawOrdersText = String(body.orders || "").trim();

    if (!rawOrdersText) {
      return NextResponse.json(
        { success: false, error: "Please enter at least one order in the textarea." },
        { status: 400 }
      );
    }

    const rawLines = rawOrdersText.split(/\r?\n/);
    if (rawLines.length > 300) {
      return NextResponse.json(
        { success: false, error: "Mass orders are limited to 300 lines per batch." },
        { status: 400 }
      );
    }

    await ensureProvidersSchema();
    await ensureAdminSchema();
    await ensureWalletSchema();

    const liveUsdToPkr = await getLiveUsdToPkrRate();

    // 1. Fetch current services catalog: first vexo_routed_services, then legacy fallback
    const [routedRes, servicesResponse, overridesResult] = await Promise.all([
      db.query(`SELECT id, name, platform, rate_pkr, base_rate_usd, rate_multiplier, min, max, enabled FROM vexo_routed_services`),
      getRizviServices().catch(() => []),
      db.query(`SELECT service_id, enabled, rate_multiplier FROM vexo_service_overrides`).catch(() => ({ rows: [] })),
    ]);

    interface UnifiedService {
      id: string;
      name: string;
      platform: string;
      ratePkr: number;
      min: number;
      max: number;
      enabled: boolean;
      type: string;
    }

    const serviceMap = new Map<string, UnifiedService>();

    // Load routed services
    for (const r of routedRes.rows) {
      const mult = Number(r.rate_multiplier || 1.07);
      const livePkr = calculateLivePricePkr(r.base_rate_usd, mult, liveUsdToPkr);
      serviceMap.set(String(r.id), {
        id: String(r.id),
        name: r.name,
        platform: r.platform || "Mass Order",
        ratePkr: livePkr,
        min: Number(r.min || 1),
        max: Number(r.max || 100000),
        enabled: r.enabled !== false,
        type: "Default",
      });
    }

    // Load legacy services if not already in serviceMap
    const overrideMap = new Map<string, { enabled: boolean; rateMultiplier: number }>();
    for (const row of overridesResult.rows) {
      overrideMap.set(String(row.service_id), {
        enabled: row.enabled !== false,
        rateMultiplier: Number(row.rate_multiplier || 1),
      });
    }

    if (Array.isArray(servicesResponse)) {
      for (const s of servicesResponse as RizviService[]) {
        const idStr = String(s.service);
        if (!serviceMap.has(idStr)) {
          const override = overrideMap.get(idStr);
          const mult = override && override.rateMultiplier > 0 ? override.rateMultiplier : 1;
          const rate = getVexoRate(s.rate, mult, liveUsdToPkr);
          serviceMap.set(idStr, {
            id: idStr,
            name: s.name,
            platform: "Mass Order",
            ratePkr: rate,
            min: Number(s.min),
            max: Number(s.max),
            enabled: override ? override.enabled : true,
            type: s.type || "Default",
          });
        }
      }
    }

    // 2. Parse & validate each line
    const parsedLines: ParsedLine[] = [];
    let validCount = 0;
    let totalEstimatedCharge = 0;

    for (let i = 0; i < rawLines.length; i++) {
      const lineStr = rawLines[i].trim();
      if (!lineStr) continue; // skip blank lines

      const parsed = parseOrderLine(lineStr, i + 1);

      if (parsed.error) {
        parsedLines.push(parsed);
        continue;
      }

      const s = serviceMap.get(parsed.serviceId!);
      if (!s) {
        parsed.error = `Service ID ${parsed.serviceId} does not exist or is inactive`;
        parsedLines.push(parsed);
        continue;
      }

      if (!s.enabled) {
        parsed.error = `Service ID ${parsed.serviceId} is currently disabled`;
        parsedLines.push(parsed);
        continue;
      }

      if (parsed.quantity! < s.min || parsed.quantity! > s.max) {
        parsed.error = `Quantity ${parsed.quantity} is outside limits (${s.min.toLocaleString()} - ${s.max.toLocaleString()})`;
        parsedLines.push(parsed);
        continue;
      }

      const rate = s.ratePkr;
      const isPkg = isPackageService(s.type, s.min, s.max);
      const charge = calculateLiveChargePkr(rate, parsed.quantity!, isPkg);

      parsed.serviceName = s.name;
      parsed.rate = rate;
      parsed.charge = charge;
      parsed.platform = s.platform || "Mass Order";

      totalEstimatedCharge += charge;
      validCount++;
      parsedLines.push(parsed);
    }

    if (validCount === 0) {
      return NextResponse.json({
        success: false,
        error: "None of the submitted lines were valid.",
        parsedLines,
      }, { status: 400 });
    }

    totalEstimatedCharge = Math.round(totalEstimatedCharge * 100) / 100;

    // 3. Verify user's available wallet balance for the entire valid batch
    const currentWallet = await getUserWallet(user.id);
    const availablePkr = currentWallet.totalAvailablePkr ?? (currentWallet.balancePkr + (currentWallet.bonusBalancePkr || 0));

    if (availablePkr < totalEstimatedCharge) {
      return NextResponse.json({
        success: false,
        error: `Insufficient wallet balance for mass batch. Total required: ₨${totalEstimatedCharge.toLocaleString()}, Available: ₨${availablePkr.toLocaleString()}.`,
        requiredPkr: totalEstimatedCharge,
        balancePkr: availablePkr,
        validCount,
        totalLines: parsedLines.length,
        parsedLines,
      }, { status: 402 });
    }

    // 4. Execute valid orders batch
    const executionResults: OrderExecutionResult[] = [];
    let totalActualCharged = 0;
    let successfulCount = 0;
    let failedCount = 0;

    for (const item of parsedLines) {
      if (item.error || !item.serviceId || !item.link || !item.quantity || item.charge == null) {
        executionResults.push({
          lineNumber: item.lineNumber,
          serviceId: item.serviceId || "N/A",
          serviceName: item.serviceName || "Unknown Service",
          link: item.link || item.raw,
          quantity: item.quantity || 0,
          chargePkr: 0,
          status: "Failed",
          error: item.error || "Validation error",
        });
        failedCount++;
        continue;
      }

      const idempotencyKey = `mass_${crypto.randomBytes(16).toString("hex")}`;

      // Reserve funds in wallet
      let reservation;
      try {
        reservation = await reserveWalletForOrder({
          userId: Number(user.id),
          orderIdempotencyKey: idempotencyKey,
          serviceId: item.serviceId,
          serviceName: item.serviceName || `Service #${item.serviceId}`,
          platform: item.platform || "Mass Order",
          link: item.link,
          quantity: item.quantity,
          ratePkr: item.rate!,
          chargePkr: item.charge,
        });
      } catch (reserveError) {
        executionResults.push({
          lineNumber: item.lineNumber,
          serviceId: item.serviceId,
          serviceName: item.serviceName || "Service",
          link: item.link,
          quantity: item.quantity,
          chargePkr: item.charge,
          status: "Failed",
          error: reserveError instanceof Error ? reserveError.message : "Wallet debit failed",
        });
        failedCount++;
        continue;
      }

      const vexoOrderId = String(reservation.order.id);

      // Dispatch to upstream provider with automatic multi-provider failover
      try {
        const dispatchResult = await dispatchOrderWithFailover(item.serviceId, item.link, item.quantity);

        if (!dispatchResult.success || !dispatchResult.orderId) {
          const reason = dispatchResult.error || "All upstream providers failed to accept the order.";
          await refundFailedOrder(vexoOrderId, reason);
          executionResults.push({
            lineNumber: item.lineNumber,
            serviceId: item.serviceId,
            serviceName: item.serviceName || "Service",
            link: item.link,
            quantity: item.quantity,
            chargePkr: item.charge,
            status: "Failed",
            vexoOrderId,
            error: `${reason} (Auto-refunded to wallet)`,
          });
          failedCount++;
          continue;
        }

        const providerOrderId = dispatchResult.orderId;

        // Successfully accepted by upstream provider
        await markOrderProviderSuccess(vexoOrderId, providerOrderId);

        // Record provider and failover attempts
        await db.query(
          `UPDATE vexo_orders SET provider_id = $1, failover_attempts = $2 WHERE id = $3`,
          [dispatchResult.providerId || null, JSON.stringify(dispatchResult.failoverAttempts), vexoOrderId]
        );

        // Award 5% referral commission if referred
        try {
          const refereeResult = await db.query(
            `SELECT referred_by FROM vexo_users WHERE id = $1 LIMIT 1`,
            [user.id]
          );
          const referrerId = refereeResult.rows[0]?.referred_by;
          if (referrerId && Number(referrerId) > 0 && Number(referrerId) !== Number(user.id)) {
            const commissionPkr = Math.round(item.charge * 0.05 * 100) / 100;
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
                [referrerId, user.id, vexoOrderId, item.charge, commissionPkr]
              );
            }
          }
        } catch (_) {
          // referral commission error non-fatal
        }

        totalActualCharged += item.charge;
        successfulCount++;
        executionResults.push({
          lineNumber: item.lineNumber,
          serviceId: item.serviceId,
          serviceName: item.serviceName || "Service",
          link: item.link,
          quantity: item.quantity,
          chargePkr: item.charge,
          status: "Success",
          orderId: providerOrderId,
          vexoOrderId,
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Provider request failed";
        await refundFailedOrder(vexoOrderId, reason);
        executionResults.push({
          lineNumber: item.lineNumber,
          serviceId: item.serviceId,
          serviceName: item.serviceName || "Service",
          link: item.link,
          quantity: item.quantity,
          chargePkr: item.charge,
          status: "Failed",
          vexoOrderId,
          error: `${reason} (Auto-refunded to wallet)`,
        });
        failedCount++;
      }
    }

    const updatedWallet = await getUserWallet(user.id);

    return NextResponse.json({
      success: true,
      totalLines: parsedLines.length,
      successfulCount,
      failedCount,
      totalChargedPkr: Math.round(totalActualCharged * 100) / 100,
      balancePkr: updatedWallet.balancePkr,
      results: executionResults,
    });
  } catch (error) {
    console.error("VEXO MASS ORDER ERROR:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unable to process mass orders.",
    }, { status: 500 });
  }
}
