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

export async function GET(req: NextRequest) {
  try {
    const g = await guard();
    if (g.error) return g.error;

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ success: false, error: "eventId is required" }, { status: 400 });
    }

    await ensureEventsSchema();

    const res = await db.query(`
      SELECT 
        p.id,
        p.event_id,
        p.user_id,
        p.status,
        p.reward_amount,
        p.reward_credited_at,
        p.created_at,
        u.name as user_name,
        u.email as user_email,
        COALESCE(w.balance_pkr, 0) as current_balance
      FROM vexo_event_participants p
      JOIN vexo_users u ON u.id = p.user_id
      LEFT JOIN vexo_wallets w ON w.user_id = p.user_id
      WHERE p.event_id = $1
      ORDER BY p.created_at DESC
    `, [eventId]);

    return NextResponse.json({
      success: true,
      participants: res.rows.map((r) => ({
        id: r.id,
        eventId: r.event_id,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        status: r.status,
        rewardAmount: Number(r.reward_amount),
        rewardCreditedAt: r.reward_credited_at,
        currentBalance: Number(r.current_balance),
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to load participants",
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const g = await guard();
    if (g.error) return g.error;

    const body = await req.json().catch(() => ({}));
    const { action, eventId, userId, amount } = body;

    if (!eventId || !action) {
      return NextResponse.json({ success: false, error: "eventId and action are required" }, { status: 400 });
    }

    await ensureEventsSchema();
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const eventRes = await client.query(`SELECT id, title, reward_amount FROM vexo_events WHERE id = $1`, [eventId]);
      if (eventRes.rows.length === 0) {
        throw new Error("Event not found");
      }
      const event = eventRes.rows[0];
      const defaultReward = Number(amount || event.reward_amount || 50);

      if (action === "award_single") {
        if (!userId) throw new Error("userId is required for award_single");

        // Credit user wallet
        await client.query(`
          INSERT INTO vexo_wallets (user_id, balance_pkr)
          VALUES ($1, $2)
          ON CONFLICT (user_id)
          DO UPDATE SET balance_pkr = vexo_wallets.balance_pkr + $2, updated_at = NOW()
        `, [userId, defaultReward]);

        await client.query(`
          INSERT INTO vexo_wallet_transactions (user_id, type, amount_pkr, reference_type, reference_id, description)
          VALUES ($1, 'Credit', $2, 'event_reward', $3, $4)
        `, [userId, defaultReward, String(eventId), `Live Event Reward: ${event.title}`]);

        // Update or insert participant
        await client.query(`
          UPDATE vexo_event_participants
          SET status = 'winner', reward_amount = $1, reward_credited_at = NOW()
          WHERE event_id = $2 AND user_id = $3
        `, [defaultReward, eventId, userId]);

        // Get user name for announcement
        const u = await client.query(`SELECT name FROM vexo_users WHERE id = $1`, [userId]);
        const winnerName = u.rows[0]?.name || `User #${userId}`;

        await client.query(`
          INSERT INTO vexo_event_messages (event_id, sender_name, is_host, message)
          VALUES ($1, 'VEXARO Host (Admin)', true, $2)
        `, [eventId, `🏆 CONGRATULATIONS ${winnerName}! You have been awarded ₨${defaultReward} Free Balance by the host!`]);

        await client.query("COMMIT");
        return NextResponse.json({ success: true, message: `Awarded ₨${defaultReward} to ${winnerName}` });

      } else if (action === "spin_lucky_winner") {
        // Find an entered participant who hasn't been awarded yet
        const candidateRes = await client.query(`
          SELECT p.user_id, u.name, u.email
          FROM vexo_event_participants p
          JOIN vexo_users u ON u.id = p.user_id
          WHERE p.event_id = $1 AND p.status = 'entered'
          ORDER BY RANDOM()
          LIMIT 1
        `, [eventId]);

        if (candidateRes.rows.length === 0) {
          throw new Error("No unawarded participants available to spin.");
        }

        const candidate = candidateRes.rows[0];

        // Credit wallet
        await client.query(`
          INSERT INTO vexo_wallets (user_id, balance_pkr)
          VALUES ($1, $2)
          ON CONFLICT (user_id)
          DO UPDATE SET balance_pkr = vexo_wallets.balance_pkr + $2, updated_at = NOW()
        `, [candidate.user_id, defaultReward]);

        await client.query(`
          INSERT INTO vexo_wallet_transactions (user_id, type, amount_pkr, reference_type, reference_id, description)
          VALUES ($1, 'Credit', $2, 'event_reward', $3, $4)
        `, [candidate.user_id, defaultReward, String(eventId), `Lucky Draw Winner: ${event.title}`]);

        await client.query(`
          UPDATE vexo_event_participants
          SET status = 'winner', reward_amount = $1, reward_credited_at = NOW()
          WHERE event_id = $2 AND user_id = $3
        `, [defaultReward, eventId, candidate.user_id]);

        await client.query(`
          INSERT INTO vexo_event_messages (event_id, sender_name, is_host, message)
          VALUES ($1, 'VEXARO Host (Admin)', true, $2)
        `, [eventId, `🎉 LUCKY DRAW WINNER SELECTED! 🎊 Congratulations to ${candidate.name} (${candidate.email}) for winning the ₨${defaultReward} Lucky Draw!`]);

        await client.query("COMMIT");
        return NextResponse.json({
          success: true,
          winner: {
            userId: candidate.user_id,
            name: candidate.name,
            email: candidate.email,
            amount: defaultReward,
          },
        });

      } else if (action === "bulk_award_all") {
        // Award all entered participants who haven't received credit yet
        const uncredited = await client.query(`
          SELECT p.user_id, u.name
          FROM vexo_event_participants p
          JOIN vexo_users u ON u.id = p.user_id
          WHERE p.event_id = $1 AND p.status = 'entered'
        `, [eventId]);

        for (const p of uncredited.rows) {
          await client.query(`
            INSERT INTO vexo_wallets (user_id, balance_pkr)
            VALUES ($1, $2)
            ON CONFLICT (user_id)
            DO UPDATE SET balance_pkr = vexo_wallets.balance_pkr + $2, updated_at = NOW()
          `, [p.user_id, defaultReward]);

          await client.query(`
            INSERT INTO vexo_wallet_transactions (user_id, type, amount_pkr, reference_type, reference_id, description)
            VALUES ($1, 'Credit', $2, 'event_reward', $3, $4)
          `, [p.user_id, defaultReward, String(eventId), `Bulk Event Reward: ${event.title}`]);

          await client.query(`
            UPDATE vexo_event_participants
            SET status = 'claimed', reward_amount = $1, reward_credited_at = NOW()
            WHERE event_id = $2 AND user_id = $3
          `, [defaultReward, eventId, p.user_id]);
        }

        if (uncredited.rows.length > 0) {
          await client.query(`
            INSERT INTO vexo_event_messages (event_id, sender_name, is_host, message)
            VALUES ($1, 'VEXARO Host (Admin)', true, $2)
          `, [eventId, `🎁 Host just awarded FREE ₨${defaultReward} balance to ALL ${uncredited.rows.length} participants!`]);
        }

        await client.query("COMMIT");
        return NextResponse.json({
          success: true,
          count: uncredited.rows.length,
          amountAwarded: uncredited.rows.length * defaultReward,
        });
      } else {
        throw new Error("Invalid action");
      }
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to execute participant action",
    }, { status: 500 });
  }
}
