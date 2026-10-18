import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureAdminSchema } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureAdminSchema();
    const r = await db.query(
      `SELECT id, title, message, type, scheduled_at, event_link, created_at
       FROM vexo_announcements
       WHERE enabled = true
       ORDER BY CASE WHEN type = 'event' THEN 0 ELSE 1 END, created_at DESC
       LIMIT 10`
    );
    return NextResponse.json({
      success: true,
      announcements: r.rows.map((x) => ({
        id: x.id,
        title: x.title,
        message: x.message,
        type: x.type || "announcement",
        scheduledAt: x.scheduled_at,
        eventLink: x.event_link,
        createdAt: x.created_at,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unable to load announcements." },
      { status: 500 }
    );
  }
}
