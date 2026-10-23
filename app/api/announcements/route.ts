import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureAdminSchema } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureAdminSchema();
    const r = await db.query(
      `SELECT a.id, a.title, a.message, a.type, a.scheduled_at, a.event_link, a.created_at
       FROM vexo_announcements a
       WHERE a.enabled = true
         AND (
           a.type != 'event'
           OR EXISTS (
             SELECT 1 FROM vexo_events e 
             WHERE e.status = 'live' 
               AND (e.ended_at IS NULL OR e.ended_at > NOW())
           )
         )
       ORDER BY CASE WHEN a.type = 'event' THEN 0 ELSE 1 END, a.created_at DESC
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
