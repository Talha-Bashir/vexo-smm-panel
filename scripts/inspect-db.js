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

async function listTables() {
  const pool = new Pool({ connectionString: dbUrl });
  try {
    const res = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log("Database tables:", res.rows.map(r => r.table_name));

    for (const r of res.rows) {
      const countRes = await pool.query(`SELECT COUNT(*) FROM "${r.table_name}"`);
      console.log(`- ${r.table_name}: ${countRes.rows[0].count} rows`);
    }
  } catch (err) {
    console.error("DB error:", err.message);
  } finally {
    await pool.end();
  }
}

listTables();
