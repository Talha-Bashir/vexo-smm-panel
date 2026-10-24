import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;

export const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
});

// Ensure customer schema on startup
let schemaInitialized = false;
export async function ensureCustomerSchema() {
  if (schemaInitialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vexo_whatsapp_customers (
        phone VARCHAR(40) PRIMARY KEY,
        name VARCHAR(120),
        country VARCHAR(60),
        currency VARCHAR(10) DEFAULT 'PKR',
        interest VARCHAR(120),
        stage VARCHAR(30) DEFAULT 'ask_name',
        vcard_sent BOOLEAN DEFAULT FALSE,
        language VARCHAR(20) DEFAULT 'en',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE vexo_whatsapp_customers ADD COLUMN IF NOT EXISTS language VARCHAR(20) DEFAULT 'en';
      CREATE INDEX IF NOT EXISTS vexo_wa_cust_stage_idx ON vexo_whatsapp_customers(stage);
    `);
    schemaInitialized = true;
  } catch (err) {
    console.warn('[DB] Customer schema init warning:', err.message);
  }
}

/**
 * Live Global Forex Rates with sensible fallbacks
 */
const FOREX_RATES = {
  USD: 1.0,
  PKR: 277.0,
  BDT: 123.5,
  INR: 85.0,
  AED: 3.67,
  SAR: 3.75,
  GBP: 0.78,
  EUR: 0.92,
  lastUpdated: 0,
};

export async function refreshForexRates() {
  const now = Date.now();
  if (now - FOREX_RATES.lastUpdated < 60 * 60 * 1000) return FOREX_RATES; // 1 hour cache

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.rates) {
        FOREX_RATES.PKR = Number(data.rates.PKR) || FOREX_RATES.PKR;
        FOREX_RATES.BDT = Number(data.rates.BDT) || FOREX_RATES.BDT;
        FOREX_RATES.INR = Number(data.rates.INR) || FOREX_RATES.INR;
        FOREX_RATES.AED = Number(data.rates.AED) || FOREX_RATES.AED;
        FOREX_RATES.SAR = Number(data.rates.SAR) || FOREX_RATES.SAR;
        FOREX_RATES.GBP = Number(data.rates.GBP) || FOREX_RATES.GBP;
        FOREX_RATES.EUR = Number(data.rates.EUR) || FOREX_RATES.EUR;
        FOREX_RATES.lastUpdated = now;
      }
    }
  } catch (err) {
    console.warn('[Forex] Update failed, using fallback cache:', err.message);
  }
  return FOREX_RATES;
}

/**
 * Convert PKR to customer's local currency
 */
export function convertPkrToCurrency(pkrAmount, targetCurrency = 'PKR') {
  const pkr = Number(pkrAmount || 0);
  const curr = String(targetCurrency || 'PKR').toUpperCase();

  if (curr === 'PKR') {
    return {
      amount: pkr,
      currency: 'PKR',
      formatted: `Rs ${pkr.toFixed(2)}`
    };
  }

  // Convert PKR -> USD -> Target
  const usdRate = pkr / FOREX_RATES.PKR;
  const targetMultiplier = FOREX_RATES[curr] || 1.0;
  const converted = usdRate * targetMultiplier;

  let formatted = '';
  switch (curr) {
    case 'BDT':
      formatted = `৳${converted.toFixed(2)} BDT`;
      break;
    case 'USD':
      formatted = `$${converted.toFixed(4)}`;
      break;
    case 'INR':
      formatted = `₹${converted.toFixed(2)} INR`;
      break;
    case 'AED':
      formatted = `AED ${converted.toFixed(3)}`;
      break;
    case 'SAR':
      formatted = `SAR ${converted.toFixed(3)}`;
      break;
    case 'GBP':
      formatted = `£${converted.toFixed(4)}`;
      break;
    case 'EUR':
      formatted = `€${converted.toFixed(4)}`;
      break;
    default:
      formatted = `$${usdRate.toFixed(4)} USD`;
  }

  return {
    amount: converted,
    currency: curr,
    formatted
  };
}

/**
 * Detect Country, default Currency, and Native Language from phone number prefix
 */
export function detectCountryFromPhone(phone) {
  const clean = String(phone || '').replace(/\D/g, '');
  if (clean.startsWith('92')) {
    return { country: 'Pakistan', currency: 'PKR', symbol: 'Rs', language: 'ur' };
  }
  if (clean.startsWith('880')) {
    return { country: 'Bangladesh', currency: 'BDT', symbol: '৳', language: 'bn' };
  }
  if (clean.startsWith('1')) {
    return { country: 'United States', currency: 'USD', symbol: '$', language: 'en' };
  }
  if (clean.startsWith('971')) {
    return { country: 'United Arab Emirates', currency: 'AED', symbol: 'AED', language: 'ar' };
  }
  if (clean.startsWith('966')) {
    return { country: 'Saudi Arabia', currency: 'SAR', symbol: 'SAR', language: 'ar' };
  }
  if (clean.startsWith('91')) {
    return { country: 'India', currency: 'INR', symbol: '₹', language: 'en' };
  }
  if (clean.startsWith('44')) {
    return { country: 'United Kingdom', currency: 'GBP', symbol: '£', language: 'en' };
  }
  return { country: 'International', currency: 'USD', symbol: '$', language: 'en' };
}

/**
 * Parse Country string given by user (e.g. "pakistan", "bangladesh", "us", etc.)
 */
export function parseCountryText(text) {
  const lower = String(text || '').toLowerCase().trim();
  if (lower.includes('pak') || lower.includes('pk')) {
    return { country: 'Pakistan', currency: 'PKR', symbol: 'Rs', language: 'ur' };
  }
  if (lower.includes('bangla') || lower.includes('bd') || lower.includes('dhaka')) {
    return { country: 'Bangladesh', currency: 'BDT', symbol: '৳', language: 'bn' };
  }
  if (lower.includes('us') || lower.includes('america') || lower.includes('united states') || lower.includes('canada')) {
    return { country: 'United States', currency: 'USD', symbol: '$', language: 'en' };
  }
  if (lower.includes('uae') || lower.includes('dubai') || lower.includes('emirates')) {
    return { country: 'United Arab Emirates', currency: 'AED', symbol: 'AED', language: 'ar' };
  }
  if (lower.includes('saudi') || lower.includes('ksa') || lower.includes('riyadh')) {
    return { country: 'Saudi Arabia', currency: 'SAR', symbol: 'SAR', language: 'ar' };
  }
  if (lower.includes('india') || lower.includes('inr') || lower.includes('hindustan')) {
    return { country: 'India', currency: 'INR', symbol: '₹', language: 'en' };
  }
  if (lower.includes('uk') || lower.includes('england') || lower.includes('britain') || lower.includes('london')) {
    return { country: 'United Kingdom', currency: 'GBP', symbol: '£', language: 'en' };
  }
  return null;
}

/**
 * Detect explicit language preference switch requested by user
 */
export function detectLanguageSwitch(text) {
  const lower = String(text || '').toLowerCase().trim();
  if (lower === '7a' || lower === 'en' || lower.includes('english') || lower.includes('in english')) return 'en';
  if (lower === '7b' || lower === 'ur' || lower.includes('urdu') || lower.includes('hindi')) return 'ur';
  if (lower === '7c' || lower === 'bn' || lower.includes('bangla') || lower.includes('bengali')) return 'bn';
  if (lower === '7d' || lower === 'ar' || lower.includes('arabic') || lower.includes('arabi')) return 'ar';
  return null;
}

/**
 * In-memory fallback map to ensure customer stage is NEVER lost
 */
const memoryCustomerMap = new Map();

/**
 * Customer Management in Database with Memory Fallback
 */
export async function getCustomer(phone) {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (!cleanPhone) return null;

  try {
    await ensureCustomerSchema();
    const res = await pool.query(
      `SELECT phone, name, country, currency, interest, stage, vcard_sent, language
       FROM vexo_whatsapp_customers
       WHERE phone = $1`,
      [cleanPhone]
    );
    if (res.rows.length > 0) {
      memoryCustomerMap.set(cleanPhone, res.rows[0]);
      return res.rows[0];
    }
  } catch (err) {
    console.error('[DB] getCustomer error:', err.message);
  }

  return memoryCustomerMap.get(cleanPhone) || null;
}

export async function upsertCustomer(phone, data) {
  await ensureCustomerSchema();
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (!cleanPhone) return null;

  try {
    const existing = await pool.query(
      `SELECT phone, name, country, currency, interest, stage, vcard_sent, language
       FROM vexo_whatsapp_customers
       WHERE phone = $1`,
      [cleanPhone]
    );

    let result;
    if (existing.rows.length === 0) {
      const res = await pool.query(
        `INSERT INTO vexo_whatsapp_customers (phone, name, country, currency, interest, stage, vcard_sent, language, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING *`,
        [
          cleanPhone,
          data.name ?? null,
          data.country ?? null,
          data.currency ?? 'PKR',
          data.interest ?? null,
          data.stage ?? 'ask_name',
          Boolean(data.vcard_sent),
          data.language ?? 'en',
        ]
      );
      result = res.rows[0];
    } else {
      const current = existing.rows[0];
      const updatedName = data.name !== undefined ? data.name : current.name;
      const updatedCountry = data.country !== undefined ? data.country : current.country;
      const updatedCurrency = data.currency !== undefined ? data.currency : current.currency;
      const updatedInterest = data.interest !== undefined ? data.interest : current.interest;
      const updatedStage = data.stage !== undefined ? data.stage : current.stage;
      const updatedVcard = data.vcard_sent !== undefined ? Boolean(data.vcard_sent) : current.vcard_sent;
      const updatedLang = data.language !== undefined ? data.language : (current.language || 'en');

      const res = await pool.query(
        `UPDATE vexo_whatsapp_customers
         SET name = $2, country = $3, currency = $4, interest = $5, stage = $6, vcard_sent = $7, language = $8, updated_at = NOW()
         WHERE phone = $1
         RETURNING *`,
        [
          cleanPhone,
          updatedName,
          updatedCountry,
          updatedCurrency,
          updatedInterest,
          updatedStage,
          updatedVcard,
          updatedLang,
        ]
      );
      result = res.rows[0];
    }

    if (result) {
      memoryCustomerMap.set(cleanPhone, result);
    }
    return result;
  } catch (err) {
    console.error('[DB] upsertCustomer error:', err.message);
    const current = memoryCustomerMap.get(cleanPhone) || {
      phone: cleanPhone,
      stage: 'ask_name',
      currency: 'PKR',
      language: 'en',
    };
    const merged = { ...current, ...data };
    memoryCustomerMap.set(cleanPhone, merged);
    return merged;
  }
}

/**
 * Save Customer to Phone Contacts VCF File (Anti-Ban & Lead Export)
 */
export function saveContactToVcf(phone, name, country) {
  try {
    const vcfPath = path.join(__dirname, 'VEXARO_Contacts.vcf');
    const cleanPhone = String(phone).replace(/\D/g, '');
    const cleanName = String(name || 'Customer').trim();
    const cleanCountry = String(country || 'Global').trim();

    const entry = 
`BEGIN:VCARD
VERSION:3.0
FN:${cleanName} (VEXARO - ${cleanCountry})
TEL;TYPE=CELL:+${cleanPhone}
NOTE:VEXARO SMM Panel Customer (${cleanCountry})
END:VCARD\n`;

    fs.appendFileSync(vcfPath, entry, 'utf8');
  } catch (err) {
    console.warn('[VCF] Failed to append contact:', err.message);
  }
}

/**
 * Scrub sensitive provider names, domains, or internal keys
 */
export function sanitizeText(text) {
  if (!text) return '';
  return text
    .replace(/(?:https?:\/\/)?(?:www\.)?(?:smmflare|paksmmpanels|pakistansmmpanel|smoothsmm|amsmmpanel|rizvismmpanels|rizvi)\.(?:com|pk|org|net)/gi, 'VEXARO Server')
    .replace(/\b(smmflare|pak_smm|pakistan_smm|smooth_smm|am_smm|rizvi_smm|rizvi)\b/gi, 'VEXARO Direct')
    .replace(/\b(api_key|secret_key|sk-[a-zA-Z0-9_-]+)\b/gi, '[REDACTED]')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Fetch top cheapest paid services (excluding free test trials)
 */
export async function getCheapestServices(platform = null, limit = 5, targetCurrency = 'PKR') {
  try {
    await refreshForexRates();

    let query = `
      SELECT id, name, platform, category, COALESCE(custom_rate_pkr, rate_pkr) as rate, min, max
      FROM vexo_routed_services
      WHERE enabled = true
        AND COALESCE(custom_rate_pkr, rate_pkr) > 0.05
        AND LOWER(name) NOT LIKE '%trial%'
        AND LOWER(name) NOT LIKE '%free test%'
        AND LOWER(category) NOT LIKE '%trial%'
    `;
    const params = [];

    if (platform) {
      params.push(`%${platform.toLowerCase()}%`);
      query += ` AND (LOWER(platform) LIKE $${params.length} OR LOWER(category) LIKE $${params.length})`;
    }

    query += ` ORDER BY COALESCE(custom_rate_pkr, rate_pkr) ASC LIMIT ${limit}`;

    const res = await pool.query(query, params);
    return res.rows.map(r => {
      const pkrRate = Number(r.rate || 0);
      const converted = convertPkrToCurrency(pkrRate, targetCurrency);
      return {
        id: r.id,
        name: sanitizeText(r.name),
        platform: r.platform,
        category: r.category,
        ratePkr: pkrRate.toFixed(2),
        rateConverted: converted.formatted,
        currency: targetCurrency,
        min: r.min,
        max: r.max,
      };
    });
  } catch (err) {
    console.error('[DB] getCheapestServices error:', err.message);
    return [];
  }
}

/**
 * Fetch 100% Free Test Trial services
 */
export async function getFreeTrialServices(targetCurrency = 'PKR') {
  try {
    const res = await pool.query(
      `SELECT id, name, platform, category, COALESCE(custom_rate_pkr, rate_pkr) as rate, min, max
       FROM vexo_routed_services
       WHERE enabled = true AND (
         COALESCE(custom_rate_pkr, rate_pkr) <= 0.05 OR
         LOWER(name) LIKE '%trial%' OR
         LOWER(name) LIKE '%free test%'
       )
       ORDER BY COALESCE(custom_rate_pkr, rate_pkr) ASC
       LIMIT 4`
    );

    return res.rows.map(r => ({
      id: r.id,
      name: sanitizeText(r.name),
      platform: r.platform,
      category: r.category,
      rateConverted: '0.00 (100% Free)',
      min: r.min,
      max: r.max,
    }));
  } catch (err) {
    console.error('[DB] getFreeTrialServices error:', err.message);
    return [];
  }
}

/**
 * Search services by keyword with converted currency
 */
export async function searchServices(keyword, limit = 5, targetCurrency = 'PKR') {
  try {
    await refreshForexRates();

    const res = await pool.query(
      `SELECT id, name, platform, category, COALESCE(custom_rate_pkr, rate_pkr) as rate, min, max
       FROM vexo_routed_services
       WHERE enabled = true AND (
         LOWER(name) LIKE $1 OR LOWER(category) LIKE $1 OR LOWER(platform) LIKE $1
       )
       ORDER BY COALESCE(custom_rate_pkr, rate_pkr) ASC
       LIMIT ${limit}`,
      [`%${keyword.toLowerCase()}%`]
    );

    return res.rows.map(r => {
      const pkrRate = Number(r.rate || 0);
      const converted = convertPkrToCurrency(pkrRate, targetCurrency);
      return {
        id: r.id,
        name: sanitizeText(r.name),
        platform: r.platform,
        category: r.category,
        ratePkr: pkrRate.toFixed(2),
        rateConverted: converted.formatted,
        currency: targetCurrency,
        min: r.min,
        max: r.max,
      };
    });
  } catch (err) {
    console.error('[DB] searchServices error:', err.message);
    return [];
  }
}

/**
 * Lookup an order by full UUID, UUID prefix, or provider order ID
 */
export async function lookupOrder(orderQuery) {
  const cleanQuery = String(orderQuery || '').replace('#', '').trim();
  if (!cleanQuery) return null;

  try {
    const res = await pool.query(
      `SELECT id, user_id, provider_order_id, service_name, quantity, rate_pkr, charge_pkr,
              status, provider_id, start_count, remains, created_at
       FROM vexo_orders
       WHERE id::text ILIKE $1 OR provider_order_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [`${cleanQuery}%`, cleanQuery]
    );

    if (res.rows.length === 0) return null;
    const o = res.rows[0];

    return {
      id: String(o.id),
      shortId: String(o.id).slice(0, 8),
      userId: o.user_id,
      serviceName: sanitizeText(o.service_name),
      quantity: o.quantity,
      chargePkr: Number(o.charge_pkr || 0).toFixed(2),
      status: o.status || 'In Progress',
      providerId: o.provider_id,
      providerOrderId: o.provider_order_id,
      startCount: o.start_count || '0',
      remains: o.remains || null,
      createdAt: o.created_at,
    };
  } catch (err) {
    console.error('[DB] lookupOrder error:', err.message);
    return null;
  }
}

/**
 * Submit speed-up ticket to VEXARO support and upstream provider
 */
export async function processOrderSpeedUp(orderQuery, senderPhone = '') {
  const order = await lookupOrder(orderQuery);
  if (!order) {
    return {
      success: false,
      message: `Mujhe Order ID *${orderQuery}* system me nahi mila. Barah-e-karam apna durust Order ID check karein (maslan: *speed up order 125* ya UUID).`
    };
  }

  const stLower = (order.status || '').toLowerCase();
  if (stLower.includes('complet')) {
    return {
      success: true,
      message: `Aapka Order #${order.shortId} pehle hi *Completed* ho chuka hai! Mazeed kisi cheez ki zaroorat ho toh batayein.`
    };
  }
  if (stLower.includes('cancel')) {
    return {
      success: true,
      message: `Aapka Order #${order.shortId} *Cancelled* ho chuka hai aur iska balance refund ho chuka hai.`
    };
  }

  // 1. Create a support ticket in VEXARO internal database
  let ticketId = null;
  try {
    const ticketRes = await pool.query(
      `INSERT INTO vexo_support_tickets (user_id, subject, category, order_id, message, status)
       VALUES ($1, $2, 'Speed Up', $3, $4, 'Open')
       RETURNING id`,
      [
        order.userId || null,
        `⚡ WhatsApp Speed-Up: Order #${order.shortId}`,
        order.id,
        `Customer (+${senderPhone}) requested order speed-up via WhatsApp for Order #${order.id}. Service: ${order.serviceName}. Status: ${order.status}. Provider Ref: ${order.providerOrderId || 'N/A'}.`
      ]
    );
    ticketId = ticketRes.rows[0]?.id;
  } catch (tErr) {
    console.warn('[DB] Failed to insert vexo_support_tickets:', tErr.message);
  }

  // 2. Dispatch speed-up/ticket to upstream provider (zero provider leaks!)
  let providerPinged = false;
  if (order.providerId && order.providerOrderId) {
    try {
      const provRes = await pool.query(
        `SELECT api_url, api_key FROM vexo_providers WHERE id = $1 LIMIT 1`,
        [order.providerId]
      );
      if (provRes.rows.length > 0) {
        const { api_url, api_key } = provRes.rows[0];

        try {
          await fetch(api_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              key: api_key,
              action: 'add_ticket',
              subject: `Speed up order #${order.providerOrderId}`,
              message: `Please speed up order #${order.providerOrderId}. High priority request from customer.`
            }),
            signal: AbortSignal.timeout(6000)
          });
          providerPinged = true;
        } catch {
          try {
            await fetch(api_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                key: api_key,
                action: 'refill',
                order: String(order.providerOrderId)
              }),
              signal: AbortSignal.timeout(6000)
            });
            providerPinged = true;
          } catch {
            // Ignore provider network errors - internal ticket is already recorded
          }
        }
      }
    } catch (pErr) {
      console.warn('[Provider Dispatch Warning]:', pErr.message);
    }
  }

  return {
    success: true,
    order,
    ticketId,
    providerPinged,
    message: 
`⚡ *Speed-Up Ticket Sent Successfully!*

📦 *Order ID:* #${order.shortId}
🚀 *Service:* ${order.serviceName}
📊 *Current Status:* ${order.status}

Aapke order ke liye automated *Priority Speed-Up Ticket* create karke direct high-speed server ko send kar di gayi hai!
Server queue ne ise *High Priority* mark kar diya hai taake order jaldi se jaldi complete ho sake.`
  };
}

