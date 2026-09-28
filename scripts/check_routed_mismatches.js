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

function normalizeDashes(str) {
  return (str || '').replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-');
}

const NO_REFILL_REGEX = /no[\s-]*refill|without[\s-]*refill|refill[\s:]*no|drop[\s-]*100%|100%[\s-]*drop|drop[\s-]*able|dropable|high[\s-]*drop|drop[\s-]*high|no[\s-]*guarantee|non[\s-]*guaranteed|not[\s-]*guaranteed|0%[\s-]*refill|can[\s-]*drop|drop[\s-]*possible/i;

async function check() {
  const res = await pool.query(`
    SELECT id, name, category, platform, is_guaranteed, refill 
    FROM vexo_routed_services
  `);
  
  let mismatches = [];
  for (const r of res.rows) {
    const norm = normalizeDashes(`${r.name} ${r.category}`);
    if (NO_REFILL_REGEX.test(norm)) {
      if (r.is_guaranteed || r.refill) {
        mismatches.push(r);
      }
    }
  }

  console.log(`Found ${mismatches.length} services in vexo_routed_services with Drop/No-Refill marked as Guaranteed:`);
  for (const m of mismatches) {
    console.log(`[#${m.id}] G:${m.is_guaranteed} R:${m.refill} | ${m.name}`);
  }

  await pool.end();
}

check();
