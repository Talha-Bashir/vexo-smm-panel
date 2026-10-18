import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { getActiveEvent, getEventMessages } from "@/lib/events";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getRequestUser().catch(() => null);
    const event = await getActiveEvent();

    if (!event) {
      return NextResponse.json({
        success: true,
        event: null,
      });
    }

    let userParticipation = null;
    if (user) {
      const partRes = await db.query(`
        SELECT status, reward_amount, reward_credited_at, created_at
        FROM vexo_event_participants
        WHERE event_id = $1 AND user_id = $2
      `, [event.id, user.id]);

      if (partRes.rows.length > 0) {
        userParticipation = partRes.rows[0];
      }
    }

    const messages = await getEventMessages(event.id, 60);

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        status: event.status,
        type: event.type,
        streamUrl: event.stream_url,
        rewardAmount: Number(event.reward_amount),
        autoCreditOnJoin: event.auto_credit_on_join,
        maxWinners: event.max_winners,
        scheduledAt: event.scheduled_at,
        startedAt: event.started_at,
        endedAt: event.ended_at,
        participantCount: Number(event.participant_count || 0),
        totalAwarded: Number(event.total_awarded || 0),
      },
      userParticipation,
      messages,
      currentUser: user ? { id: user.id, name: user.name, isAdmin: user.is_admin } : null,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to load active event",
    }, { status: 500 });
  }
}
