import { db } from "@/lib/db";

export interface QueueNotificationParams {
  phone: string;
  message: string;
  type: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

let tablesEnsuredPromise: Promise<void> | null = null;

/**
 * Ensures notification and bot control tables exist in PostgreSQL
 */
export async function ensureNotificationTables(): Promise<void> {
  if (!tablesEnsuredPromise) {
    tablesEnsuredPromise = (async () => {
      await db.query(`
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
    })().catch((err) => {
      tablesEnsuredPromise = null;
      console.warn("[WhatsApp Notification Tables Init Error]:", err);
    });
  }
  return tablesEnsuredPromise;
}

/**
 * Queues a WhatsApp message to be dispatched by the live Baileys bot
 */
export async function queueWhatsAppNotification(params: QueueNotificationParams): Promise<boolean> {
  const cleanPhone = String(params.phone || "").replace(/\D/g, "");
  if (!cleanPhone || cleanPhone.length < 8) return false;

  try {
    await ensureNotificationTables();

    // Prevent duplicate alerts for the exact same event/order
    if (params.referenceId) {
      const existing = await db.query(
        `SELECT id FROM vexo_whatsapp_notifications WHERE type = $1 AND reference_id = $2 LIMIT 1`,
        [params.type, params.referenceId]
      );
      if (existing.rows.length > 0) {
        return false;
      }
    }

    await db.query(
      `INSERT INTO vexo_whatsapp_notifications (phone, message, type, reference_id, metadata, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
      [
        cleanPhone,
        params.message,
        params.type,
        params.referenceId || null,
        params.metadata ? JSON.stringify(params.metadata) : null,
      ]
    );

    return true;
  } catch (err) {
    console.warn("[WhatsApp Queue Error]:", err);
    return false;
  }
}

/**
 * Helper to fetch a registered user's WhatsApp number
 */
export async function getUserWhatsAppPhone(userId: number | string): Promise<string | null> {
  try {
    const res = await db.query(
      `SELECT whatsapp FROM vexo_users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    const raw = res.rows[0]?.whatsapp;
    if (!raw) return null;
    const clean = String(raw).replace(/\D/g, "");
    return clean.length >= 8 ? clean : null;
  } catch {
    return null;
  }
}
