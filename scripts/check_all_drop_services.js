const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
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
      SELECT id, name, category, platform, is_guaranteed, refill 
      FROM vexo_routed_services 
      WHERE name ILIKE '%drop%' OR name ILIKE '%refill%' OR name ILIKE '%guarantee%'
      ORDER BY id ASC
    `);
    console.log('Total matching services in vexo_routed_services:', res.rows.length);
    for (const r of res.rows) {
      console.log(`[#${r.id}] G:${r.is_guaranteed} R:${r.refill} | ${r.platform} | ${r.name}`);
    }

    // Also check for any descriptions in vexo_services or vexo_provider_services or any table with description column
    const colCheck = await pool.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE column_name ILIKE '%desc%'
    `);
    console.log('\nTables with description columns:', colCheck.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
