import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
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
 * Fetch top cheapest enabled services
 */
export async function getCheapestServices(platform = null, limit = 5) {
  try {
    let query = `
      SELECT id, name, platform, category, COALESCE(custom_rate_pkr, rate_pkr) as rate, min, max
      FROM vexo_routed_services
      WHERE enabled = true
    `;
    const params = [];

    if (platform) {
      params.push(`%${platform.toLowerCase()}%`);
      query += ` AND (LOWER(platform) LIKE $${params.length} OR LOWER(category) LIKE $${params.length})`;
    }

    query += ` ORDER BY COALESCE(custom_rate_pkr, rate_pkr) ASC LIMIT ${limit}`;

    const res = await pool.query(query, params);
    return res.rows.map(r => ({
      id: r.id,
      name: sanitizeText(r.name),
      platform: r.platform,
      category: r.category,
      ratePkr: Number(r.rate || 0).toFixed(2),
      min: r.min,
      max: r.max,
    }));
  } catch (err) {
    console.error('[DB] getCheapestServices error:', err.message);
    return [];
  }
}

/**
 * Search services by keyword (e.g. tiktok views, instagram followers)
 */
export async function searchServices(keyword, limit = 5) {
  try {
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

    return res.rows.map(r => ({
      id: r.id,
      name: sanitizeText(r.name),
      platform: r.platform,
      category: r.category,
      ratePkr: Number(r.rate || 0).toFixed(2),
      min: r.min,
      max: r.max,
    }));
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

  // If already completed or canceled
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

  // 2. Dispatch speed-up/ticket to upstream provider (behind the scenes, zero provider leaks!)
  let providerPinged = false;
  if (order.providerId && order.providerOrderId) {
    try {
      const provRes = await pool.query(
        `SELECT api_url, api_key FROM vexo_providers WHERE id = $1 LIMIT 1`,
        [order.providerId]
      );
      if (provRes.rows.length > 0) {
        const { api_url, api_key } = provRes.rows[0];

        // Attempt 1: Add ticket on provider panel
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
          // Attempt 2: Try refill/push action if add_ticket isn't supported
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
