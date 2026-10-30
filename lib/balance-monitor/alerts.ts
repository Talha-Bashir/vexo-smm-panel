import { db } from "@/lib/db";
import { AlertLevel, ProviderBalanceResult, ProviderBalanceThresholds } from "./types";
import { ProviderBalanceCheckResult } from "./providers";
import {
  formatCriticalBalanceAlert,
  formatLowBalanceAlert,
  formatProviderErrorAlert,
  formatRecoveryAlert,
  sendTelegramNotification,
} from "./telegram";
import { queueWhatsAppNotification } from "@/lib/whatsapp-queue";

let schemaReadyPromise: Promise<void> | null = null;

export async function ensureBalanceAlertSchema(): Promise<void> {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS vexo_balance_alert_state (
          provider_id VARCHAR(50) PRIMARY KEY,
          last_alert_level VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
          last_balance NUMERIC(14,4),
          last_currency VARCHAR(10) DEFAULT 'USD',
          last_error TEXT,
          last_notified_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    })().catch((err) => {
      schemaReadyPromise = null;
      throw err;
    });
  }
  return schemaReadyPromise;
}

export function getProviderThresholds(providerId: string): ProviderBalanceThresholds {
  const defaultLow = Number(process.env.BALANCE_ALERT_DEFAULT_LOW || 15);
  const defaultCritical = Number(process.env.BALANCE_ALERT_DEFAULT_CRITICAL || 5);

  let lowEnvKey = "";
  let critEnvKey = "";

  switch (providerId) {
    case "pak_smm":
      lowEnvKey = process.env.BALANCE_ALERT_PROVIDER1 || process.env.BALANCE_ALERT_PAK_SMM || "";
      critEnvKey = process.env.BALANCE_CRITICAL_PROVIDER1 || process.env.BALANCE_CRITICAL_PAK_SMM || "";
      break;
    case "smooth_smm":
      lowEnvKey = process.env.BALANCE_ALERT_PROVIDER2 || process.env.BALANCE_ALERT_SMOOTH_SMM || "";
      critEnvKey = process.env.BALANCE_CRITICAL_PROVIDER2 || process.env.BALANCE_CRITICAL_SMOOTH_SMM || "";
      break;
    case "am_smm":
      lowEnvKey = process.env.BALANCE_ALERT_PROVIDER3 || process.env.BALANCE_ALERT_AM_SMM || "";
      critEnvKey = process.env.BALANCE_CRITICAL_PROVIDER3 || process.env.BALANCE_CRITICAL_AM_SMM || "";
      break;
    case "smmflare":
    case "pakistan_smm":
      lowEnvKey = process.env.BALANCE_ALERT_PROVIDER4 || process.env.BALANCE_ALERT_SMMFLARE || process.env.BALANCE_ALERT_PAKISTAN_SMM || "";
      critEnvKey = process.env.BALANCE_CRITICAL_PROVIDER4 || process.env.BALANCE_CRITICAL_SMMFLARE || process.env.BALANCE_CRITICAL_PAKISTAN_SMM || "";
      break;
    case "rizvi_smm":
      lowEnvKey = process.env.BALANCE_ALERT_PROVIDER5 || process.env.BALANCE_ALERT_RIZVI_SMM || "";
      critEnvKey = process.env.BALANCE_CRITICAL_PROVIDER5 || process.env.BALANCE_CRITICAL_RIZVI_SMM || "";
      break;
    case "elevatex_bot":
      lowEnvKey = process.env.BALANCE_ALERT_PROVIDER6 || process.env.BALANCE_ALERT_ELEVATEX_BOT || "";
      critEnvKey = process.env.BALANCE_CRITICAL_PROVIDER6 || process.env.BALANCE_CRITICAL_ELEVATEX_BOT || "";
      break;
  }

  const low = lowEnvKey && !isNaN(Number(lowEnvKey)) ? Number(lowEnvKey) : defaultLow;
  const critical = critEnvKey && !isNaN(Number(critEnvKey)) ? Number(critEnvKey) : defaultCritical;

  return { low, critical };
}

/**
 * Sends urgent balance alert to Admin WhatsApp numbers (03176437013, 03088180234, etc.)
 */
