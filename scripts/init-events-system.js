const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let dbUrl = '';
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL=')) {
    dbUrl = trimmed.substring('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
  }
}

if (!dbUrl) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: dbUrl });

  try {
    console.log("Creating/updating events tables...");

    await pool.query(`
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

    // Ensure we have the current Live Event created and set to 'live'
    const existing = await pool.query(`SELECT id FROM vexo_events WHERE status IN ('live', 'upcoming') LIMIT 1`);
    
    if (existing.rows.length === 0) {
      const ins = await pool.query(`
        INSERT INTO vexo_events (
          title, 
          description, 
          status, 
          type, 
          reward_amount, 
          auto_credit_on_join, 
          scheduled_at, 
          started_at
        ) VALUES (
          '🎉 Official 9:00 PM Live Event & Free ₨50 Balance Giveaway!',
          'Welcome to the live on-site VEXARO Event! Join the event, chat with the host, and claim your FREE ₨50 wallet balance instantly to spend on any SMM services!',
          'live',
          'giveaway',
          50.00,
          true,
          NOW(),
          NOW()
        ) RETURNING id;
      `);
      console.log("Created active live event:", ins.rows[0].id);

      // Add a welcoming host message
      await pool.query(`
        INSERT INTO vexo_event_messages (event_id, sender_name, is_host, message)
        VALUES ($1, 'VEXARO Host (Admin)', true, '🔥 Welcome to tonight''s Live Event! Everyone who joins gets FREE ₨50 balance credited to their wallet. Drop a hello in the chat!')
      `, [ins.rows[0].id]);
    } else {
      console.log("Active event already exists:", existing.rows[0].id);
      // Make sure it is marked live
      await pool.query(`UPDATE vexo_events SET status = 'live', started_at = COALESCE(started_at, NOW()) WHERE id = $1`, [existing.rows[0].id]);
    }

    console.log("Events system schema initialized successfully!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
  }
}

main();
