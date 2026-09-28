import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureProvidersSchema } from "@/lib/providers";
import { getRizviServices } from "@/lib/rizvi";
import { getLiveUsdToPkrRate, calculateLivePricePkr } from "@/lib/exchange-rate";
import { getCachedProviderBalances, resolveEffectiveServicePricing } from "@/lib/balance-routing";
import { generateServiceDescription, sanitizeServiceDescription } from "@/lib/service-descriptions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureProvidersSchema();
    const liveUsdToPkr = await getLiveUsdToPkrRate();

    const { searchParams } = new URL(req.url);
    const platformFilter = searchParams.get("platform");

    // 1. Query vexo_routed_services
    let query = `
      SELECT id, name, platform, category, service_group_key, is_guaranteed,
             auto_route, active_provider_id, active_remote_service_id,
             base_rate_usd, rate_multiplier, rate_pkr, min, max, refill, cancel,
             popular, enabled, provider_rates, fallback_queue, description
      FROM vexo_routed_services
      WHERE enabled = true
    `;
    const params: unknown[] = [];
    if (platformFilter) {
      params.push(platformFilter);
      query += ` AND LOWER(platform) = LOWER($1)`;
    }
    query += ` ORDER BY platform ASC, rate_pkr ASC`;

    const routedRes = await db.query(query, params);

    if (routedRes.rows.length > 0) {
      const balances = await getCachedProviderBalances();

      const services = routedRes.rows.map((row) => {
        const pricing = row.auto_route !== false
          ? resolveEffectiveServicePricing(row, balances, liveUsdToPkr)
          : {
              activeProviderId: row.active_provider_id,
              activeRemoteServiceId: row.active_remote_service_id,
              baseRateUsd: Number(row.base_rate_usd || 0),
              rateMultiplier: Number(row.rate_multiplier || 1.07),
              rateUsd: Math.round(Number(row.base_rate_usd || 0) * Number(row.rate_multiplier || 1.07) * 10000) / 10000,
              ratePkr: calculateLivePricePkr(row.base_rate_usd, Number(row.rate_multiplier || 1.07), liveUsdToPkr),
              isFunded: true,
            };

        const livePkr = pricing.ratePkr;
        const rateUsd = pricing.rateUsd;
        const normText = `${row.name} ${row.category || ""} ${row.description || ""}`.replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-");
        const isDrop = /no[\s-]*refill|without[\s-]*refill|refill[\s:]*no|refill[\s:]*0|0%[\s-]*refill|drop[\s-]*100%|100%[\s-]*drop|drop[\s-]*able|dropable|high[\s-]*drop|drop[\s-]*high|no[\s-]*guarantee|non[\s-]*guaranteed|not[\s-]*guaranteed|can[\s-]*drop|drop[\s-]*possible/i.test(normText);
        const isGuaranteed = isDrop ? false : Boolean(row.is_guaranteed);
        const isRefill = isDrop ? false : Boolean(row.refill || isGuaranteed);
        const description = sanitizeServiceDescription(
          row.description ||
          generateServiceDescription({
            name: row.name,
            platform: row.platform,
            category: row.category,
            min: Number(row.min || 10),
            max: Number(row.max || 100000),
            isGuaranteed,
            refill: isRefill,
          })
        );

        return {
          service: row.id,
          name: row.name,
          type: "Default",
          category: row.category || row.platform,
          platform: row.platform,
          rate: livePkr.toFixed(2),
          rate_pkr: livePkr,
          rate_usd: rateUsd,
          base_rate_usd: pricing.baseRateUsd,
          rate_multiplier: pricing.rateMultiplier,
          min: Number(row.min || 10),
          max: Number(row.max || 100000),
          refill: isRefill,
          cancel: Boolean(row.cancel),
          is_guaranteed: isGuaranteed,
          popular: Boolean(row.popular),
          active_provider_id: pricing.activeProviderId,
          active_remote_service_id: pricing.activeRemoteServiceId,
          auto_route: Boolean(row.auto_route),
          is_funded: pricing.isFunded,
          provider_rates: row.provider_rates || {},
          fallback_queue: row.fallback_queue || [],
          desc: description,
          description: description,
        };
      });

      return NextResponse.json({
        success: true,
        services,
        total: services.length,
        source: "routed",
        usd_to_pkr: liveUsdToPkr,
      });
    }

    // 2. Fallback to legacy Rizvi catalog if routed table is empty
    const legacy = await getRizviServices();
    const formattedLegacy = (Array.isArray(legacy) ? legacy : []).map((item: any) => {
      const usdRate = Number(item.rate || 0);
      const mult = 1.07;
      const livePkr = calculateLivePricePkr(usdRate, mult, liveUsdToPkr);
      const retailUsd = Math.round(usdRate * mult * 10000) / 10000;
      return {
        ...item,
        base_rate_usd: usdRate,
        rate_multiplier: mult,
        rate_usd: retailUsd,
        rate_pkr: livePkr,
        rate: livePkr.toFixed(2),
        desc: sanitizeServiceDescription(item.desc || item.description || ""),
        description: sanitizeServiceDescription(item.desc || item.description || ""),
      };
    });
    return NextResponse.json({
      success: true,
      services: formattedLegacy,
      total: formattedLegacy.length,
      source: "legacy",
      usd_to_pkr: liveUsdToPkr,
    });
  } catch (error) {
    console.error("VEXO SERVICES API ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load services",
      },
      { status: 500 }
    );
  }
}