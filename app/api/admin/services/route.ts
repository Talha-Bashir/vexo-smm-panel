import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { ensureProvidersSchema } from "@/lib/providers";
import { logAdminActivity } from "@/lib/admin";
import { getLiveUsdToPkrRate, calculateLivePricePkr } from "@/lib/exchange-rate";
import { sanitizeServiceDescription } from "@/lib/service-descriptions";

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
              enabled, popular, fallback_queue, provider_rates, updated_at, description
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
        const normText = `${row.name} ${row.category || ""} ${row.description || ""}`.replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-");
        const isDrop = /no[\s-]*refill|without[\s-]*refill|refill[\s:]*no|refill[\s:]*0|0%[\s-]*refill|drop[\s-]*100%|100%[\s-]*drop|drop[\s-]*able|dropable|high[\s-]*drop|drop[\s-]*high|no[\s-]*guarantee|non[\s-]*guaranteed|not[\s-]*guaranteed|can[\s-]*drop|drop[\s-]*possible/i.test(normText);
        const isGuaranteed = isDrop ? false : Boolean(row.is_guaranteed);
        const isRefill = isDrop ? false : Boolean(row.refill);

        return {
          id: row.id,
          service: row.id,
          name: row.name,
          platform: row.platform,
          category: row.category,
          service_group_key: row.service_group_key,
          is_guaranteed: isGuaranteed,
          auto_route: Boolean(row.auto_route),
          active_provider_id: row.active_provider_id,
          active_remote_service_id: row.active_remote_service_id,
          base_rate_usd: Number(row.base_rate_usd),
          rate_multiplier: mult,
          rate_usd: rateUsd,
          rate_pkr: liveRatePkr,
          min: Number(row.min || 1),
          max: Number(row.max || 100000),
          refill: isRefill,
          cancel: Boolean(row.cancel),
          enabled: Boolean(row.enabled),
          popular: Boolean(row.popular),
          fallback_queue: row.fallback_queue || [],
          provider_rates: row.provider_rates || {},
          description: sanitizeServiceDescription(row.description || ""),
          desc: sanitizeServiceDescription(row.description || ""),
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

export async function POST(req: Request) {
  try {
    const g = await guard();
    if (g.error) return g.error;

    await ensureProvidersSchema();
    const body = await req.json();

    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ success: false, error: "Service name is required." }, { status: 400 });
    }

    const platform = String(body.platform || "Other").trim();
    const category = String(body.category || platform).trim();
    const min = Math.max(1, Number(body.min) || 10);
    const max = Math.max(min, Number(body.max) || 100000);
    const baseRateUsd = Math.max(0, Number(body.baseRateUsd ?? body.base_rate_usd) || 0);
    const rateMultiplier = Math.max(0.1, Number(body.rateMultiplier ?? body.rate_multiplier) || 1.07);
    const enabled = body.enabled !== false;
    const popular = Boolean(body.popular);
    const refill = Boolean(body.refill);
    const cancel = Boolean(body.cancel);
    const isGuaranteed = Boolean(body.is_guaranteed ?? refill);
    const autoRoute = Boolean(body.autoRoute ?? body.auto_route ?? false);
    const activeProviderId = body.activeProviderId || body.active_provider_id || null;
    const activeRemoteServiceId = body.activeRemoteServiceId || body.active_remote_service_id || null;
    const description = String(body.description || "");

    const liveUsdToPkr = await getLiveUsdToPkrRate();
    const ratePkr = calculateLivePricePkr(baseRateUsd, rateMultiplier, liveUsdToPkr);
    const rateUsd = Math.round(baseRateUsd * rateMultiplier * 10000) / 10000;

    // Generate unique service_group_key
    const sanitizedKey = `${platform.toLowerCase()}_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 45)}`;
    const uniqueKey = `${sanitizedKey}_${Date.now()}`;

    const insertRes = await db.query(
      `INSERT INTO vexo_routed_services (
         name, platform, category, service_group_key, is_guaranteed,
         auto_route, active_provider_id, active_remote_service_id,
         base_rate_usd, rate_multiplier, rate_pkr, min, max, refill, cancel,
         enabled, popular, fallback_queue, provider_rates, description, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8,
         $9, $10, $11, $12, $13, $14, $15,
         $16, $17, $18, $19, $20, NOW()
       ) RETURNING *`,
      [
        name, platform, category, uniqueKey, isGuaranteed,
        autoRoute, activeProviderId, activeRemoteServiceId,
        baseRateUsd, rateMultiplier, ratePkr, min, max, refill, cancel,
        enabled, popular, JSON.stringify([]), JSON.stringify({}), description
      ]
    );

    const newService = insertRes.rows[0];

    // Persist in vexo_service_overrides
    await db.query(
      `INSERT INTO vexo_service_overrides (service_id, enabled, popular, rate_multiplier, custom_description, updated_at, updated_by)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       ON CONFLICT (service_id) DO UPDATE
       SET enabled = EXCLUDED.enabled,
           popular = EXCLUDED.popular,
           rate_multiplier = EXCLUDED.rate_multiplier,
           custom_description = EXCLUDED.custom_description,
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by`,
      [String(newService.id), enabled, popular, rateMultiplier, description, Number(g.user!.id)]
    );

    await logAdminActivity(Number(g.user!.id), "service_create", "routed_service", String(newService.id), {
      name,
      platform,
      category,
      baseRateUsd,
      rateMultiplier,
      ratePkr,
      enabled,
    });

    return NextResponse.json({
      success: true,
      message: "Service created successfully.",
      service: {
        id: newService.id,
        service: newService.id,
        name: newService.name,
        platform: newService.platform,
        category: newService.category,
        service_group_key: newService.service_group_key,
        is_guaranteed: Boolean(newService.is_guaranteed),
        auto_route: Boolean(newService.auto_route),
        active_provider_id: newService.active_provider_id,
        active_remote_service_id: newService.active_remote_service_id,
        base_rate_usd: Number(newService.base_rate_usd),
        rate_multiplier: Number(newService.rate_multiplier),
        rate_usd: rateUsd,
        rate_pkr: Number(newService.rate_pkr),
        min: Number(newService.min),
        max: Number(newService.max),
        refill: Boolean(newService.refill),
        cancel: Boolean(newService.cancel),
        enabled: Boolean(newService.enabled),
        popular: Boolean(newService.popular),
        fallback_queue: [],
        provider_rates: {},
        description: newService.description,
        desc: newService.description,
        updated_at: newService.updated_at,
      },
    });
  } catch (e) {
    console.error("ADMIN SERVICE POST ERROR:", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unable to create service." },
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

    // 2. Bulk enable/disable action
    if (body.action === "bulk_status") {
      const enabledVal = Boolean(body.enabled);
      const platform = body.platform ? String(body.platform).trim() : "All";
      const providerId = body.providerId ? String(body.providerId).trim() : "All";
      const serviceIds: any[] = Array.isArray(body.serviceIds) ? body.serviceIds : [];

      let q = `UPDATE vexo_routed_services SET enabled = $1, updated_at = NOW()`;
      const params: unknown[] = [enabledVal];

      if (serviceIds.length > 0) {
        q += ` WHERE id = ANY($2::int[])`;
        params.push(serviceIds.map(Number));
      } else {
        const conditions: string[] = [];
        if (platform && platform !== "All") {
          params.push(platform);
          conditions.push(`LOWER(platform) = LOWER($${params.length})`);
        }
        if (providerId && providerId !== "All") {
          params.push(providerId);
          conditions.push(`active_provider_id = $${params.length}`);
        }
        if (conditions.length > 0) {
          q += ` WHERE ` + conditions.join(" AND ");
        }
      }

      await db.query(q, params);
      await logAdminActivity(Number(g.user!.id), "service_bulk_status", "routed_services", platform, { enabled: enabledVal });

      return NextResponse.json({
        success: true,
        message: `Successfully ${enabledVal ? "enabled" : "disabled"} services.`,
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

    let name = service.name;
    let platform = service.platform;
    let category = service.category;
    let min = service.min;
    let max = service.max;
    let refill = service.refill;
    let cancel = service.cancel;
    let isGuaranteed = service.is_guaranteed;
    let enabled = service.enabled;
    let popular = service.popular;
    let autoRoute = service.auto_route;
    let activeProviderId = service.active_provider_id;
    let activeRemoteServiceId = service.active_remote_service_id;
    let baseRateUsd = Number(service.base_rate_usd);
    let rateMultiplier = Number(service.rate_multiplier || 1.07);

    if (body.name !== undefined && String(body.name).trim()) name = String(body.name).trim();
    if (body.platform !== undefined && String(body.platform).trim()) platform = String(body.platform).trim();
    if (body.category !== undefined && String(body.category).trim()) category = String(body.category).trim();
    if (body.min !== undefined && Number(body.min) >= 1) min = Number(body.min);
    if (body.max !== undefined && Number(body.max) >= 1) max = Number(body.max);
    if (typeof body.refill === "boolean") refill = body.refill;
    if (typeof body.cancel === "boolean") cancel = body.cancel;
    if (typeof body.is_guaranteed === "boolean") isGuaranteed = body.is_guaranteed;
    if (typeof body.enabled === "boolean") enabled = body.enabled;
    if (typeof body.popular === "boolean") popular = body.popular;

    if (body.baseRateUsd !== undefined || body.base_rate_usd !== undefined) {
      const bUsd = Number(body.baseRateUsd ?? body.base_rate_usd);
      if (Number.isFinite(bUsd) && bUsd >= 0) baseRateUsd = bUsd;
    }

    if (body.activeRemoteServiceId !== undefined) {
      activeRemoteServiceId = body.activeRemoteServiceId ? String(body.activeRemoteServiceId).trim() : null;
    }

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
      } else if (newProvId) {
        activeProviderId = newProvId;
        autoRoute = false;
      }
    }

    // If autoRoute is explicitly turned ON, find the cheapest eligible quote
    if (autoRoute && service.fallback_queue && service.fallback_queue.length > 0) {
      const cheapest = service.fallback_queue[0];
      activeProviderId = cheapest.providerId;
      activeRemoteServiceId = cheapest.remoteServiceId;
      baseRateUsd = Number(cheapest.rateUsd);
    }

    let description = service.description;
    if (body.description !== undefined) {
      description = String(body.description);
    }

    const liveUsdToPkr = await getLiveUsdToPkrRate();
    const ratePkr = calculateLivePricePkr(baseRateUsd, rateMultiplier, liveUsdToPkr);
    const rateUsd = Math.round(baseRateUsd * rateMultiplier * 10000) / 10000;

    await db.query(
      `UPDATE vexo_routed_services
       SET name = $1, platform = $2, category = $3, min = $4, max = $5,
           refill = $6, cancel = $7, is_guaranteed = $8,
           enabled = $9, popular = $10, auto_route = $11, active_provider_id = $12,
           active_remote_service_id = $13, base_rate_usd = $14, rate_multiplier = $15,
           rate_pkr = $16, description = $17, updated_at = NOW()
       WHERE id = $18`,
      [
        name, platform, category, min, max,
        refill, cancel, isGuaranteed,
        enabled, popular, autoRoute, activeProviderId,
        activeRemoteServiceId, baseRateUsd, rateMultiplier,
        ratePkr, description, service.id
      ]
    );

    // Also persist in vexo_service_overrides
    await db.query(
      `INSERT INTO vexo_service_overrides (service_id, enabled, popular, rate_multiplier, custom_description, updated_at, updated_by)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       ON CONFLICT (service_id) DO UPDATE
       SET enabled = EXCLUDED.enabled,
           popular = EXCLUDED.popular,
           rate_multiplier = EXCLUDED.rate_multiplier,
           custom_description = EXCLUDED.custom_description,
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by`,
      [String(service.id), enabled, popular, rateMultiplier, description, Number(g.user!.id)]
    );

    await logAdminActivity(Number(g.user!.id), "service_update", "routed_service", String(service.id), {
      name,
      platform,
      category,
      enabled,
      popular,
      autoRoute,
      activeProviderId,
      rateMultiplier,
      rateUsd,
      ratePkr,
      descriptionUpdated: body.description !== undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Service updated successfully.",
      service: {
        id: service.id,
        service: service.id,
        name,
        platform,
        category,
        min: Number(min),
        max: Number(max),
        refill: Boolean(refill),
        cancel: Boolean(cancel),
        is_guaranteed: Boolean(isGuaranteed),
        auto_route: autoRoute,
        active_provider_id: activeProviderId,
        active_remote_service_id: activeRemoteServiceId,
        rate_multiplier: rateMultiplier,
        base_rate_usd: baseRateUsd,
        rate_usd: rateUsd,
        rate_pkr: ratePkr,
        enabled,
        popular,
        description,
        desc: description,
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

export async function DELETE(req: Request) {
  try {
    const g = await guard();
    if (g.error) return g.error;

    const { searchParams } = new URL(req.url);
    let serviceId = searchParams.get("id") || searchParams.get("serviceId");

    if (!serviceId) {
      const body = await req.json().catch(() => ({}));
      serviceId = body.serviceId || body.id;
    }

    if (!serviceId) {
      return NextResponse.json({ success: false, error: "Service ID is required." }, { status: 400 });
    }

    const isNum = /^\d+$/.test(String(serviceId));
    const targetId = isNum ? Number(serviceId) : serviceId;

    const delRes = await db.query(
      isNum
        ? `DELETE FROM vexo_routed_services WHERE id = $1 RETURNING id, name`
        : `DELETE FROM vexo_routed_services WHERE service_group_key = $1 OR id::text = $1 RETURNING id, name`,
      [targetId]
    );

    if (delRes.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Service not found or already deleted." }, { status: 404 });
    }

    await db.query(`DELETE FROM vexo_service_overrides WHERE service_id = $1`, [String(serviceId)]);

    await logAdminActivity(Number(g.user!.id), "service_delete", "routed_service", String(serviceId), {
      name: delRes.rows[0]?.name,
    });

    return NextResponse.json({
      success: true,
      message: `Service #${serviceId} ("${delRes.rows[0]?.name}") deleted successfully.`,
    });
  } catch (e) {
    console.error("ADMIN SERVICE DELETE ERROR:", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unable to delete service." },
      { status: 500 }
    );
  }
}
