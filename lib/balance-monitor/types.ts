export type AlertLevel = "NORMAL" | "LOW" | "CRITICAL" | "ERROR";

export interface ProviderBalanceThresholds {
  low: number;
  critical: number;
}

export interface ProviderBalanceResult {
  id: string;
  name: string;
  success: boolean;
  balance?: number;
  currency?: string;
  error?: string;
  alertLevel: AlertLevel;
  previousLevel: AlertLevel;
  notificationSent: boolean;
  notificationType?: "LOW" | "CRITICAL" | "RECOVERY" | "ERROR";
}

export interface BalanceMonitorSummary {
  success: boolean;
  timestamp: string;
  totalChecked: number;
  successfulChecks: number;
  failedChecks: number;
  alertsTriggered: number;
  providers: Array<{
    id: string;
    name: string;
    status: "ok" | "error";
    balance?: string;
    balanceRaw?: number;
    currency?: string;
    alertLevel: AlertLevel;
    notificationSent: boolean;
    error?: string;
  }>;
}
