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

async function migrate() {
  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    console.log("1. Creating vexo_free_trial_claims table and updating vexo_users...");
    await pool.query(`
      ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS free_trial_claimed BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE vexo_users ADD COLUMN IF NOT EXISTS free_trial_claimed_at TIMESTAMPTZ;

      CREATE TABLE IF NOT EXISTS vexo_free_trial_claims (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
        order_id UUID,
        service_id VARCHAR(100) NOT NULL,
        service_name TEXT NOT NULL,
        platform VARCHAR(50) NOT NULL,
        remote_service_id VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        link TEXT NOT NULL,
        client_ip VARCHAR(64),
        device_fingerprint VARCHAR(128),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS vexo_free_trial_user_idx ON vexo_free_trial_claims(user_id);
      CREATE INDEX IF NOT EXISTS vexo_free_trial_ip_idx ON vexo_free_trial_claims(client_ip);
      CREATE INDEX IF NOT EXISTS vexo_free_trial_fp_idx ON vexo_free_trial_claims(device_fingerprint);
    `);
    console.log("   ✓ Table vexo_free_trial_claims and vexo_users columns created.");

    console.log("2. Inserting/Upserting 4 Free Services in vexo_routed_services...");
    const freeServices = [
      {
        key: 'free_trial_tiktok_views_1271',
        name: 'TikTok Views [Free Test Trial - Max 1,000 Views]',
        platform: 'TikTok',
        category: '🎁 Free Test Trial (1-Time Per User)',
        active_provider_id: 'smooth_smm',
        active_remote_service_id: '1271',
        min: 100,
        max: 1000,
        desc: '🎁 FREE TEST TRIAL (1-Time Per User)\n⚡ Provider: High Speed Real Servers\n🎯 Service: TikTok Video Views\n📊 Quantity: Min 100 / Max 1,000 Views\n💰 Cost: ₨ 0.00 (100% Free)\n⚠️ Restriction: Strictly 1 Free Trial order per account. Test our speed and quality before depositing!'
      },
      {
        key: 'free_trial_tiktok_likes_1419',
        name: 'TikTok Likes [Free Test Trial - Max 50 Likes]',
        platform: 'TikTok',
        category: '🎁 Free Test Trial (1-Time Per User)',
        active_provider_id: 'smooth_smm',
        active_remote_service_id: '1419',
        min: 10,
        max: 50,
        desc: '🎁 FREE TEST TRIAL (1-Time Per User)\n⚡ Provider: High Speed Real Servers\n🎯 Service: TikTok Likes\n📊 Quantity: Min 10 / Max 50 Likes\n💰 Cost: ₨ 0.00 (100% Free)\n⚠️ Restriction: Strictly 1 Free Trial order per account. Test our speed and quality before depositing!'
      },
      {
        key: 'free_trial_instagram_views_1783',
        name: 'Instagram Views [Free Test Trial - Max 1,000 Views]',
        platform: 'Instagram',
        category: '🎁 Free Test Trial (1-Time Per User)',
        active_provider_id: 'smooth_smm',
        active_remote_service_id: '1783',
        min: 100,
        max: 1000,
        desc: '🎁 FREE TEST TRIAL (1-Time Per User)\n⚡ Provider: High Speed Real Servers\n🎯 Service: Instagram Video Views\n📊 Quantity: Min 100 / Max 1,000 Views\n💰 Cost: ₨ 0.00 (100% Free)\n⚠️ Restriction: Strictly 1 Free Trial order per account. Test our speed and quality before depositing!'
      },
      {
        key: 'free_trial_instagram_likes_470',
        name: 'Instagram Likes [Free Test Trial - Max 50 Likes]',
        platform: 'Instagram',
        category: '🎁 Free Test Trial (1-Time Per User)',
        active_provider_id: 'smooth_smm',
        active_remote_service_id: '470',
        min: 10,
        max: 50,
        desc: '🎁 FREE TEST TRIAL (1-Time Per User)\n⚡ Provider: High Speed Real Servers\n🎯 Service: Instagram Post/Reel Likes\n📊 Quantity: Min 10 / Max 50 Likes\n💰 Cost: ₨ 0.00 (100% Free)\n⚠️ Restriction: Strictly 1 Free Trial order per account. Test our speed and quality before depositing!'
      }
    ];

    for (const s of freeServices) {
      await pool.query(
        `INSERT INTO vexo_routed_services
         (name, platform, category, service_group_key, is_guaranteed, auto_route, active_provider_id, active_remote_service_id, base_rate_usd, rate_multiplier, rate_pkr, custom_rate_pkr, min, max, refill, cancel, enabled, popular, fallback_queue, provider_rates, description, updated_at)
         VALUES ($1, $2, $3, $4, FALSE, FALSE, $5, $6, 0.000000, 1.00, 0.00, 0.00, $7, $8, FALSE, FALSE, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb, $9, NOW())
         ON CONFLICT (service_group_key) DO UPDATE SET
           name = EXCLUDED.name,
           platform = EXCLUDED.platform,
           category = EXCLUDED.category,
           active_provider_id = EXCLUDED.active_provider_id,
           active_remote_service_id = EXCLUDED.active_remote_service_id,
           auto_route = FALSE,
           base_rate_usd = 0.000000,
           rate_pkr = 0.00,
           custom_rate_pkr = 0.00,
           min = EXCLUDED.min,
           max = EXCLUDED.max,
           enabled = TRUE,
           popular = TRUE,
           description = EXCLUDED.description,
           updated_at = NOW()`,
        [s.name, s.platform, s.category, s.key, s.active_provider_id, s.active_remote_service_id, s.min, s.max, s.desc]
      );
      console.log(`   ✓ Upserted service: ${s.name}`);
    }

    const check = await pool.query(
      `SELECT id, name, platform, category, min, max, rate_pkr, active_provider_id, active_remote_service_id
       FROM vexo_routed_services
       WHERE service_group_key LIKE 'free_trial_%'`
    );
    console.log("3. Current Free Services in DB:", check.rows);

  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
  }
}

migrate();
