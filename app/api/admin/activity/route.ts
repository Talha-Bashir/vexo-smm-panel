import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-guard";
import { ensureAdminSchema } from "@/lib/admin";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdminPermission("analytics");
    if (!auth.authorized) return auth.response!;

    await ensureAdminSchema();
    const r = await db.query(
      `SELECT a.id, a.action, a.target_type, a.target_id, a.details, a.created_at, u.name, u.email
       FROM vexo_admin_activity a
       LEFT JOIN vexo_users u ON u.id = a.admin_user_id
       ORDER BY a.created_at DESC
       LIMIT 300`
    );
    return NextResponse.json({
      success: true,
      activity: r.rows.map((x) => ({
        id: x.id,
        action: x.action,
        targetType: x.target_type,
        targetId: x.target_id,
        details: x.details,
        createdAt: x.created_at,
        adminName: x.name,
        adminEmail: x.email,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unable to load activity." },
      { status: 500 }
    );
  }
}
