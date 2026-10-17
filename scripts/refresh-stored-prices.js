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

async function updateDbPrices() {
  const pool = new Pool({ connectionString: dbUrl });
  try {
    const liveRate = 285.00;
    // Update services without custom_rate_pkr to reflect the new 285 rate
    const updateRes = await pool.query(`
      UPDATE vexo_routed_services
      SET rate_pkr = GREATEST(
        ROUND((base_rate_usd * $1 * rate_multiplier)::numeric, 4),
        ROUND((base_rate_usd * $1 * 1.05)::numeric, 4)
      ),
      updated_at = NOW()
      WHERE custom_rate_pkr IS NULL OR custom_rate_pkr <= 0
    `, [liveRate]);
    console.log('Updated services without custom rate:', updateRes.rowCount);

    // For services WITH custom_rate_pkr, ensure they meet at least wholesale * 1.05
    const updateCustomRes = await pool.query(`
      UPDATE vexo_routed_services
      SET rate_pkr = GREATEST(
        custom_rate_pkr,
        ROUND((base_rate_usd * $1 * 1.05)::numeric, 4)
      ),
      updated_at = NOW()
      WHERE custom_rate_pkr IS NOT NULL AND custom_rate_pkr > 0
    `, [liveRate]);
    console.log('Updated services with custom rate:', updateCustomRes.rowCount);

    // Check sample services
    const samples = await pool.query('SELECT id, name, base_rate_usd, rate_multiplier, custom_rate_pkr, rate_pkr FROM vexo_routed_services LIMIT 5');
    console.table(samples.rows);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

updateDbPrices();
