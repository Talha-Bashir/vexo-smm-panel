const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const OWNER_CONTACT_NUMBER = "03176437013";

function sanitizeServiceDescription(text) {
  if (!text || typeof text !== "string") return "";

  let cleaned = text
    .replace(/(?:\+?92|0092|0)?[\s-]*349[\s-]*7401844/g, OWNER_CONTACT_NUMBER)
    .replace(/(?:\+?92|0092|0)?[\s-]*326[\s-]*4810548/g, OWNER_CONTACT_NUMBER)
    .replace(/(?:\+?92|0092|0)?[\s-]*327[\s-]*7164331/g, OWNER_CONTACT_NUMBER);

  cleaned = cleaned.replace(
    /(^|[^\d+])(?:\+?92[\s-]?|0092[\s-]?|0)3\d{2}[\s-]?\d{3}[\s-]?\d{4}([^\d]|$)/gi,
    (match, prefix, suffix) => `${prefix}${OWNER_CONTACT_NUMBER}${suffix}`
  );

  cleaned = cleaned.replace(
    /(whatsapp|contact|support|call|phone|mobile|helpline)[\s:]*(?:on\s+)?(\+?\d[\d\s-]{8,15}\d)/gi,
    (match, label, number) => {
      const digitsOnly = number.replace(/\D/g, "");
      if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
        return `${label} ${OWNER_CONTACT_NUMBER}`;
      }
      return match;
    }
  );

  return cleaned;
}

async function main() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const env = {};
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = val;
    }
  }

  const providers = [
    { id: 'pak_smm', name: 'PAK SMM Panels', url: env.PROVIDER_1_URL || 'https://paksmmpanels.com/api/v2', key: env.PROVIDER_1_KEY || '' },
    { id: 'smooth_smm', name: 'Smooth SMM', url: env.PROVIDER_2_URL || 'https://smoothsmm.com/api/v2', key: env.PROVIDER_2_KEY || '' },
    { id: 'am_smm', name: 'AM SMM Panel', url: env.PROVIDER_3_URL || 'https://amsmmpanel.com/api/v2', key: env.PROVIDER_3_KEY || '' },
    { id: 'pakistan_smm', name: 'Pakistan SMM Panel', url: env.PROVIDER_4_URL || 'https://pakistansmmpanel.pk/api/v2', key: env.PROVIDER_4_KEY || '' },
    { id: 'rizvi_smm', name: 'Rizvi SMM Panels', url: env.PROVIDER_5_URL || 'https://rizvismmpanels.com/api/v2', key: env.PROVIDER_5_KEY || env.RIZVI_API_KEY || '' },
  ];

  console.log("Fetching live catalogs in parallel from all 5 providers...");

  const fetchResults = await Promise.allSettled(
    providers.map(async (p) => {
      if (!p.key) return { id: p.id, name: p.name, services: [] };
      const body = new URLSearchParams({ key: p.key, action: 'services' }).toString();
      const services = await fetchWithTimeout(p.url, body, 15000);
      return { id: p.id, name: p.name, services: Array.isArray(services) ? services : [] };
    })
  );

  let totalUpdated = 0;
  for (const res of fetchResults) {
    if (res.status === 'rejected') {
      console.warn("Provider fetch failed:", res.reason?.message || res.reason);
      continue;
    }
    const { id: providerId, name: providerName, services } = res.value;
    console.log(`Processing ${services.length} services from ${providerName}...`);

    let pUpdated = 0;
    for (const item of services) {
      const remoteId = String(item.service ?? '').trim();
      const desc = sanitizeServiceDescription(String(item.desc || item.description || '').trim());
      if (!remoteId || !desc) continue;

      // Update vexo_provider_services
      await pool.query(
        `UPDATE vexo_provider_services
         SET description = $1
         WHERE provider_id = $2 AND remote_service_id = $3`,
        [desc, providerId, remoteId]
      );

      // Update vexo_routed_services
      const routedUp = await pool.query(
        `UPDATE vexo_routed_services
         SET description = $1
         WHERE (active_provider_id = $2 AND active_remote_service_id = $3)
            OR (service_group_key IN (
                 SELECT service_group_key FROM vexo_provider_services
                 WHERE provider_id = $2 AND remote_service_id = $3
               ) AND (description IS NULL OR description = '' OR description LIKE '%Start Time: Instant%'))`,
        [desc, providerId, remoteId]
      );

      pUpdated += routedUp.rowCount;
    }

    console.log(`✓ ${providerName}: Synced real descriptions into ${pUpdated} service entries.`);
    totalUpdated += pUpdated;
  }

  console.log(`\nDone! Total updates made with real provider descriptions: ${totalUpdated}`);

  // Check 956 specifically
  const check956 = await pool.query(`SELECT id, name, active_provider_id, active_remote_service_id, description FROM vexo_routed_services WHERE id = 956`);
  console.log('\n--- Service 956 after real sync ---');
  console.log(check956.rows[0]);

  await pool.end();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