async function sendAdminWhatsAppBalanceAlert(params: {
  providerId: string;
  providerName: string;
  type: "CRITICAL" | "LOW" | "ERROR" | "RECOVERY";
  balance?: number;
  threshold?: number;
  currency?: string;
  error?: string;
}): Promise<void> {
  const targetPhones = [
    "923176437013",
    "923088180234",
    ...(process.env.ADMIN_WHATSAPP ? [process.env.ADMIN_WHATSAPP] : []),
    ...(process.env.SUPPORT_WHATSAPP ? [process.env.SUPPORT_WHATSAPP] : []),
  ]
    .map((p) => p.replace(/\D/g, "").replace(/^0/, "92"))
    .filter(Boolean);

  const uniquePhones = Array.from(new Set(targetPhones));
  const curr = params.currency || "USD";

  let waText = "";
  if (params.type === "CRITICAL") {
    waText =
      `🚨 *URGENT: Provider Balance CRITICAL!* 💸⚠️\n\n` +
      `🏢 *Provider:* ${params.providerName}\n` +
      `💰 *Live Balance:* ${params.balance !== undefined ? `$${params.balance.toFixed(2)} ${curr}` : "Zero / Empty"}\n` +
      `🔻 *Critical Threshold:* $${params.threshold ?? 5} ${curr}\n\n` +
      `⚠️ *Khatra:* Provider ka balance taqreeban khatam ho chuka hai! Naye customer orders pending me ja sakte hain.\n\n` +
      `👉 *Action Required:* Barah-e-karam foran provider account recharge karein.\n` +
      `🌐 Admin Panel: https://vexarosmm.com/admin`;
  } else if (params.type === "LOW") {
    waText =
      `⚠️ *WARNING: Provider Balance Low!* 📉\n\n` +
      `🏢 *Provider:* ${params.providerName}\n` +
      `💰 *Live Balance:* ${params.balance !== undefined ? `$${params.balance.toFixed(2)} ${curr}` : "Low"}\n` +
      `🔻 *Warning Threshold:* $${params.threshold ?? 15} ${curr}\n\n` +
      `Balance jald khatam hone ke qareeb hai. Barah-e-karam top-up arrange karein taake customer orders delay na hon.\n\n` +
      `🌐 Admin Panel: https://vexarosmm.com/admin`;
  } else if (params.type === "ERROR") {
    waText =
      `❌ *ALERT: Provider API Balance Check Error!* 🔌\n\n` +
      `🏢 *Provider:* ${params.providerName}\n` +
      `⚠️ *Error:* ${params.error || "Unknown API Connection Failure"}\n\n` +
      `Provider ke sath balance check karte waqt connection issue aya hai. Barah-e-karam check karein.\n\n` +
      `🌐 Admin Panel: https://vexarosmm.com/admin`;
  } else if (params.type === "RECOVERY") {
    waText =
      `✅ *RESOLVED: Provider Balance Restored!* 🟢\n\n` +
      `🏢 *Provider:* ${params.providerName}\n` +
      `💰 *Current Balance:* ${params.balance !== undefined ? `$${params.balance.toFixed(2)} ${curr}` : "Normal"}\n\n` +
      `Provider balance normal limit me aa chuka hai! Tamam queued orders normal speed se dispatch honge.`;
  }

  for (const phone of uniquePhones) {
    try {
      await queueWhatsAppNotification({
        phone,
        message: waText,
        type: `balance_${params.type.toLowerCase()}`,
        referenceId: `bal_${params.providerId}_${params.type}_${Date.now()}_${phone}`,
        metadata: {
          providerId: params.providerId,
          providerName: params.providerName,
          balance: params.balance,
          threshold: params.threshold,
          currency: params.currency,
        },
      });
    } catch (e) {
      console.warn(`[BalanceMonitor] Could not queue WhatsApp alert to +${phone}:`, e);
    }
  }
}

