const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// 1. Update lib/balance-monitor/providers.ts
const p1Path = path.join(__dirname, '..', 'lib', 'balance-monitor', 'providers.ts');
let p1 = fs.readFileSync(p1Path, 'utf8');
p1 = p1.replace(
  /id:\s*process\.env\.PROVIDER_4_ID\s*\|\|\s*"smmflare",[\s\S]*?apiKey:\s*process\.env\.PROVIDER_4_KEY\s*\|\|\s*"1206e0791f26d2b6d0807feeb1a11f9a",/,
  `id: (process.env.PROVIDER_4_ID && process.env.PROVIDER_4_ID !== "pakistan_smm") ? process.env.PROVIDER_4_ID : "smmflare",
      name: (process.env.PROVIDER_4_NAME && !process.env.PROVIDER_4_NAME.includes("Pakistan")) ? process.env.PROVIDER_4_NAME : "SMM Flare",
      apiUrl: (process.env.PROVIDER_4_URL && !process.env.PROVIDER_4_URL.includes("pakistansmmpanel")) ? process.env.PROVIDER_4_URL : "https://smmflare.com/api/v2",
      apiKey: (process.env.PROVIDER_4_KEY && !process.env.PROVIDER_4_URL?.includes("pakistansmmpanel") && process.env.PROVIDER_4_KEY.length > 10) ? process.env.PROVIDER_4_KEY : "1206e0791f26d2b6d0807feeb1a11f9a",`
);
fs.writeFileSync(p1Path, p1, 'utf8');
console.log('Updated lib/balance-monitor/providers.ts');

// 2. Update lib/providers.ts
const p2Path = path.join(__dirname, '..', 'lib', 'providers.ts');
let p2 = fs.readFileSync(p2Path, 'utf8');
p2 = p2.replace(
  /id:\s*process\.env\.PROVIDER_4_ID\s*\|\|\s*"smmflare",[\s\S]*?apiKey:\s*process\.env\.PROVIDER_4_KEY\s*\|\|\s*"1206e0791f26d2b6d0807feeb1a11f9a",/,
  `id: (process.env.PROVIDER_4_ID && process.env.PROVIDER_4_ID !== "pakistan_smm") ? process.env.PROVIDER_4_ID : "smmflare",
    name: (process.env.PROVIDER_4_NAME && !process.env.PROVIDER_4_NAME.includes("Pakistan")) ? process.env.PROVIDER_4_NAME : "SMM Flare",
    apiUrl: (process.env.PROVIDER_4_URL && !process.env.PROVIDER_4_URL.includes("pakistansmmpanel")) ? process.env.PROVIDER_4_URL : "https://smmflare.com/api/v2",
    apiKey: (process.env.PROVIDER_4_KEY && !process.env.PROVIDER_4_URL?.includes("pakistansmmpanel") && process.env.PROVIDER_4_KEY.length > 10) ? process.env.PROVIDER_4_KEY : "1206e0791f26d2b6d0807feeb1a11f9a",`
);
fs.writeFileSync(p2Path, p2, 'utf8');
console.log('Updated lib/providers.ts');

// 3. Update app/admin/page.tsx balanceMap to recognize both smmflare and pakistan_smm
const p3Path = path.join(__dirname, '..', 'app', 'admin', 'page.tsx');
let p3 = fs.readFileSync(p3Path, 'utf8');
p3 = p3.replace(
  `  const balanceMap = useMemo(() => {
    const map = new Map<string, any>();
    balances.forEach((b) => map.set(b.id, b));
    return map;
  }, [balances]);`,
  `  const balanceMap = useMemo(() => {
    const map = new Map<string, any>();
    balances.forEach((b) => {
      map.set(b.id, b);
      if (b.id === "pakistan_smm" && !map.has("smmflare")) {
        map.set("smmflare", { ...b, id: "smmflare", name: "SMM Flare" });
      }
      if (b.id === "smmflare" && !map.has("pakistan_smm")) {
        map.set("pakistan_smm", b);
      }
    });
    return map;
  }, [balances]);`
);
fs.writeFileSync(p3Path, p3, 'utf8');
console.log('Updated app/admin/page.tsx');

// 4. Update DB vexo_providers and vexo_balance_alert_state
async function updateDb() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  let dbUrl = '';
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
      dbUrl = trimmed.substring('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
    }
  }

  if (!dbUrl) return;

  const pool = new Pool({ connectionString: dbUrl });
  try {
    // Disable or remove stale pakistan_smm provider
    await pool.query(`UPDATE vexo_providers SET enabled = false WHERE id = 'pakistan_smm'`);
    
    // Ensure smmflare provider is active with current balance 1.0000
    await pool.query(`
      INSERT INTO vexo_providers (id, name, api_url, api_key, currency, balance_usd, enabled, last_sync_at)
      VALUES ('smmflare', 'SMM Flare', 'https://smmflare.com/api/v2', '1206e0791f26d2b6d0807feeb1a11f9a', 'USD', 1.0000, true, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = 'SMM Flare',
        api_url = 'https://smmflare.com/api/v2',
        api_key = '1206e0791f26d2b6d0807feeb1a11f9a',
        balance_usd = 1.0000,
        enabled = true,
        last_sync_at = NOW();
    `);

    // Clean up stale alert state for pakistan_smm and set smmflare to $1.00 (which is alert level CRITICAL < $5)
    await pool.query(`DELETE FROM vexo_balance_alert_state WHERE provider_id = 'pakistan_smm'`);
    await pool.query(`
      INSERT INTO vexo_balance_alert_state (provider_id, last_alert_level, last_balance, last_currency, last_error, updated_at)
      VALUES ('smmflare', 'CRITICAL', 1.0000, 'USD', null, NOW())
      ON CONFLICT (provider_id) DO UPDATE SET
        last_alert_level = 'CRITICAL',
        last_balance = 1.0000,
        last_currency = 'USD',
        last_error = null,
        updated_at = NOW();
    `);

    console.log('Database updated successfully for smmflare!');
  } catch (err) {
    console.error('DB update error:', err);
  } finally {
    await pool.end();
  }
}

updateDb().catch(console.error);
