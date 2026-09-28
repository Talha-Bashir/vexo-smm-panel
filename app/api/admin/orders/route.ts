import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-guard";
import { ensureAdminSchema, logAdminActivity } from "@/lib/admin";
import { syncOrders } from "@/lib/order-sync";
export const dynamic = "force-dynamic";

async function guard() {
  const auth = await requireAdminPermission("orders");
  if (!auth.authorized) return { error: auth.response! };
  return { user: auth.user! };
}
export async function GET(req: Request) {
  try {
    const g = await guard();
    if (g.error) return g.error;
    await ensureAdminSchema();

    // Automatically synchronize active orders across providers (throttled to at most once per 30s)
    try {
      await syncOrders({ limit: 20, minAgeSeconds: 30 });
    } catch (syncErr) {
      console.warn("[AdminOrdersAPI] Auto-sync warning:", syncErr);
    }

    const p = new URL(req.url).searchParams;
    const q = p.get("q")?.trim() || "";
    const s = p.get("status")?.trim() || "";

    const r = await db.query(
      `SELECT o.id, o.user_id, u.name, u.email, o.provider_order_id,
              o.service_id, o.service_name, o.link, o.quantity,
              COALESCE(o.rate_pkr, o.rate, 0) AS rate_pkr,
              o.charge_pkr, o.status, o.start_count, o.remains, o.created_at, o.updated_at
       FROM vexo_orders o
       LEFT JOIN vexo_users u ON u.id = o.user_id
       WHERE ($1 = '' OR o.provider_order_id ILIKE '%' || $1 || '%' OR o.service_id ILIKE '%' || $1 || '%' OR o.service_name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
         AND ($2 = '' OR o.status = $2)
       ORDER BY o.created_at DESC
       LIMIT 500`,
      [q, s]
    );

    return NextResponse.json({
      success: true,
      orders: r.rows.map((x) => ({
        id: x.id,
        userId: x.user_id,
        name: x.name,
        email: x.email,
        providerOrderId: x.provider_order_id,
        serviceId: x.service_id,
        serviceName: x.service_name,
        link: x.link,
        quantity: +x.quantity,
        rate: x.rate_pkr == null ? null : +x.rate_pkr,
        ratePkr: x.rate_pkr == null ? null : +x.rate_pkr,
        chargePkr: x.charge_pkr == null ? null : +x.charge_pkr,
        status: x.status,
        startCount: x.start_count != null && String(x.start_count).trim() !== "" ? String(x.start_count).trim() : null,
        remains: x.remains != null && String(x.remains).trim() !== "" ? String(x.remains).trim() : null,
        createdAt: x.created_at,
        updatedAt: x.updated_at,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unable to load orders." },
      { status: 500 }
    );
  }
}
export async function PATCH(req:Request){try{const g=await guard();if(g.error)return g.error;await ensureAdminSchema();const b=await req.json(),id=String(b?.orderId||""),status=String(b?.status||"");const allowed=["Pending","Processing","In progress","Completed","Partial","Canceled","Cancelled","Failed"];if(!id||!allowed.includes(status))return NextResponse.json({success:false,error:"Invalid order status."},{status:400});const r=await db.query(`UPDATE vexo_orders SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING id`,[id,status]);if(!r.rows[0])return NextResponse.json({success:false,error:"Order not found."},{status:404});await logAdminActivity(+g.user!.id,"order_status_change","order",id,{status});return NextResponse.json({success:true,message:"Order status updated."})}catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:"Unable to update order."},{status:500})}}
