#!/usr/bin/env node

/**
 * VEXO SMM - Multi-Provider Price Sync & Least-Cost Routing Engine (CLI)
 *
 * Usage:
 *   node scripts/sync-providers.js
 *   npm run sync-providers
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env.local file not found at " + envPath);
    process.exit(1);
  }

  const env = {};
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const DATABASE_URL = env.DATABASE_URL;
let USD_TO_PKR = Number(env.USD_TO_PKR || "278.0");
const DEFAULT_MARKUP = Number(env.VEXO_MARKUP || "0.07"); // 7% profit margin

async function getLiveForexRate() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/PKR");
    if (res.ok) {
      const data = await res.json();
      const pkrToUsd = Number(data?.rates?.USD);
      if (pkrToUsd > 0) return Math.round((1 / pkrToUsd) * 100) / 100;
    }
  } catch {}
  return USD_TO_PKR;
}

if (!DATABASE_URL) {
  console.error("❌ Error: DATABASE_URL missing from .env.local");
  process.exit(1);
}

const PROVIDERS = [
  {
    id: env.PROVIDER_1_ID || "pak_smm",
    name: env.PROVIDER_1_NAME || "PAK SMM Panels",
    apiUrl: env.PROVIDER_1_URL || "https://paksmmpanels.com/api/v2",
    apiKey: env.PROVIDER_1_KEY || "79a0cf7ddd9ebce0a0cf81e7e5ec3faef3571ef5",
    currency: "USD",
    enabled: true,
  },
  {
    id: env.PROVIDER_2_ID || "smooth_smm",
    name: env.PROVIDER_2_NAME || "Smooth SMM",
    apiUrl: env.PROVIDER_2_URL || "https://smoothsmm.com/api/v2",
    apiKey: env.PROVIDER_2_KEY || "5c6ad1550d3b72ca6afd09ffcb930bf7",
    currency: "USD",
    enabled: true,
  },
  {
    id: env.PROVIDER_3_ID || "am_smm",
    name: env.PROVIDER_3_NAME || "AM SMM Panel",
    apiUrl: env.PROVIDER_3_URL || "https://amsmmpanel.com/api/v2",
    apiKey: env.PROVIDER_3_KEY || "135357052667f0556edecybercoree7acb990708f59b15b40",
    currency: "USD",
    enabled: true,
  },
  {
    id: env.PROVIDER_4_ID || "pakistan_smm",
    name: env.PROVIDER_4_NAME || "Pakistan SMM Panel",
    apiUrl: env.PROVIDER_4_URL || "https://pakistansmmpanel.pk/api/v2",
    apiKey: env.PROVIDER_4_KEY || "8c532842fdd74e2889c4zerotrust74f1bb81314ab98aaee5",
    currency: "USD",
    enabled: true,
  },
  {
    id: env.PROVIDER_5_ID || "rizvi_smm",
    name: env.PROVIDER_5_NAME || "Rizvi SMM Panels",
    apiUrl: env.PROVIDER_5_URL || "https://rizvismmpanels.com/api/v2",
    apiKey: env.PROVIDER_5_KEY || "04968c4867c7385287482cf0cf73246d",
    currency: "USD",
    enabled: true,
  },
];

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function detectGuarantee(name, category, refillFlag) {
  const text = `${name} ${category}`.toLowerCase();
  const noRefillPattern = /no refill|no-refill|drop 100%|drop: 100%|no guarantee|non-guaranteed|without refill|no drop 0%|drop high/i;
  if (noRefillPattern.test(text)) return false;

  const guaranteePattern = /refill|guarantee|guaranteed|non-drop|non drop|r30|r60|r90|r365|lifetime|permanent/i;
  return Boolean(refillFlag || guaranteePattern.test(text));
}

function detectPlatform(name, category) {
  const text = `${category} ${name}`.toLowerCase();
  if (text.includes("instagram") || text.includes("ig ")) return "Instagram";
  if (text.includes("tiktok") || text.includes("tik tok")) return "TikTok";
  if (text.includes("youtube") || text.includes("yt ")) return "YouTube";
  if (text.includes("facebook") || text.includes("fb ")) return "Facebook";
  if (text.includes("telegram") || text.includes("tg ")) return "Telegram";
  if (text.includes("twitter") || text.includes(" x ") || text.includes("x/twitter") || text.startsWith("x ")) return "X (Twitter)";
  if (text.includes("whatsapp")) return "WhatsApp";
  if (text.includes("spotify")) return "Spotify";
  if (text.includes("threads")) return "Threads";
  if (text.includes("snapchat")) return "Snapchat";
  if (text.includes("linkedin")) return "LinkedIn";
  if (text.includes("traffic") || text.includes("website")) return "Website Traffic";
  return "Other";
}

function generateGroupKey(
  platform,
  name,
  category = "",
  type = "Default",
  min = 1,
  max = 100000,
  isGuaranteed = false
) {
  const rawText = `${name} ${category}`.toLowerCase();
  const clean = name
    .toLowerCase()
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 1. Detect Voice Call Marketing packages by specific call quantity
  if (name.toLowerCase().includes("voice") && (name.toLowerCase().includes("call") || name.toLowerCase().includes("calling"))) {
    const callMatch = name.match(/(\d+)\s*(?:calls|call)/i);
    const callQty = callMatch ? `${callMatch[1]}_calls` : "custom_calls";
    return `whatsapp_voice_call_${callQty}`;
  }

  // 2. Detect WhatsApp specific actions
  if (platform === "WhatsApp") {
    if (rawText.includes("poll") || rawText.includes("vote")) {
      const optMatch = name.match(/option\s*([a-z0-9]+)|answer\s*([a-z0-9]+)/i);
      const opt = optMatch ? `_${(optMatch[1] || optMatch[2]).toLowerCase()}` : "";
      return `whatsapp_poll_votes${opt}_${isGuaranteed ? "guaranteed" : "regular"}`;
    }
    if (rawText.includes("react") || rawText.includes("emoji")) {
      return `whatsapp_reactions_${isGuaranteed ? "guaranteed" : "regular"}`;
    }
    if (rawText.includes("channel") && (rawText.includes("follower") || rawText.includes("member") || rawText.includes("subscriber"))) {
      return `whatsapp_channel_followers_${isGuaranteed ? "guaranteed" : "regular"}`;
    }
    if (rawText.includes("message") && rawText.includes("customer")) {
      return `whatsapp_customer_messaging`;
    }
    if (rawText.includes("number") || rawText.includes("otp")) {
      const country = rawText.includes("indian") ? "india" : rawText.includes("uk") ? "uk" : "global";
      return `whatsapp_virtual_number_${country}`;
    }
  }

  // 3. Detect specific subscription / account package services
  const isPackage = type?.toLowerCase()?.includes("package") || (Number(min) === 1 && Number(max) === 1);
  const durationMatch = name.match(/(1|3|6|12)\s*(?:month|year|day|months|years|days)|30\s*days|180\s*days|365\s*days|lifetime/i);
  const duration = durationMatch ? durationMatch[0].toLowerCase().replace(/\s+/g, "") : "";

  const knownBrands = ["canva", "adobe", "chatgpt", "capcut", "crunchyroll", "disney", "netflix", "elevenlabs", "prime", "chaupal"];
  for (const brand of knownBrands) {
    if (rawText.includes(brand)) {
      return `subscription_${brand}_${duration || "std"}_${isGuaranteed ? "guaranteed" : "regular"}`;
    }
  }

  // 4. Standard SMM Actions
  let action = "other";
  if (clean.includes("story")) action = "story_views";
  else if (clean.includes("reel")) action = "reels_views";
  else if (clean.includes("follower")) action = "followers";
  else if (clean.includes("like")) action = "likes";
  else if (clean.includes("view")) action = "views";
  else if (clean.includes("subscriber")) action = "subscribers";
  else if (clean.includes("comment")) action = "comments";
  else if (clean.includes("share") || clean.includes("repost")) action = "shares";
  else if (clean.includes("reaction")) action = "reactions";
  else if (clean.includes("save")) action = "saves";
  else if (clean.includes("watch time") || clean.includes("hours")) action = "watch_hours";
  else if (clean.includes("member")) action = "members";

  // If action is still "other" or it's a fixed package, create a unique slug based on clean title
  if (action === "other" || isPackage) {
    const slug = clean.split(" ").slice(0, 4).join("_");
    return `${platform.toLowerCase()}_pkg_${slug}_${duration || "std"}_${isGuaranteed ? "guaranteed" : "regular"}`;
  }

  let tier = "standard";
  if (clean.includes("vip") || clean.includes("real") || clean.includes("high quality") || clean.includes("hq")) {
    tier = "high_quality";
  }

  const guaranteeTag = isGuaranteed ? "guaranteed" : "regular";
  return `${platform.toLowerCase()}_${action}_${tier}_${guaranteeTag}`;
}

function generateDisplayTitle(platform, groupKey, isGuaranteed, originalName) {
  if (originalName.length <= 130 && !originalName.includes("Azadi") && !originalName.includes("PKR")) {
    return originalName;
  }
  const parts = groupKey.split("_");
  const action = parts[1] || "services";
  const tier = parts[2] === "high_quality" ? "High Quality / Real" : "Standard Speed";
  const guaranteeBadge = isGuaranteed ? "⚡ Lifetime Refill Guarantee" : "⚡ Instant Delivery";
  const actionCapitalized = action.charAt(0).toUpperCase() + action.slice(1);
  return `${platform} ${actionCapitalized} | ${tier} | ${guaranteeBadge}`;
}

async function makeProviderRequest(provider, params) {
  const body = new URLSearchParams({
    key: provider.apiKey,
    ...params,
  });

  const res = await fetch(provider.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`${provider.name} HTTP ${res.status}`);
  return res.json();
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vexo_providers (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      api_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      balance_usd NUMERIC(14,4) DEFAULT 0,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      priority INTEGER DEFAULT 1,
      last_sync_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS vexo_provider_services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_id VARCHAR(50) NOT NULL REFERENCES vexo_providers(id) ON DELETE CASCADE,
      remote_service_id VARCHAR(100) NOT NULL,
      name TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'Default',
      category TEXT NOT NULL,
      rate_usd NUMERIC(14,6) NOT NULL,
      min INTEGER NOT NULL,
      max INTEGER NOT NULL,
      refill BOOLEAN DEFAULT FALSE,
      cancel BOOLEAN DEFAULT FALSE,
      is_guaranteed BOOLEAN DEFAULT FALSE,
      service_group_key VARCHAR(120),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_provider_remote_service UNIQUE (provider_id, remote_service_id)
    );

    CREATE INDEX IF NOT EXISTS vexo_provider_services_prov_idx ON vexo_provider_services(provider_id);
    CREATE INDEX IF NOT EXISTS vexo_provider_services_group_idx ON vexo_provider_services(service_group_key);
    CREATE INDEX IF NOT EXISTS vexo_provider_services_rate_idx ON vexo_provider_services(rate_usd ASC);

    CREATE TABLE IF NOT EXISTS vexo_routed_services (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      platform VARCHAR(50) NOT NULL,
      category TEXT NOT NULL,
      service_group_key VARCHAR(120) NOT NULL,
      is_guaranteed BOOLEAN DEFAULT TRUE,
      auto_route BOOLEAN NOT NULL DEFAULT TRUE,
      active_provider_id VARCHAR(50) REFERENCES vexo_providers(id) ON DELETE SET NULL,
      active_remote_service_id VARCHAR(100),
      base_rate_usd NUMERIC(14,6) NOT NULL DEFAULT 0,
      rate_multiplier NUMERIC(12,6) NOT NULL DEFAULT 1.25,
      rate_pkr NUMERIC(14,6) NOT NULL DEFAULT 0,
      min INTEGER NOT NULL DEFAULT 10,
      max INTEGER NOT NULL DEFAULT 100000,
      refill BOOLEAN DEFAULT FALSE,
      cancel BOOLEAN DEFAULT FALSE,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      popular BOOLEAN NOT NULL DEFAULT FALSE,
      fallback_queue JSONB DEFAULT '[]',
      provider_rates JSONB DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS vexo_routed_services_platform_idx ON vexo_routed_services(platform);
    CREATE UNIQUE INDEX IF NOT EXISTS vexo_routed_services_group_uidx ON vexo_routed_services(service_group_key);
    CREATE INDEX IF NOT EXISTS vexo_routed_services_enabled_idx ON vexo_routed_services(enabled);

    ALTER TABLE vexo_provider_services ALTER COLUMN rate_usd TYPE NUMERIC(20,6);
    ALTER TABLE vexo_provider_services ALTER COLUMN min TYPE BIGINT;
    ALTER TABLE vexo_provider_services ALTER COLUMN max TYPE BIGINT;

    ALTER TABLE vexo_routed_services ALTER COLUMN base_rate_usd TYPE NUMERIC(20,6);
    ALTER TABLE vexo_routed_services ALTER COLUMN rate_pkr TYPE NUMERIC(20,6);
    ALTER TABLE vexo_routed_services ALTER COLUMN min TYPE BIGINT;
    ALTER TABLE vexo_routed_services ALTER COLUMN max TYPE BIGINT;

    ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS provider_id VARCHAR(50);
    ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS failover_attempts JSONB DEFAULT '[]';
  `);

  for (const p of PROVIDERS) {
    await pool.query(
      `INSERT INTO vexo_providers (id, name, api_url, api_key, currency, enabled)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         api_url = EXCLUDED.api_url,
         api_key = EXCLUDED.api_key`,
      [p.id, p.name, p.apiUrl, p.apiKey, p.currency, p.enabled]
    );
  }
}

async function main() {
  console.log("\n=======================================================");
  console.log("   ⚡ VEXO SMM - MULTI-PROVIDER LEAST-COST ROUTER ⚡  ");
  console.log("=======================================================\n");

  const startTime = Date.now();
  await ensureSchema();

  const providerBalances = {};
  const providerCounts = {};
  const providerServicesMap = new Map();
  let totalRawServices = 0;

  for (const p of PROVIDERS) {
    try {
      console.log(`Connecting to ${p.name}...`);
      // Balance
      const balData = await makeProviderRequest(p, { action: "balance" });
      const balUsd = Number(balData?.balance || 0);
      providerBalances[p.name] = balUsd;

      await pool.query(
        `UPDATE vexo_providers SET balance_usd = $1, currency = $2, last_sync_at = NOW() WHERE id = $3`,
        [balUsd, balData?.currency || "USD", p.id]
      );

      // Services
      const services = await makeProviderRequest(p, { action: "services" });
      if (Array.isArray(services)) {
        providerServicesMap.set(p.id, services);
        providerCounts[p.name] = services.length;
        totalRawServices += services.length;
        console.log(`  ✓ Synced ${services.length} services from ${p.name} (Balance: $${balUsd.toFixed(4)})`);
      }
    } catch (e) {
      console.warn(`  ✗ Failed to sync ${p.name}: ${e.message}`);
    }
  }

  // Populate vexo_provider_services in high-speed batches
  console.log("\nUpdating raw service quotes in database...");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Clear previous provider services
    const providerIds = Array.from(providerServicesMap.keys());
    if (providerIds.length > 0) {
      await client.query(`DELETE FROM vexo_provider_services WHERE provider_id = ANY($1)`, [providerIds]);
    }

    const allRawRows = [];
    for (const [pId, rawServices] of providerServicesMap.entries()) {
      for (const item of rawServices) {
        const remoteServiceId = String(item.service ?? "").trim();
        if (!remoteServiceId) continue;

        const name = String(item.name || "").trim();
        const type = String(item.type || "Default").trim();
        const category = String(item.category || "General").trim();
        const rawRate = Number(item.rate || 0);
        if (!Number.isFinite(rawRate) || rawRate <= 0 || rawRate > 10000) {
          continue;
        }
        const rateUsd = Math.round(rawRate * 1000000) / 1000000;
        const min = Math.max(1, Math.min(Number(item.min || 1), 2000000000));
        const max = Math.max(min, Math.min(Number(item.max || 100000), 2147483647));
        const refill = Boolean(item.refill);
        const cancel = Boolean(item.cancel);

        const platform = detectPlatform(name, category);
        const isGuaranteed = detectGuarantee(name, category, refill);
        const groupKey = generateGroupKey(platform, name, category, type, min, max, isGuaranteed);

        allRawRows.push({
          pId, remoteServiceId, name, type, category, rateUsd, min, max, refill, cancel, isGuaranteed, groupKey
        });
      }
    }

    const RAW_BATCH_SIZE = 100;
    for (let i = 0; i < allRawRows.length; i += RAW_BATCH_SIZE) {
      const batch = allRawRows.slice(i, i + RAW_BATCH_SIZE);
      const valClauses = [];
      const params = [];
      let pIdx = 1;
      for (const r of batch) {
        valClauses.push(`($${pIdx}, $${pIdx+1}, $${pIdx+2}, $${pIdx+3}, $${pIdx+4}, $${pIdx+5}, $${pIdx+6}, $${pIdx+7}, $${pIdx+8}, $${pIdx+9}, $${pIdx+10}, $${pIdx+11})`);
        params.push(r.pId, r.remoteServiceId, r.name, r.type, r.category, r.rateUsd, r.min, r.max, r.refill, r.cancel, r.isGuaranteed, r.groupKey);
        pIdx += 12;
      }
      await client.query(
        `INSERT INTO vexo_provider_services
         (provider_id, remote_service_id, name, type, category, rate_usd, min, max, refill, cancel, is_guaranteed, service_group_key)
         VALUES ${valClauses.join(", ")}
         ON CONFLICT (provider_id, remote_service_id) DO UPDATE SET
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           category = EXCLUDED.category,
           rate_usd = EXCLUDED.rate_usd,
           min = EXCLUDED.min,
           max = EXCLUDED.max,
           refill = EXCLUDED.refill,
           cancel = EXCLUDED.cancel,
           is_guaranteed = EXCLUDED.is_guaranteed,
           service_group_key = EXCLUDED.service_group_key,
           updated_at = NOW()`,
        params
      );
    }

    await client.query("COMMIT");
    console.log(`  ✓ Inserted ${allRawRows.length} raw service quotes in batches.`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  // Run Least-Cost Ranking
  USD_TO_PKR = await getLiveForexRate();
  console.log(`Live Forex Rate: $1 USD = ₨${USD_TO_PKR} PKR | Markup: ${(DEFAULT_MARKUP * 100).toFixed(0)}%`);
  console.log("Running Least-Cost Optimization & Failover Queue generation...");

  const existingRes = await pool.query(
    `SELECT id, service_group_key, auto_route, active_provider_id, active_remote_service_id, rate_multiplier, popular, enabled
     FROM vexo_routed_services`
  );
  const existingMap = new Map();
  for (const row of existingRes.rows) {
    existingMap.set(String(row.service_group_key), row);
  }

  const allServicesRes = await pool.query(
    `SELECT ps.id, ps.provider_id, p.name as provider_name, ps.remote_service_id, ps.name, ps.type, ps.category,
            ps.rate_usd, ps.min, ps.max, ps.refill, ps.cancel, ps.is_guaranteed, ps.service_group_key
     FROM vexo_provider_services ps
     JOIN vexo_providers p ON p.id = ps.provider_id
     WHERE p.enabled = true AND ps.rate_usd > 0
     ORDER BY ps.service_group_key, ps.rate_usd ASC`
  );

  const groups = new Map();
  for (const row of allServicesRes.rows) {
    const key = String(row.service_group_key);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      providerId: row.provider_id,
      providerName: row.provider_name,
      remoteServiceId: String(row.remote_service_id),
      name: row.name,
      type: row.type,
      rateUsd: Number(row.rate_usd),
      min: Number(row.min),
      max: Number(row.max),
      refill: Boolean(row.refill),
      cancel: Boolean(row.cancel),
      isGuaranteed: Boolean(row.is_guaranteed),
    });
  }

  const routedItems = [];

  for (const [groupKey, quotes] of groups.entries()) {
    if (quotes.length === 0) continue;

    const platform = detectPlatform(quotes[0].name, quotes[0].category);
    const isGuaranteed = quotes.some((q) => q.isGuaranteed);

    const eligibleQuotes = isGuaranteed
      ? quotes.filter((q) => q.isGuaranteed).length > 0
        ? quotes.filter((q) => q.isGuaranteed)
        : quotes
      : quotes;

    eligibleQuotes.sort((a, b) => a.rateUsd - b.rateUsd);
    const cheapest = eligibleQuotes[0];

    const providerRatesObj = {};
    for (const q of quotes) {
      providerRatesObj[q.providerId] = {
        rateUsd: q.rateUsd,
        remoteId: q.remoteServiceId,
        name: q.name,
        guaranteed: q.isGuaranteed,
      };
    }

    const fallbackQueue = eligibleQuotes.map((q, idx) => ({
      rank: idx + 1,
      providerId: q.providerId,
      providerName: q.providerName,
      remoteServiceId: q.remoteServiceId,
      rateUsd: q.rateUsd,
      isGuaranteed: q.isGuaranteed,
    }));

    const existing = existingMap.get(groupKey);
    const autoRoute = existing ? existing.auto_route !== false : true;
    const rateMultiplier = existing ? Number(existing.rate_multiplier || (1 + DEFAULT_MARKUP)) : (1 + DEFAULT_MARKUP);

    // Filter: "Compare panels services and list ONLY those which are cheaper"
    // 1. Multiple providers competed across panels OR ultra-cheap baseline (<= $0.50)
    // 2. Base rate is affordable (<= $5.00)
    const providerSet = new Set(quotes.map((q) => q.providerId));
    const isMultiProvider = providerSet.size >= 2;
    const isPackageService = cheapest.type?.toLowerCase()?.includes("package") || (Number(cheapest.min) === 1 && Number(cheapest.max) === 1);
    const isAffordable = cheapest.rateUsd <= 5.0 || (isPackageService && cheapest.rateUsd <= 15.0);
    const isCheaperService = (isMultiProvider || cheapest.rateUsd <= 5.0) && isAffordable;

    const enabled = isCheaperService;
    const popular = existing ? Boolean(existing.popular) : false;

    const activeProviderId = autoRoute ? cheapest.providerId : String(existing?.active_provider_id || cheapest.providerId);
    const activeRemoteServiceId = autoRoute ? cheapest.remoteServiceId : String(existing?.active_remote_service_id || cheapest.remoteServiceId);

    const selectedQuote = quotes.find((q) => q.providerId === activeProviderId && q.remoteServiceId === activeRemoteServiceId) || cheapest;
    const baseRateUsd = selectedQuote.rateUsd;
    const ratePkr = Math.round(baseRateUsd * USD_TO_PKR * rateMultiplier * 10000) / 10000;

    const cleanTitle = generateDisplayTitle(platform, groupKey, isGuaranteed, selectedQuote.name);

    routedItems.push({
      cleanTitle,
      platform,
      category: String(selectedQuote.category || platform || "General").trim(),
      groupKey,
      isGuaranteed,
      autoRoute,
      activeProviderId,
      activeRemoteServiceId,
      baseRateUsd,
      rateMultiplier,
      ratePkr,
      min: selectedQuote.min,
      max: selectedQuote.max,
      refill: selectedQuote.refill,
      cancel: selectedQuote.cancel,
      enabled,
      popular,
      fallbackQueue,
      providerRatesObj
    });
  }

  // Batch upsert routed services in chunks of 25
  const ROUTED_BATCH = 25;
  for (let i = 0; i < routedItems.length; i += ROUTED_BATCH) {
    const chunk = routedItems.slice(i, i + ROUTED_BATCH);
    const valClauses = [];
    const params = [];
    let pIdx = 1;
    for (const r of chunk) {
      valClauses.push(`($${pIdx}, $${pIdx+1}, $${pIdx+2}, $${pIdx+3}, $${pIdx+4}, $${pIdx+5}, $${pIdx+6}, $${pIdx+7}, $${pIdx+8}, $${pIdx+9}, $${pIdx+10}, $${pIdx+11}, $${pIdx+12}, $${pIdx+13}, $${pIdx+14}, $${pIdx+15}, $${pIdx+16}, $${pIdx+17}, $${pIdx+18})`);
      params.push(
        r.cleanTitle,
        r.platform,
        r.category,
        r.groupKey,
        r.isGuaranteed,
        r.autoRoute,
        r.activeProviderId,
        r.activeRemoteServiceId,
        r.baseRateUsd,
        r.rateMultiplier,
        r.ratePkr,
        r.min,
        r.max,
        r.refill,
        r.cancel,
        r.enabled,
        r.popular,
        JSON.stringify(r.fallbackQueue),
        JSON.stringify(r.providerRatesObj)
      );
      pIdx += 19;
    }

    await pool.query(
      `INSERT INTO vexo_routed_services
       (name, platform, category, service_group_key, is_guaranteed, auto_route, active_provider_id, active_remote_service_id, base_rate_usd, rate_multiplier, rate_pkr, min, max, refill, cancel, enabled, popular, fallback_queue, provider_rates)
       VALUES ${valClauses.join(", ")}
       ON CONFLICT (service_group_key) DO UPDATE SET
         name = EXCLUDED.name,
         platform = EXCLUDED.platform,
         category = EXCLUDED.category,
         is_guaranteed = EXCLUDED.is_guaranteed,
         active_provider_id = CASE WHEN vexo_routed_services.auto_route THEN EXCLUDED.active_provider_id ELSE vexo_routed_services.active_provider_id END,
         active_remote_service_id = CASE WHEN vexo_routed_services.auto_route THEN EXCLUDED.active_remote_service_id ELSE vexo_routed_services.active_remote_service_id END,
         base_rate_usd = EXCLUDED.base_rate_usd,
         rate_pkr = EXCLUDED.rate_pkr,
         min = EXCLUDED.min,
         max = EXCLUDED.max,
         refill = EXCLUDED.refill,
         cancel = EXCLUDED.cancel,
         enabled = EXCLUDED.enabled,
         fallback_queue = EXCLUDED.fallback_queue,
         provider_rates = EXCLUDED.provider_rates,
         updated_at = NOW()`,
      params
    );
  }

  // Purge any stale/obsolete routed services that no longer match any valid groupKey
  const activeKeys = routedItems.map((r) => r.groupKey);
  if (activeKeys.length > 0) {
    await pool.query(`DELETE FROM vexo_routed_services WHERE service_group_key != ALL($1::varchar[])`, [activeKeys]);
  }

  const routedCount = routedItems.length;

  console.log("\n-------------------------------------------------------");
  console.log("📊 PROVIDER SYNCHRONIZATION SUMMARY:");
  console.log("-------------------------------------------------------");
  console.log(`✅ Raw Services Found : ${totalRawServices.toLocaleString()}`);
  console.log(`🎯 Routed Services     : ${routedCount.toLocaleString()}`);
  console.log(`⏱️ Duration            : ${((Date.now() - startTime) / 1000).toFixed(2)}s\n`);

  console.log("💰 LIVE PROVIDER BALANCES:");
  console.table(
    Object.entries(providerBalances).map(([name, bal]) => ({
      Provider: name,
      "Balance (USD)": `$${Number(bal).toFixed(4)}`,
      "Services Imported": providerCounts[name] || 0,
    }))
  );

  const sampleQuery = await pool.query(
    `SELECT id, name, platform, active_provider_id, base_rate_usd, rate_pkr, is_guaranteed
     FROM vexo_routed_services
     WHERE enabled = true
     ORDER BY id ASC
     LIMIT 8`
  );

  if (sampleQuery.rows.length > 0) {
    console.log("🏆 SAMPLE CHEAPEST ROUTED SERVICES (LIVE PRICING):");
    console.table(
      sampleQuery.rows.map((r) => ({
        "VEXO ID": r.id,
        Service: r.name.slice(0, 36),
        Platform: r.platform,
        "Cheapest Provider": r.active_provider_id,
        "Cost (USD/1k)": `$${Number(r.base_rate_usd).toFixed(4)}`,
        "VEXO Price (PKR)": `₨${Number(r.rate_pkr).toFixed(2)}`,
        Guaranteed: r.is_guaranteed ? "✅ Yes" : "⚠️ Standard",
      }))
    );
  }

  console.log("✅ Multi-Provider Sync & Least-Cost Routing completed!\n");
  await pool.end();
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
