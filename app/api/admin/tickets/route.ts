import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-guard";
import { ensureAdminSchema, logAdminActivity } from "@/lib/admin";

export const dynamic = "force-dynamic";

async function guard() {
  const auth = await requireAdminPermission("tickets");
  if (!auth.authorized) return { error: auth.response! };
  return { user: auth.user! };
}

export async function GET() {
  try {
    const g = await guard();
    if (g.error) return g.error;
    await ensureAdminSchema();

    const r = await db.query(`
      SELECT t.id, t.user_id, u.name, u.email, t.subject, t.category,
             t.order_id, t.message, t.status, t.created_at, t.updated_at
      FROM vexo_support_tickets t
      JOIN vexo_users u ON u.id = t.user_id
      ORDER BY CASE WHEN t.status = 'Open' THEN 0 WHEN t.status = 'In Review' THEN 1 ELSE 2 END, t.created_at DESC
      LIMIT 200
    `);

    return NextResponse.json({
      success: true,
      tickets: r.rows.map((x) => ({
        id: String(x.id),
        userId: x.user_id,
        name: x.name,
        email: x.email,
        subject: x.subject,
        category: x.category,
        orderId: x.order_id,
        message: x.message,
        status: x.status,
        createdAt: x.created_at,
        updatedAt: x.updated_at,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unable to load support tickets." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const g = await guard();
    if (g.error) return g.error;
    await ensureAdminSchema();

    const b = await req.json();
    const ticketId = String(b?.ticketId || "").trim();
    const status = String(b?.status || "").trim();

    const allowed = ["Open", "In Review", "Resolved", "Closed"];
    if (!ticketId || !allowed.includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid ticket status." }, { status: 400 });
    }

    const r = await db.query(
      `UPDATE vexo_support_tickets
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, status`,
      [ticketId, status]
    );

    if (!r.rows[0]) {
      return NextResponse.json({ success: false, error: "Ticket not found." }, { status: 404 });
    }

    await logAdminActivity(+g.user!.id, "ticket_status_change", "support_ticket", ticketId, { status });

    return NextResponse.json({
      success: true,
      message: `Ticket status updated to ${status}.`,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Failed to update ticket status." },
      { status: 500 }
    );
  }
}
