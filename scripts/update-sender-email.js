const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env.local");
let dbUrl = process.env.DATABASE_URL;
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      dbUrl = trimmed.substring("DATABASE_URL=".length).replace(/^["']|["']$/g, "");
    }
  }
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const verifiedSender = "VEXARO SMM <noreply@vexarosmm.com>";
    await pool.query(
      `INSERT INTO vexo_platform_settings (key, value, updated_at)
       VALUES ('sender_email', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [verifiedSender]
    );
    await pool.query(
      `INSERT INTO vexo_platform_settings (key, value, updated_at)
       VALUES ('resend_from_email', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [verifiedSender]
    );
    console.log("Successfully set sender_email and resend_from_email to:", verifiedSender);

    const check = await pool.query(
      `SELECT key, value FROM vexo_platform_settings WHERE key IN ('sender_email', 'resend_from_email')`
    );
    console.log("Current DB values:", check.rows);
  } catch (err) {
    console.error("Error updating settings:", err);
  } finally {
    await pool.end();
  }
}

run();
