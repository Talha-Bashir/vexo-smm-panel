import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireAdminPermission("settings");
    if (!auth.authorized) return auth.response!;

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Tables critical to business & users
    const tables = [
      "vexo_users",
      "vexo_wallets",
      "vexo_orders",
      "vexo_deposits",
      "vexo_platform_settings",
      "vexo_support_tickets",
      "vexo_visitor_logs",
      "vexo_admin_activity",
      "vexo_providers",
      "vexo_service_overrides",
      "vexo_signup_bonus_claims",
      "vexo_coupons",
    ];

    if (action === "download") {
      const dump: Record<string, unknown[]> = {
        _meta: [
          {
            exportedAt: new Date().toISOString(),
            system: "Vexaro SMM Panel Automated Backup",
            tablesCount: tables.length,
          },
        ],
      };

      for (const t of tables) {
        try {
          const r = await db.query(`SELECT * FROM "${t}"`);
          dump[t] = r.rows;
        } catch (e: unknown) {
          dump[t] = [{ error: (e as Error).message }];
        }
      }

      const jsonStr = JSON.stringify(dump, null, 2);
      const filename = `vexaro_backup_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`;

      return new NextResponse(jsonStr, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Default: return status and row counts
    const counts: Record<string, number> = {};
    for (const t of tables) {
      try {
        const r = await db.query(`SELECT count(*)::int AS count FROM "${t}"`);
        counts[t] = r.rows[0]?.count || 0;
      } catch {
        counts[t] = 0;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      counts,
      totalUsers: counts["vexo_users"] || 0,
      totalOrders: counts["vexo_orders"] || 0,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Backup endpoint error" },
      { status: 500 }
    );
  }
}