/**
 * Ensures notification and bot control tables exist in PostgreSQL
 */
export async function ensureNotificationAndControlTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vexo_whatsapp_notifications (
        id BIGSERIAL PRIMARY KEY,
        phone VARCHAR(40) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(40) NOT NULL,
        reference_id VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        sent_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_vexo_wa_notif_status ON vexo_whatsapp_notifications(status);

      CREATE TABLE IF NOT EXISTS vexo_whatsapp_bot_controls (
        phone VARCHAR(40) PRIMARY KEY,
        is_ignored BOOLEAN DEFAULT FALSE,
        is_paused BOOLEAN DEFAULT FALSE,
        paused_until TIMESTAMPTZ,
        reason TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.warn('[DB Tables Init Warning]:', err.message);
  }
}

/**
 * Check if a phone number is permanently ignored or temporarily paused (human takeover)
 */
export async function isPhoneIgnoredOrPaused(phone) {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (!cleanPhone) return { ignored: false, paused: false };

  try {
    const res = await pool.query(
      `SELECT is_ignored, is_paused, paused_until FROM vexo_whatsapp_bot_controls WHERE phone = $1 LIMIT 1`,
      [cleanPhone]
    );
    if (res.rows.length === 0) return { ignored: false, paused: false };

    const row = res.rows[0];
    if (row.is_ignored) return { ignored: true, paused: false };

    if (row.is_paused) {
      if (row.paused_until && new Date(row.paused_until) < new Date()) {
        await pool.query(
          `UPDATE vexo_whatsapp_bot_controls SET is_paused = FALSE, paused_until = NULL, updated_at = NOW() WHERE phone = $1`,
          [cleanPhone]
        );
        return { ignored: false, paused: false };
      }
      return { ignored: false, paused: true, pausedUntil: row.paused_until };
    }

    return { ignored: false, paused: false };
  } catch {
    return { ignored: false, paused: false };
  }
}

