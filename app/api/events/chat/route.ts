import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { db } from "@/lib/db";
import { ensureEventsSchema, getEventMessages } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    if (!eventId) {
      return NextResponse.json({ success: false, error: "eventId is required" }, { status: 400 });
    }

    const messages = await getEventMessages(eventId, 60);
    return NextResponse.json({ success: true, messages });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to load messages",
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser().catch(() => null);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: "Please sign in to post messages in the live event chat.",
      }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const eventId = body.eventId;
    const text = (body.message || "").trim();

    if (!eventId || !text) {
      return NextResponse.json({
        success: false,
        error: "Message and eventId are required.",
      }, { status: 400 });
    }

    if (text.length > 500) {
      return NextResponse.json({
        success: false,
        error: "Message cannot exceed 500 characters.",
      }, { status: 400 });
    }

    await ensureEventsSchema();

    const isHost = Boolean(user.is_admin || user.is_super_admin);

    const ins = await db.query(`
      INSERT INTO vexo_event_messages (event_id, user_id, sender_name, is_host, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, event_id, user_id, sender_name, is_host, message, created_at
    `, [eventId, user.id, user.name, isHost, text]);

    return NextResponse.json({
      success: true,
      message: ins.rows[0],
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to send message",
    }, { status: 500 });
  }
}
