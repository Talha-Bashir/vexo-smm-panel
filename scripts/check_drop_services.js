const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT id, name, category, is_guaranteed, refill 
      FROM vexo_routed_services 
      WHERE name ILIKE '%drop%' OR category ILIKE '%drop%' OR name ILIKE '%refill%' 
      LIMIT 30
    `);
    console.log("=== VEXO_ROUTED_SERVICES (count " + res.rows.length + ") ===");
    for (const r of res.rows) {
      console.log(`[#${r.id}] is_guaranteed=${r.is_guaranteed}, refill=${r.refill} | Name: "${r.name}" | Cat: "${r.category}"`);
    }

    const pRes = await pool.query(`
      SELECT id, provider_id, remote_service_id, name, category, is_guaranteed, refill
      FROM vexo_provider_services
      WHERE name ILIKE '%drop%' OR category ILIKE '%drop%' OR name ILIKE '%100%'
      LIMIT 30
    `);
    console.log("\n=== VEXO_PROVIDER_SERVICES (count " + pRes.rows.length + ") ===");
    for (const r of pRes.rows) {
      console.log(`[P:${r.provider_id} #${r.remote_service_id}] is_guaranteed=${r.is_guaranteed}, refill=${r.refill} | Name: "${r.name}"`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
