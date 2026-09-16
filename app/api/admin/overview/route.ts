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
    const [a, b, c, d, e] = await Promise.all([
      db.query(`SELECT COUNT(*)::int count FROM vexo_users WHERE role = 'user'`),
      db.query(`SELECT COUNT(*)::int count, COALESCE(SUM(amount_pkr) FILTER(WHERE status='Approved'), 0) approved FROM vexo_deposits`),
      db.query(`SELECT COALESCE(SUM(balance_pkr), 0) balance FROM vexo_wallets`),
      db.query(`SELECT COUNT(*)::int count, COUNT(*) FILTER(WHERE status='Completed')::int completed FROM vexo_orders`),
      db.query(`SELECT COUNT(*) FILTER(WHERE created_at>=CURRENT_DATE)::int today, COALESCE(SUM(charge_pkr) FILTER(WHERE created_at>=CURRENT_DATE), 0) sales FROM vexo_orders`),
    ]);
    const p = await db.query(`SELECT COUNT(*)::int count FROM vexo_deposits WHERE status='Pending'`);
    return NextResponse.json({
      success: true,
      stats: {
        users: +a.rows[0].count,
        deposits: +b.rows[0].count,
        approvedDepositsPkr: +b.rows[0].approved,
        walletLiabilityPkr: +c.rows[0].balance,
        orders: +d.rows[0].count,
        completedOrders: +d.rows[0].completed,
        ordersToday: +e.rows[0].today,
        salesTodayPkr: +e.rows[0].sales,
        pendingDeposits: +p.rows[0].count,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unable to load overview." },
      { status: 500 }
    );
  }
}
