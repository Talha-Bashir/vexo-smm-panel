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
    console.log("Checking and updating vexo_announcements table schema...");
    await pool.query(`
      ALTER TABLE vexo_announcements 
      ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'announcement',
      ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS event_link TEXT;
    `);

    // Ensure platform settings table has site_notice_type or insert it
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vexo_platform_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const eventTitle = "🎉 Live Event & Free ₨50 Balance Giveaway Active on Site!";
    const eventMessage = `🔥 Welcome to tonight's exclusive Live Event hosted on VEXARO!
Join the live arena right now on the site, chat with the host, and claim your FREE ₨50 balance credited directly to your wallet!

📌 How to Claim Your ₨50:
1. Enter the Live Event Arena on site (/live-event).
2. Click the 'Claim FREE ₨50 Balance' button.
3. Your wallet will be instantly credited with ₨50!
4. Participate in the live lucky draws and chat with the host!

⏰ Event Status: 🔴 LIVE NOW
🎁 Reward: ₨50 Free Wallet Credit (Available for all members)`;

    const scheduledAt = "2026-10-18T21:00:00+05:00";
    const eventLink = "/live-event";

    // Check if an event announcement already exists
    const existing = await pool.query(
      `SELECT id FROM vexo_announcements WHERE type = 'event' OR title ILIKE '%Live Event%' LIMIT 1`
    );

    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      await pool.query(
        `UPDATE vexo_announcements 
         SET title = $1, message = $2, type = 'event', scheduled_at = $3, event_link = $4, enabled = true, updated_at = NOW()
         WHERE id = $5`,
        [eventTitle, eventMessage, scheduledAt, eventLink, id]
      );
      console.log(`Updated existing event announcement (ID: ${id})`);
    } else {
      const insertRes = await pool.query(
        `INSERT INTO vexo_announcements (title, message, type, scheduled_at, event_link, enabled, created_at, updated_at)
         VALUES ($1, $2, 'event', $3, $4, true, NOW(), NOW())
         RETURNING id`,
        [eventTitle, eventMessage, scheduledAt, eventLink]
      );
      console.log(`Created new event announcement (ID: ${insertRes.rows[0].id})`);
    }

    // Update platform notice settings
    const settings = [
      { key: "site_notice_enabled", value: "true" },
      { key: "site_notice_type", value: "event" },
      { key: "site_notice_text", value: "🎪 SPECIAL EVENT LIVE ON SITE: Join Live Event & Claim FREE ₨50 Balance Instantly! Click to Enter →" },
    ];

    for (const s of settings) {
      await pool.query(
        `INSERT INTO vexo_platform_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [s.key, s.value]
      );
    }
    console.log("Updated site notice settings for 9:00 PM Event.");

    // Query back active announcements
    const r = await pool.query(
      `SELECT id, title, type, scheduled_at, event_link, enabled, created_at FROM vexo_announcements ORDER BY created_at DESC LIMIT 5`
    );
    console.log("Active announcements in DB:", r.rows);

  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
  }
}

main();