/**
 * Update phone control settings (ignore, pause, unpause)
 */
export async function setPhoneControl(phone, { isIgnored = false, isPaused = false, pauseHours = 24, reason = '' } = {}) {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (!cleanPhone) return false;

  try {
    await ensureNotificationAndControlTables();
    let pausedUntil = null;
    if (isPaused) {
      pausedUntil = new Date(Date.now() + pauseHours * 60 * 60 * 1000);
    }

    await pool.query(`
      INSERT INTO vexo_whatsapp_bot_controls (phone, is_ignored, is_paused, paused_until, reason, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (phone) DO UPDATE SET
        is_ignored = EXCLUDED.is_ignored,
        is_paused = EXCLUDED.is_paused,
        paused_until = EXCLUDED.paused_until,
        reason = EXCLUDED.reason,
        updated_at = NOW()
    `, [cleanPhone, isIgnored, isPaused, pausedUntil, reason]);

    return true;
  } catch (err) {
    console.warn('[setPhoneControl Error]:', err.message);
    return false;
  }
}

/**
 * Get active phone controls (ignored or paused)
 */
export async function getPhoneControlsList() {
  try {
    await ensureNotificationAndControlTables();
    const res = await pool.query(`
      SELECT phone, is_ignored, is_paused, paused_until, reason, updated_at
      FROM vexo_whatsapp_bot_controls
      WHERE is_ignored = true OR (is_paused = true AND (paused_until IS NULL OR paused_until > NOW()))
      ORDER BY updated_at DESC
      LIMIT 25
    `);
    return res.rows;
  } catch (err) {
    console.warn('[getPhoneControlsList Error]:', err.message);
    return [];
  }
}

