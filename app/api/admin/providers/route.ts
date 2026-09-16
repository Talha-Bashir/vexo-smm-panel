import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { ensureProvidersSchema, fetchProviderBalance, getRegisteredProviders } from "@/lib/providers";
import { syncAllProvidersAndRoute } from "@/lib/routing-engine";
import { logAdminActivity } from "@/lib/admin";

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

    // Query registered providers with live balances and service count
    const providersRes = await db.query(
      `SELECT p.id, p.name, p.api_url, p.currency, p.balance_usd, p.enabled, p.priority, p.last_sync_at,
              COUNT(ps.id) AS service_count
       FROM vexo_providers p
       LEFT JOIN vexo_provider_services ps ON ps.provider_id = p.id
       GROUP BY p.id
       ORDER BY p.priority ASC, p.name ASC`
    );

    const statsRes = await db.query(
      `SELECT COUNT(*) AS total_routed,
              COUNT(*) FILTER (WHERE auto_route = true) AS auto_routed_count,
              COUNT(*) FILTER (WHERE enabled = true) AS enabled_count
       FROM vexo_routed_services`
    );

    return NextResponse.json({
      success: true,
      providers: providersRes.rows.map((row) => ({
        id: row.id,
        name: row.name,
        apiUrl: row.api_url,
        currency: row.currency || "USD",
        balanceUsd: Number(row.balance_usd || 0),
        enabled: Boolean(row.enabled),
        priority: Number(row.priority || 1),
        lastSyncAt: row.last_sync_at,
        serviceCount: Number(row.service_count || 0),
      })),
      stats: {
        totalRouted: Number(statsRes.rows[0]?.total_routed || 0),
        autoRoutedCount: Number(statsRes.rows[0]?.auto_routed_count || 0),
        enabledCount: Number(statsRes.rows[0]?.enabled_count || 0),
      },
    });
  } catch (err) {
    console.error("ADMIN PROVIDERS GET ERROR:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load providers" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const g = await guard();
    if (g.error) return g.error;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "sync").toLowerCase();

    if (action === "sync") {
      const stats = await syncAllProvidersAndRoute();
      await logAdminActivity(Number(g.user!.id), "providers_sync", "providers", "all", stats);

      return NextResponse.json({
        success: true,
        message: "Successfully synchronized all 5 providers and recalculated least-cost routes.",
        stats,
      });
    }

    if (action === "refresh_balances") {
      const providers = await getRegisteredProviders();
      const balances: Record<string, number> = {};

      for (const p of providers) {
        if (!p.enabled) continue;
        try {
          const bal = await fetchProviderBalance(p);
          balances[p.name] = bal.balance;
        } catch (balErr) {
          console.warn(`Balance refresh failed for ${p.name}:`, balErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Refreshed live balances.",
        balances,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (err) {
    console.error("ADMIN PROVIDERS POST ERROR:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Provider operation failed" },
      { status: 500 }
    );
  }
}
