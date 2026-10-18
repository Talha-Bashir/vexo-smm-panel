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
    console.log("Updating active live event to 12-hour limit...");

    // 12 hours from now
    const now = new Date();
    const endsAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    const eventTitle = "⚡ 12-Hour Flash Event: Free ₨50 Balance Giveaway!";
    const eventDesc = `🔥 LIMITED 12-HOUR EVENT! Welcome to the exclusive VEXARO Live Arena.\nJoin right now to claim your FREE ₨50 wallet balance instantly to test any SMM service.\n\n⚠️ IMPORTANT: This event and free balance claim is active strictly for the NEXT 12 HOURS ONLY (Closes tomorrow morning at ${endsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}).\nClaim your ₨50 balance now before the countdown timer expires!`;

    const updateEvent = await pool.query(`
      UPDATE vexo_events
      SET 
        title = $1,
        description = $2,
        status = 'live',
        reward_amount = 50.00,
        auto_credit_on_join = true,
        started_at = COALESCE(started_at, NOW()),
        ended_at = NOW() + INTERVAL '12 hours',
        updated_at = NOW()
      WHERE status IN ('live', 'upcoming')
      RETURNING id, title, started_at, ended_at;
    `, [eventTitle, eventDesc]);

    console.log("Updated event in DB:", updateEvent.rows);

    // Update announcement in vexo_announcements
    const annTitle = "⚡ 12-HOUR FLASH EVENT: Claim Free ₨50 Balance (Ends in 12 Hours!)";
    const annMsg = `🔥 12-Hour Flash Giveaway is LIVE on site!\n\nClaim your FREE ₨50 wallet balance instantly on VEXARO.\n\n⏳ TIME LIMIT: Strictly for the next 12 hours only! Closes tomorrow morning at ${endsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}.\n\n👉 Click below to join the Live Arena and claim your ₨50 instantly!`;

    await pool.query(`
      UPDATE vexo_announcements
      SET 
        title = $1,
        message = $2,
        type = 'event',
        event_link = '/live-event',
        enabled = true,
        updated_at = NOW()
      WHERE type = 'event' OR title ILIKE '%Live Event%' OR title ILIKE '%Flash Event%';
    `, [annTitle, annMsg]);

    // Update platform notice settings banner
    const noticeText = "⚡ 12-HOUR FLASH EVENT: Claim FREE ₨50 Wallet Balance! (Strictly Next 12 Hours Only) →";
    await pool.query(`
      INSERT INTO vexo_platform_settings (key, value, updated_at)
      VALUES ('site_notice_text', $1, NOW())
      ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
    `, [noticeText]);

    await pool.query(`
      INSERT INTO vexo_platform_settings (key, value, updated_at)
      VALUES ('site_notice_type', 'event', NOW())
      ON CONFLICT (key) DO UPDATE SET value = 'event', updated_at = NOW()
    `);

    // Post a host message inside event chat announcing the 12h deadline
    if (updateEvent.rows.length > 0) {
      const eventId = updateEvent.rows[0].id;
      await pool.query(`
        INSERT INTO vexo_event_messages (event_id, sender_name, is_host, message)
        VALUES ($1, 'VEXARO Host (Admin)', true, $2)
      `, [
        eventId,
        `⏳ ATTENTION ATTENDEES: This Free ₨50 Giveaway Event is active strictly for the NEXT 12 HOURS ONLY! Claim your balance now before the timer reaches 00:00:00!`
      ]);
    }

    console.log("All 12-hour configurations applied successfully!");
  } catch (err) {
    console.error("Error setting 12h event:", err);
  } finally {
    await pool.end();
  }
}

main();
