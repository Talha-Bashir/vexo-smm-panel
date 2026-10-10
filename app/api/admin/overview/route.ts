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
    const [a, b, c, d, e, profitTodayRes, profitMonthRes, profitAllTimeRes, platformRes] = await Promise.all([
      db.query(`SELECT COUNT(*)::int count FROM vexo_users WHERE role = 'user'`),
      db.query(`SELECT COUNT(*)::int count, COALESCE(SUM(amount_pkr) FILTER(WHERE status='Approved'), 0) approved FROM vexo_deposits`),
      db.query(`SELECT COALESCE(SUM(balance_pkr), 0) balance FROM vexo_wallets`),
      db.query(`SELECT COUNT(*)::int count, COUNT(*) FILTER(WHERE status='Completed')::int completed FROM vexo_orders`),
      db.query(`SELECT COUNT(*) FILTER(WHERE created_at>=CURRENT_DATE)::int today, COALESCE(SUM(charge_pkr) FILTER(WHERE created_at>=CURRENT_DATE), 0) sales FROM vexo_orders`),
      db.query(`
        SELECT 
          COALESCE(SUM(charge_pkr), 0)::numeric as rev,
          COALESCE(SUM(COALESCE(cost_pkr, ROUND(charge_pkr / 1.07, 2))), 0)::numeric as cost
        FROM vexo_orders 
        WHERE created_at >= CURRENT_DATE AND status NOT IN ('Canceled', 'Refunded')
      `),
      db.query(`
        SELECT 
          COALESCE(SUM(charge_pkr), 0)::numeric as rev,
          COALESCE(SUM(COALESCE(cost_pkr, ROUND(charge_pkr / 1.07, 2))), 0)::numeric as cost
        FROM vexo_orders 
        WHERE created_at >= date_trunc('month', CURRENT_DATE) AND status NOT IN ('Canceled', 'Refunded')
      `),
      db.query(`
        SELECT 
          COALESCE(SUM(charge_pkr), 0)::numeric as rev,
          COALESCE(SUM(COALESCE(cost_pkr, ROUND(charge_pkr / 1.07, 2))), 0)::numeric as cost
        FROM vexo_orders 
        WHERE status NOT IN ('Canceled', 'Refunded')
      `),
      db.query(`
        SELECT 
          COALESCE(NULLIF(TRIM(platform), ''), 'Other') as platform,
          COUNT(*)::int as count,
          COALESCE(SUM(charge_pkr), 0)::numeric as rev,
          COALESCE(SUM(charge_pkr - COALESCE(cost_pkr, ROUND(charge_pkr / 1.07, 2))), 0)::numeric as profit
        FROM vexo_orders
        WHERE status NOT IN ('Canceled', 'Refunded')
        GROUP BY COALESCE(NULLIF(TRIM(platform), ''), 'Other')
        ORDER BY rev DESC
        LIMIT 8
      `),
    ]);
    const p = await db.query(`SELECT COUNT(*)::int count FROM vexo_deposits WHERE status='Pending'`);

    const revToday = Number(profitTodayRes.rows[0]?.rev || 0);
    const costToday = Number(profitTodayRes.rows[0]?.cost || 0);
    const profitToday = Math.max(0, revToday - costToday);
    const marginToday = revToday > 0 ? (profitToday / revToday) * 100 : 0;

    const revMonth = Number(profitMonthRes.rows[0]?.rev || 0);
    const costMonth = Number(profitMonthRes.rows[0]?.cost || 0);
    const profitMonth = Math.max(0, revMonth - costMonth);
    const marginMonth = revMonth > 0 ? (profitMonth / revMonth) * 100 : 0;

    const revAll = Number(profitAllTimeRes.rows[0]?.rev || 0);
    const costAll = Number(profitAllTimeRes.rows[0]?.cost || 0);
    const profitAll = Math.max(0, revAll - costAll);
    const marginAll = revAll > 0 ? (profitAll / revAll) * 100 : 0;

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
        // Profit & Margin Intelligence
        profitTodayPkr: profitToday,
        costTodayPkr: costToday,
        marginTodayPercent: Math.round(marginToday * 10) / 10,
        profitMonthPkr: profitMonth,
        revenueMonthPkr: revMonth,
        marginMonthPercent: Math.round(marginMonth * 10) / 10,
        profitAllTimePkr: profitAll,
        revenueAllTimePkr: revAll,
        marginAllTimePercent: Math.round(marginAll * 10) / 10,
        platformProfits: platformRes.rows.map((row) => ({
          platform: row.platform,
          count: +row.count,
          revenuePkr: Number(row.rev),
          profitPkr: Number(row.profit),
          marginPercent: Number(row.rev) > 0 ? Math.round((Number(row.profit) / Number(row.rev)) * 1000) / 10 : 0,
        })),
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
