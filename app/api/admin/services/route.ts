import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { ensureProvidersSchema } from "@/lib/providers";
import { logAdminActivity } from "@/lib/admin";
import { getLiveUsdToPkrRate, calculateLivePricePkr } from "@/lib/exchange-rate";

export const dynamic = "force-dynamic";

async function guard() {
  const auth = await requireAdminPermission("services");
  if (!auth.authorized) {
    return { error: auth.response! };
  }
  return { user: auth.user! };
}

export async function GET() {
  try {
    const g = await guard();
    if (g.error) return g.error;

    await ensureProvidersSchema();
    const liveUsdToPkr = await getLiveUsdToPkrRate();

    // Query vexo_routed_services
    const result = await db.query(
      `SELECT id, name, platform, category, service_group_key, is_guaranteed,
              auto_route, active_provider_id, active_remote_service_id,
              base_rate_usd, rate_multiplier, rate_pkr, min, max, refill, cancel,
              enabled, popular, fallback_queue, provider_rates, updated_at
       FROM vexo_routed_services
       ORDER BY platform ASC, id ASC`
    );

    return NextResponse.json({
      success: true,
      usd_to_pkr: liveUsdToPkr,
      services: result.rows.map((row) => {
        const mult = Number(row.rate_multiplier || 1.07);
        const liveRatePkr = calculateLivePricePkr(row.base_rate_usd, mult, liveUsdToPkr);
        const rateUsd = Math.round(Number(row.base_rate_usd) * mult * 10000) / 10000;
        return {
          id: row.id,
          service: row.id,
          name: row.name,
          platform: row.platform,
          category: row.category,
          service_group_key: row.service_group_key,
          is_guaranteed: Boolean(row.is_guaranteed),
          auto_route: Boolean(row.auto_route),
          active_provider_id: row.active_provider_id,
          active_remote_service_id: row.active_remote_service_id,
          base_rate_usd: Number(row.base_rate_usd),
          rate_multiplier: mult,
          rate_usd: rateUsd,
          rate_pkr: liveRatePkr,
          min: Number(row.min || 1),
          max: Number(row.max || 100000),
          refill: Boolean(row.refill),
          cancel: Boolean(row.cancel),
          enabled: Boolean(row.enabled),
          popular: Boolean(row.popular),
          fallback_queue: row.fallback_queue || [],
          provider_rates: row.provider_rates || {},
          updated_at: row.updated_at,
        };
      }),
    });
  } catch (e) {
    console.error("ADMIN SERVICES GET ERROR:", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unable to load services." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const g = await guard();
    if (g.error) return g.error;

    await ensureProvidersSchema();

    const body = await req.json();

    // 1. Bulk multiplier update across all services or specific platform
    if (body.action === "bulk_multiplier") {
      const mult = Number(body.rateMultiplier);
      if (!Number.isFinite(mult) || mult < 0.1 || mult > 50) {
        return NextResponse.json({ success: false, error: "Multiplier must be between 0.1 and 50." }, { status: 400 });
      }
      const platform = body.platform ? String(body.platform).trim() : "All";
      const liveUsdToPkr = await getLiveUsdToPkrRate();

      let q = `UPDATE vexo_routed_services 
               SET rate_multiplier = $1, 
                   rate_pkr = ROUND(base_rate_usd * $2 * $1, 4), 
                   updated_at = NOW()`;
      const params: unknown[] = [mult, liveUsdToPkr];
      if (platform && platform !== "All") {
        q += ` WHERE LOWER(platform) = LOWER($3)`;
        params.push(platform);
      }
      await db.query(q, params);
      await logAdminActivity(Number(g.user!.id), "service_bulk_multiplier", "routed_services", platform, { mult });

      return NextResponse.json({
        success: true,
        message: `Successfully applied markup multiplier ×${mult.toFixed(2)} to ${platform === "All" ? "all services" : platform + " services"}.`,
        usd_to_pkr: liveUsdToPkr,
      });
    }

    const serviceId = body?.serviceId != null ? String(body.serviceId).trim() : "";

    if (!serviceId) {
      return NextResponse.json({ success: false, error: "Service ID is required." }, { status: 400 });
    }

    // Lookup service
    const isNum = /^\d+$/.test(serviceId);
    const serviceRes = await db.query(
      isNum
        ? `SELECT * FROM vexo_routed_services WHERE id = $1 LIMIT 1`
        : `SELECT * FROM vexo_routed_services WHERE service_group_key = $1 OR id::text = $1 LIMIT 1`,
      [isNum ? Number(serviceId) : serviceId]
    );

    const service = serviceRes.rows[0];
    if (!service) {
      return NextResponse.json({ success: false, error: "Service not found." }, { status: 404 });
    }

    let enabled = service.enabled;
    let popular = service.popular;
    let autoRoute = service.auto_route;
    let activeProviderId = service.active_provider_id;
    let activeRemoteServiceId = service.active_remote_service_id;
    let baseRateUsd = Number(service.base_rate_usd);
    let rateMultiplier = Number(service.rate_multiplier || 1.07);

    if (typeof body.enabled === "boolean") enabled = body.enabled;
    if (typeof body.popular === "boolean") popular = body.popular;

    if (body.rateMultiplier !== undefined && body.rateMultiplier !== null) {
      const mult = Number(body.rateMultiplier);
      if (!Number.isFinite(mult) || mult < 0.1 || mult > 50) {
        return NextResponse.json({ success: false, error: "Multiplier must be between 0.1 and 50." }, { status: 400 });
      }
      rateMultiplier = mult;
    }

    // Provider override or auto-route change
    if (typeof body.autoRoute === "boolean") {
      autoRoute = body.autoRoute;
    }

    if (body.activeProviderId !== undefined) {
      const newProvId = String(body.activeProviderId).trim();
      if (newProvId && service.provider_rates && service.provider_rates[newProvId]) {
        activeProviderId = newProvId;
        activeRemoteServiceId = service.provider_rates[newProvId].remoteId;
        baseRateUsd = Number(service.provider_rates[newProvId].rateUsd);
        autoRoute = false; // Manual override disables auto-route
      }
    }

    // If autoRoute is explicitly turned ON, find the cheapest eligible quote
    if (autoRoute && service.fallback_queue && service.fallback_queue.length > 0) {
      const cheapest = service.fallback_queue[0];
      activeProviderId = cheapest.providerId;
      activeRemoteServiceId = cheapest.remoteServiceId;
      baseRateUsd = Number(cheapest.rateUsd);
    }

    const liveUsdToPkr = await getLiveUsdToPkrRate();
    const ratePkr = calculateLivePricePkr(baseRateUsd, rateMultiplier, liveUsdToPkr);
    const rateUsd = Math.round(baseRateUsd * rateMultiplier * 10000) / 10000;

    await db.query(
      `UPDATE vexo_routed_services
       SET enabled = $1, popular = $2, auto_route = $3, active_provider_id = $4,
           active_remote_service_id = $5, base_rate_usd = $6, rate_multiplier = $7,
           rate_pkr = $8, updated_at = NOW()
       WHERE id = $9`,
      [enabled, popular, autoRoute, activeProviderId, activeRemoteServiceId, baseRateUsd, rateMultiplier, ratePkr, service.id]
    );

    await logAdminActivity(Number(g.user!.id), "service_update", "routed_service", String(service.id), {
      enabled,
      popular,
      autoRoute,
      activeProviderId,
      rateMultiplier,
      rateUsd,
      ratePkr,
    });

    return NextResponse.json({
      success: true,
      message: "Service updated successfully.",
      service: {
        id: service.id,
        auto_route: autoRoute,
        active_provider_id: activeProviderId,
        rate_multiplier: rateMultiplier,
        base_rate_usd: baseRateUsd,
        rate_usd: rateUsd,
        rate_pkr: ratePkr,
        enabled,
        popular,
      },
    });
  } catch (e) {
    console.error("ADMIN SERVICE PATCH ERROR:", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unable to update service." },
      { status: 500 }
    );
  }
}
