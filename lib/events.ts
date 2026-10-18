import { db } from "@/lib/db";
import { ensureWalletSchema } from "@/lib/wallet";

export interface VexoEvent {
  id: string;
  title: string;
  description: string;
  status: "upcoming" | "live" | "ended";
  type: "giveaway" | "live_stream" | "special_promo";
  stream_url: string;
  reward_amount: number;
  reward_type: string;
  auto_credit_on_join: boolean;
  max_winners: number;
  scheduled_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string;
  updated_at: string;
  participant_count?: number;
  total_awarded?: number;
}

export interface VexoEventParticipant {
  id: string;
  event_id: string;
  user_id: number;
  user_name: string;
  user_email: string;
  status: "entered" | "winner" | "claimed";
  reward_amount: number;
  reward_credited_at?: string | null;
  created_at: string;
  current_balance?: number;
}

export interface VexoEventMessage {
  id: string;
  event_id: string;
  user_id?: number | null;
  sender_name: string;
  is_host: boolean;
  message: string;
  created_at: string;
}

let eventsSchemaPromise: Promise<void> | null = null;

export async function ensureEventsSchema(): Promise<void> {
  if (!eventsSchemaPromise) {
    eventsSchemaPromise = (async () => {
      await ensureWalletSchema();
      await db.query(`
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE IF NOT EXISTS vexo_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          description TEXT,
          status VARCHAR(30) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'ended')),
          type VARCHAR(40) NOT NULL DEFAULT 'giveaway' CHECK (type IN ('giveaway', 'live_stream', 'special_promo')),
          stream_url TEXT DEFAULT '',
          reward_amount NUMERIC(14,2) NOT NULL DEFAULT 50.00,
          reward_type VARCHAR(40) NOT NULL DEFAULT 'wallet_balance',
          auto_credit_on_join BOOLEAN NOT NULL DEFAULT true,
          max_winners INT NOT NULL DEFAULT 0,
          scheduled_at TIMESTAMPTZ DEFAULT NOW(),
          started_at TIMESTAMPTZ,
          ended_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS vexo_event_participants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID NOT NULL REFERENCES vexo_events(id) ON DELETE CASCADE,
          user_id INT NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
          status VARCHAR(40) NOT NULL DEFAULT 'entered' CHECK (status IN ('entered', 'winner', 'claimed')),
          reward_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
          reward_credited_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(event_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS vexo_event_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID NOT NULL REFERENCES vexo_events(id) ON DELETE CASCADE,
          user_id INT REFERENCES vexo_users(id) ON DELETE SET NULL,
          sender_name TEXT NOT NULL,
          is_host BOOLEAN NOT NULL DEFAULT false,
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS vexo_events_status_idx ON vexo_events(status);
        CREATE INDEX IF NOT EXISTS vexo_event_participants_event_idx ON vexo_event_participants(event_id);
        CREATE INDEX IF NOT EXISTS vexo_event_messages_event_idx ON vexo_event_messages(event_id, created_at ASC);
      `);
    })().catch((err) => {
      eventsSchemaPromise = null;
      throw err;
    });
  }
  return eventsSchemaPromise;
}

export async function getActiveEvent() {
  await ensureEventsSchema();
  // Fetch live event first, then upcoming, then latest ended
  const res = await db.query(`
    SELECT e.*,
      (SELECT COUNT(*)::int FROM vexo_event_participants p WHERE p.event_id = e.id) as participant_count,
      (SELECT COALESCE(SUM(reward_amount), 0)::numeric FROM vexo_event_participants p WHERE p.event_id = e.id AND p.status IN ('claimed', 'winner')) as total_awarded
    FROM vexo_events e
    ORDER BY CASE 
      WHEN status = 'live' THEN 0 
      WHEN status = 'upcoming' THEN 1 
      ELSE 2 
    END, created_at DESC
    LIMIT 1
  `);

  if (res.rows.length === 0) return null;
  return res.rows[0];
}

export async function getEventMessages(eventId: string, limit = 50) {
  await ensureEventsSchema();
  const res = await db.query(`
    SELECT id, event_id, user_id, sender_name, is_host, message, created_at
    FROM vexo_event_messages
    WHERE event_id = $1
    ORDER BY created_at ASC
    LIMIT $2
  `, [eventId, limit]);
  return res.rows;
}

export async function joinEventAndClaim(eventId: string, userId: number, userName: string) {
  await ensureEventsSchema();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Check event
    const eventRes = await client.query(`
      SELECT id, title, status, reward_amount, auto_credit_on_join, max_winners
      FROM vexo_events
      WHERE id = $1 FOR UPDATE
    `, [eventId]);

    if (eventRes.rows.length === 0) {
      throw new Error("Event not found.");
    }

    const event = eventRes.rows[0];
    if (event.status === "ended") {
      throw new Error("This event has ended.");
    }

    // Check if already joined
    const participantRes = await client.query(`
      SELECT id, status, reward_amount, reward_credited_at
      FROM vexo_event_participants
      WHERE event_id = $1 AND user_id = $2
    `, [eventId, userId]);

    if (participantRes.rows.length > 0) {
      const p = participantRes.rows[0];
      await client.query("COMMIT");
      return {
        alreadyJoined: true,
        status: p.status,
        rewardAmount: Number(p.reward_amount),
        credited: Boolean(p.reward_credited_at),
      };
    }

    const rewardAmount = Number(event.reward_amount);
    const shouldCredit = Boolean(event.auto_credit_on_join);

    let status = "entered";
    let credited = false;

    if (shouldCredit && rewardAmount > 0) {
      status = "claimed";
      credited = true;

      // Credit wallet
      await client.query(`
        INSERT INTO vexo_wallets (user_id, balance_pkr)
        VALUES ($1, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET balance_pkr = vexo_wallets.balance_pkr + $2, updated_at = NOW()
      `, [userId, rewardAmount]);

      // Record transaction
      await client.query(`
        INSERT INTO vexo_wallet_transactions (user_id, type, amount_pkr, reference_type, reference_id, description)
        VALUES ($1, 'Credit', $2, 'event_reward', $3, $4)
      `, [userId, rewardAmount, String(eventId), `Event Giveaway Reward: ${event.title}`]);
    }

    // Insert participant
    await client.query(`
      INSERT INTO vexo_event_participants (event_id, user_id, status, reward_amount, reward_credited_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [eventId, userId, status, credited ? rewardAmount : 0, credited ? new Date() : null]);

    // Send a welcome cheer in the event chat
    await client.query(`
      INSERT INTO vexo_event_messages (event_id, user_id, sender_name, is_host, message)
      VALUES ($1, $2, $3, false, $4)
    `, [
      eventId,
      userId,
      userName || "New Member",
      credited 
        ? `🎉 Just joined the live event and claimed FREE ₨${rewardAmount} balance!`
        : `👋 Just joined the live event giveaway!`
    ]);

    await client.query("COMMIT");

    return {
      alreadyJoined: false,
      status,
      rewardAmount: credited ? rewardAmount : 0,
      credited,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
