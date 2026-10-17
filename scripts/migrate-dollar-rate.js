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

async function run() {
  const pool = new Pool({ connectionString: dbUrl });
  try {
    console.log("Adding custom_rate_pkr to vexo_routed_services...");
    await pool.query("ALTER TABLE vexo_routed_services ADD COLUMN IF NOT EXISTS custom_rate_pkr NUMERIC(20,6);");
    console.log("Added custom_rate_pkr to vexo_routed_services successfully.");

    console.log("Adding custom_rate_pkr to vexo_service_overrides...");
    await pool.query("ALTER TABLE vexo_service_overrides ADD COLUMN IF NOT EXISTS custom_rate_pkr NUMERIC(20,6);");
    console.log("Added custom_rate_pkr to vexo_service_overrides successfully.");

    console.log("Upserting platform settings for dollar rate...");
    await pool.query(`
      INSERT INTO vexo_platform_settings (key, value, updated_at)
      VALUES 
        ('dollar_rate_mode', 'manual', NOW()),
        ('manual_dollar_rate', '285.00', NOW()),
        ('usd_to_pkr', '285.00', NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
    `);
    console.log("Updated platform settings successfully.");

    const res = await pool.query("SELECT key, value FROM vexo_platform_settings WHERE key IN ('dollar_rate_mode', 'manual_dollar_rate', 'usd_to_pkr');");
    console.log("Current Dollar Settings in DB:", res.rows);
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