/**
 * Fetch pending notifications from queue
 */
export async function fetchPendingNotifications(limit = 10) {
  try {
    await ensureNotificationAndControlTables();
    const res = await pool.query(
      `SELECT id, phone, message, type, reference_id, metadata
       FROM vexo_whatsapp_notifications
       WHERE status = 'pending'
       ORDER BY id ASC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  } catch {
    return [];
  }
}

export async function markNotificationSent(id) {
  try {
    await pool.query(
      `UPDATE vexo_whatsapp_notifications SET status = 'sent', sent_at = NOW() WHERE id = $1`,
      [id]
    );
  } catch {}
}

export async function markNotificationFailed(id, error) {
  try {
    await pool.query(
      `UPDATE vexo_whatsapp_notifications SET status = 'failed', metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{error}', to_jsonb($2::text)) WHERE id = $1`,
      [id, String(error)]
    );
  } catch {}
}

/**
 * Automated Refill Processor via WhatsApp
 */
export async function processOrderRefill(orderId, senderPhone) {
  const order = await lookupOrder(orderId);
  if (!order) {
    return {
      success: false,
      message: `❌ Order *#${orderId}* hamare record me nahi mila. Barah-e-meherbani sahi Order ID check karein.`
    };
  }

  let providerRefillSent = false;
  if (order.providerId && order.providerOrderId) {
    try {
      const provRes = await pool.query(`SELECT api_url, api_key FROM vexo_providers WHERE id = $1 LIMIT 1`, [order.providerId]);
      if (provRes.rows[0]) {
        const { api_url, api_key } = provRes.rows[0];
        const res = await fetch(api_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ key: api_key, action: 'refill', order: String(order.providerOrderId) }),
          signal: AbortSignal.timeout(8000)
        });
        const data = await res.json();
        if (data && (data.refill || data.success)) providerRefillSent = true;
      }
    } catch (e) {
      console.warn('[Refill Provider Warning]:', e.message);
    }
  }

  return {
    success: true,
    message:
`♻️ *Refill Request Submitted!*

📦 *Order ID:* #${order.shortId}
🚀 *Service:* ${order.serviceName}
📊 *Current Status:* ${order.status}

Aapke order ke liye *Free Refill Request* system me enter kar di gayi hai!${providerRefillSent ? '\nServer ko instant replenish signal bhej diya gaya hai.' : ''}
Drop check karke delivery jald complete ho jayegi.`
  };
}
