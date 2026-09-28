import { checkAllProviderBalances } from "./providers";
import { processProviderAlert } from "./alerts";
import { BalanceMonitorSummary, ProviderBalanceResult } from "./types";

import { db } from "@/lib/db";

export * from "./types";
export * from "./telegram";
export * from "./providers";
export * from "./alerts";

/**
 * Orchestrates a complete balance-monitoring cycle for all 6 SMM providers:
 * 1. Concurrently fetches balances without affecting order or service operations.
 * 2. Compares each against configured LOW and CRITICAL thresholds.
 * 3. Applies anti-spam state machine (persisted in DB).
 * 4. Dispatches formatted Telegram alerts when thresholds are crossed or recovered.
 * 5. Returns a sanitized, safe summary object (no credentials or secrets).
 */
export async function runBalanceMonitoring(): Promise<BalanceMonitorSummary> {
  const checkResults = await checkAllProviderBalances();

  const processedResults: ProviderBalanceResult[] = [];
  for (const check of checkResults) {
    if (check.success && check.balance !== undefined && !Number.isNaN(check.balance)) {
      try {
        await db.query(
          `UPDATE vexo_providers
           SET balance_usd = $1, last_sync_at = NOW()
           WHERE id = $2`,
          [check.balance, check.id]
        );
      } catch {
        // Non-blocking
      }
    }
    const processed = await processProviderAlert(check);
    processedResults.push(processed);
  }

  const successfulChecks = processedResults.filter((r) => r.success).length;
  const failedChecks = processedResults.filter((r) => !r.success).length;
  const alertsTriggered = processedResults.filter((r) => r.notificationSent).length;

  return {
    success: true,
    timestamp: new Date().toISOString(),
    totalChecked: processedResults.length,
    successfulChecks,
    failedChecks,
    alertsTriggered,
    providers: processedResults.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.success ? "ok" : "error",
      balance: r.balance !== undefined ? `${r.currency || "USD"} ${r.balance.toFixed(2)}` : undefined,
      balanceRaw: r.balance !== undefined ? r.balance : undefined,
      currency: r.currency || "USD",
      alertLevel: r.alertLevel,
      notificationSent: r.notificationSent,
      error: r.error,
    })),
  };
}
