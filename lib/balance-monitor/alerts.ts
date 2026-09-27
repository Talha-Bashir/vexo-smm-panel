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
  const defaultLow = Number(process.env.BALANCE_ALERT_DEFAULT_LOW || 10);
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
    case "pakistan_smm":
      lowEnvKey = process.env.BALANCE_ALERT_PROVIDER4 || process.env.BALANCE_ALERT_PAKISTAN_SMM || "";
      critEnvKey = process.env.BALANCE_CRITICAL_PROVIDER4 || process.env.BALANCE_CRITICAL_PAKISTAN_SMM || "";
      break;
    case "rizvi_smm":
      lowEnvKey = process.env.BALANCE_ALERT_PROVIDER5 || process.env.BALANCE_ALERT_RIZVI_SMM || "";
      critEnvKey = process.env.BALANCE_CRITICAL_PROVIDER5 || process.env.BALANCE_CRITICAL_RIZVI_SMM || "";
      break;
    case "ggsoma_bot":
      lowEnvKey = process.env.BALANCE_ALERT_PROVIDER6 || process.env.BALANCE_ALERT_GGSOMA_BOT || "";
      critEnvKey = process.env.BALANCE_CRITICAL_PROVIDER6 || process.env.BALANCE_CRITICAL_GGSOMA_BOT || "";
      break;
  }

  const low = lowEnvKey && !isNaN(Number(lowEnvKey)) ? Number(lowEnvKey) : defaultLow;
  const critical = critEnvKey && !isNaN(Number(critEnvKey)) ? Number(critEnvKey) : defaultCritical;

  return { low, critical };
}

export async function processProviderAlert(
  check: ProviderBalanceCheckResult
): Promise<ProviderBalanceResult> {
  await ensureBalanceAlertSchema();

  // 1. Fetch existing alert state from database
  let previousLevel: AlertLevel = "NORMAL";
  try {
    const existing = await db.query(
      `SELECT last_alert_level FROM vexo_balance_alert_state WHERE provider_id = $1`,
      [check.id]
    );
    if (existing.rows.length > 0) {
      previousLevel = (existing.rows[0].last_alert_level as AlertLevel) || "NORMAL";
    }
  } catch (err) {
    console.error(`[BalanceMonitor] Could not read alert state for ${check.id}:`, err);
  }

  let alertLevel: AlertLevel = "NORMAL";
  let notificationSent = false;
  let notificationType: "LOW" | "CRITICAL" | "RECOVERY" | "ERROR" | undefined;

  // 2. Handle failure state
  if (!check.success || check.balance === undefined) {
    alertLevel = "ERROR";
    // Only send error alert if we weren't already in ERROR state (prevents spam)
    if (previousLevel !== "ERROR") {
      notificationType = "ERROR";
      const msg = formatProviderErrorAlert(check.name, check.error);
      notificationSent = await sendTelegramNotification(msg);
    }

    await saveAlertState(check.id, alertLevel, check.balance, check.currency, check.error, notificationSent);

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
    // Only alert if transitioning into CRITICAL
    if (previousLevel !== "CRITICAL") {
      notificationType = "CRITICAL";
      const msg = formatCriticalBalanceAlert(check.name, balance, thresholds.critical, currency);
      notificationSent = await sendTelegramNotification(msg);
    }
  } else if (balance <= thresholds.low) {
    alertLevel = "LOW";
    // Alert when dropping from NORMAL or recovering from ERROR into LOW
    if (previousLevel === "NORMAL" || previousLevel === "ERROR") {
      notificationType = "LOW";
      const msg = formatLowBalanceAlert(check.name, balance, thresholds.low, currency);
      notificationSent = await sendTelegramNotification(msg);
    }
  } else {
    alertLevel = "NORMAL";
    // Recovered back to NORMAL from LOW or CRITICAL
    if ((previousLevel === "LOW" || previousLevel === "CRITICAL") && recoveryEnabled) {
      notificationType = "RECOVERY";
      const msg = formatRecoveryAlert(check.name, balance, currency);
      notificationSent = await sendTelegramNotification(msg);
    }
  }

  await saveAlertState(check.id, alertLevel, balance, currency, undefined, notificationSent);

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
