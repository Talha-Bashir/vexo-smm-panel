const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Load .env.local
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

if (!dbUrl) {
  console.error("No DATABASE_URL found.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const emails = ["talhabashir012@gmail.com", "vexaro.support@gmail.com"];
    for (const email of emails) {
      const res = await pool.query(
        `UPDATE vexo_users 
         SET role = 'super_admin', email_verified = true, email_verified_at = NOW() 
         WHERE LOWER(email) = LOWER($1) 
         RETURNING id, name, email, role, email_verified`,
        [email]
      );
      console.log(`Updated ${email}:`, res.rows);
    }
    console.log("Admin permissions updated in database.");
  } catch (err) {
    console.error("Error updating admin permissions:", err);
  } finally {
    await pool.end();
  }
}

run();