export async function processProviderAlert(
  check: ProviderBalanceCheckResult
): Promise<ProviderBalanceResult> {
  await ensureBalanceAlertSchema();

  // 1. Fetch existing alert state from database
  let previousLevel: AlertLevel = "NORMAL";
  let lastNotifiedAt: Date | null = null;
  try {
    const existing = await db.query(
      `SELECT last_alert_level, last_notified_at FROM vexo_balance_alert_state WHERE provider_id = $1`,
      [check.id]
    );
    if (existing.rows.length > 0) {
      previousLevel = (existing.rows[0].last_alert_level as AlertLevel) || "NORMAL";
      lastNotifiedAt = existing.rows[0].last_notified_at ? new Date(existing.rows[0].last_notified_at) : null;
    }
  } catch (err) {
    console.error(`[BalanceMonitor] Could not read alert state for ${check.id}:`, err);
  }

  let alertLevel: AlertLevel = "NORMAL";
  let notificationSent = false;
  let notificationType: "LOW" | "CRITICAL" | "RECOVERY" | "ERROR" | undefined;

  // Remind again if critical/low for more than cooldown period (default 12h)
  const COOLDOWN_HOURS = Number(process.env.BALANCE_ALERT_COOLDOWN_HOURS || 12);
  const cooldownExpired = !lastNotifiedAt || (Date.now() - lastNotifiedAt.getTime()) > (COOLDOWN_HOURS * 3600 * 1000);

  // 2. Handle failure state
  if (!check.success || check.balance === undefined) {
    alertLevel = "ERROR";
    if (previousLevel !== "ERROR" || !lastNotifiedAt || cooldownExpired) {
      notificationType = "ERROR";
      const msg = formatProviderErrorAlert(check.name, check.error);
      notificationSent = await sendTelegramNotification(msg);
      await sendAdminWhatsAppBalanceAlert({
        providerId: check.id,
        providerName: check.name,
        type: "ERROR",
        error: check.error,
      });
    }

    await saveAlertState(check.id, alertLevel, check.balance, check.currency, check.error, Boolean(notificationType));

    return {
      id: check.id,
      name: check.name,
      success: false,
      error: check.error,
      alertLevel,
      previousLevel,
      notificationSent,
      notificationType,
    };
  }

  // 3. Handle success state with thresholds
  const balance = check.balance;
  const currency = check.currency || "USD";
  const thresholds = getProviderThresholds(check.id);
  const recoveryEnabled = process.env.BALANCE_RECOVERY_ALERT !== "false";

  if (balance <= thresholds.critical) {
    alertLevel = "CRITICAL";
    // Alert if new state, or if notification was never successfully delivered, or if cooldown expired
    if (previousLevel !== "CRITICAL" || !lastNotifiedAt || cooldownExpired) {
      notificationType = "CRITICAL";
      const msg = formatCriticalBalanceAlert(check.name, balance, thresholds.critical, currency);
      notificationSent = await sendTelegramNotification(msg);
      await sendAdminWhatsAppBalanceAlert({
        providerId: check.id,
        providerName: check.name,
        type: "CRITICAL",
        balance,
        threshold: thresholds.critical,
        currency,
      });
    }
  } else if (balance <= thresholds.low) {
    alertLevel = "LOW";
    if (previousLevel !== "LOW" || !lastNotifiedAt || cooldownExpired) {
      notificationType = "LOW";
      const msg = formatLowBalanceAlert(check.name, balance, thresholds.low, currency);
      notificationSent = await sendTelegramNotification(msg);
      await sendAdminWhatsAppBalanceAlert({
        providerId: check.id,
        providerName: check.name,
        type: "LOW",
        balance,
        threshold: thresholds.low,
        currency,
      });
    }
  } else {
    alertLevel = "NORMAL";
    // Recovered back to NORMAL from LOW or CRITICAL
    if ((previousLevel === "LOW" || previousLevel === "CRITICAL") && recoveryEnabled) {
      notificationType = "RECOVERY";
      const msg = formatRecoveryAlert(check.name, balance, currency);
      notificationSent = await sendTelegramNotification(msg);
      await sendAdminWhatsAppBalanceAlert({
        providerId: check.id,
        providerName: check.name,
        type: "RECOVERY",
        balance,
        currency,
      });
    }
  }

  await saveAlertState(check.id, alertLevel, balance, currency, undefined, Boolean(notificationType));

  return {
    id: check.id,
    name: check.name,
    success: true,
    balance,
    currency,
    alertLevel,
    previousLevel,
    notificationSent,
    notificationType,
  };
}

async function saveAlertState(
  providerId: string,
  level: AlertLevel,
  balance?: number,
  currency?: string,
  error?: string,
  notified?: boolean
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO vexo_balance_alert_state (provider_id, last_alert_level, last_balance, last_currency, last_error, last_notified_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CASE WHEN $6 THEN NOW() ELSE NULL END, NOW())
       ON CONFLICT (provider_id) DO UPDATE SET
         last_alert_level = EXCLUDED.last_alert_level,
         last_balance = EXCLUDED.last_balance,
         last_currency = EXCLUDED.last_currency,
         last_error = EXCLUDED.last_error,
         last_notified_at = CASE WHEN $6 THEN NOW() ELSE vexo_balance_alert_state.last_notified_at END,
         updated_at = NOW()`,
      [providerId, level, balance ?? null, currency ?? "USD", error ?? null, Boolean(notified)]
    );
  } catch (err) {
    console.error(`[BalanceMonitor] Could not persist alert state for ${providerId}:`, err);
  }
}
