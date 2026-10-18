import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { ensureEventsSchema } from "@/lib/events";

export const dynamic = "force-dynamic";

async function guard() {
  const auth = await requireAdminPermission("announcements");
  if (!auth.authorized) return { error: auth.response! };
  return { user: auth.user! };
}

export async function GET() {
  try {
    const g = await guard();
    if (g.error) return g.error;

    await ensureEventsSchema();

    const res = await db.query(`
      SELECT 
        e.*,
        (SELECT COUNT(*)::int FROM vexo_event_participants p WHERE p.event_id = e.id) as participant_count,
        (SELECT COUNT(*)::int FROM vexo_event_participants p WHERE p.event_id = e.id AND p.status IN ('claimed', 'winner')) as winners_count,
        (SELECT COALESCE(SUM(reward_amount), 0)::numeric FROM vexo_event_participants p WHERE p.event_id = e.id AND p.status IN ('claimed', 'winner')) as total_awarded
      FROM vexo_events e
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      events: res.rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        status: r.status,
        type: r.type,
        streamUrl: r.stream_url,
        rewardAmount: Number(r.reward_amount),
        rewardType: r.reward_type,
        autoCreditOnJoin: r.auto_credit_on_join,
        maxWinners: r.max_winners,
        scheduledAt: r.scheduled_at,
        startedAt: r.started_at,
        endedAt: r.ended_at,
        participantCount: Number(r.participant_count || 0),
        winnersCount: Number(r.winners_count || 0),
        totalAwarded: Number(r.total_awarded || 0),
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to load events",
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const g = await guard();
    if (g.error) return g.error;

    const body = await req.json().catch(() => ({}));
    const {
      title,
      description,
      status = "upcoming",
      type = "giveaway",
      streamUrl = "",
      rewardAmount = 50.00,
      autoCreditOnJoin = true,
      maxWinners = 0,
      scheduledAt = new Date().toISOString(),
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    await ensureEventsSchema();

    // If setting to live, optional: ensure other live events are ended or leave multiple
    let startedAt = status === "live" ? new Date() : null;

    const ins = await db.query(`
      INSERT INTO vexo_events (
        title, description, status, type, stream_url, reward_amount, 
        auto_credit_on_join, max_winners, scheduled_at, started_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, title, status, created_at
    `, [
      title.trim(),
      description || "",
      status,
      type,
      streamUrl.trim(),
      Number(rewardAmount) || 50,
      Boolean(autoCreditOnJoin),
      Number(maxWinners) || 0,
      scheduledAt ? new Date(scheduledAt) : new Date(),
      startedAt
    ]);

    // Send host announcement into event chat
    await db.query(`
      INSERT INTO vexo_event_messages (event_id, sender_name, is_host, message)
      VALUES ($1, 'VEXARO Host (Admin)', true, $2)
    `, [
      ins.rows[0].id,
      `🎪 New Live Event created by Admin: "${title}"! Join the event and participate in the giveaway!`
    ]);

    return NextResponse.json({
      success: true,
      event: ins.rows[0],
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to create event",
    }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const g = await guard();
    if (g.error) return g.error;

    const body = await req.json().catch(() => ({}));
    const { id, status, title, description, streamUrl, rewardAmount, autoCreditOnJoin, maxWinners } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Event id is required" }, { status: 400 });
    }

    await ensureEventsSchema();

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(status);
      if (status === "live") {
        updates.push(`started_at = COALESCE(started_at, NOW())`);
      } else if (status === "ended") {
        updates.push(`ended_at = NOW()`);
      }
    }

    if (title !== undefined) {
      updates.push(`title = $${idx++}`);
      values.push(title);
    }

    if (description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(description);
    }

    if (streamUrl !== undefined) {
      updates.push(`stream_url = $${idx++}`);
      values.push(streamUrl);
    }

    if (rewardAmount !== undefined) {
      updates.push(`reward_amount = $${idx++}`);
      values.push(Number(rewardAmount));
    }

    if (autoCreditOnJoin !== undefined) {
      updates.push(`auto_credit_on_join = $${idx++}`);
      values.push(Boolean(autoCreditOnJoin));
    }

    if (maxWinners !== undefined) {
      updates.push(`max_winners = $${idx++}`);
      values.push(Number(maxWinners));
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    await db.query(`
      UPDATE vexo_events
      SET ${updates.join(", ")}
      WHERE id = $${idx}
    `, values);

    // If status updated to live, post chat announcement
    if (status === "live") {
      await db.query(`
        INSERT INTO vexo_event_messages (event_id, sender_name, is_host, message)
        VALUES ($1, 'VEXARO Host (Admin)', true, '🔴 WE ARE LIVE! Welcome everyone to the live stage. Claim your free balance now!')
      `, [id]);
    } else if (status === "ended") {
      await db.query(`
        INSERT INTO vexo_event_messages (event_id, sender_name, is_host, message)
        VALUES ($1, 'VEXARO Host (Admin)', true, '🏁 This live event has concluded. Thank you to everyone who participated!')
      `, [id]);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to update event",
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const g = await guard();
    if (g.error) return g.error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Event id is required" }, { status: 400 });
    }

    await ensureEventsSchema();
    await db.query(`DELETE FROM vexo_events WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete event",
    }, { status: 500 });
  }
}
