import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-guard";
import { runBalanceMonitoring, getProviderThresholds } from "@/lib/balance-monitor";
import { logAdminActivity } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdminPermission("services");
    if (!auth.authorized) {
      return auth.response!;
    }

    const summary = await runBalanceMonitoring();

    // Map summary with detailed threshold context for the admin display
    const detailedProviders = summary.providers.map((p) => {
      const thresholds = getProviderThresholds(p.id);
      let statusEmoji = "🟢";
      let statusLabel = "Normal";

      if (p.alertLevel === "CRITICAL") {
        statusEmoji = "🔴";
        statusLabel = "Critical";
      } else if (p.alertLevel === "LOW") {
        statusEmoji = "🟡";
        statusLabel = "Low";
      } else if (p.alertLevel === "ERROR") {
        statusEmoji = "⚠️";
        statusLabel = "Error";
      }

      return {
        ...p,
        thresholds: {
          low: thresholds.low,
          critical: thresholds.critical,
        },
        displayStatus: `${statusEmoji} ${statusLabel}`,
      };
    });

    try {
      await logAdminActivity(
        auth.user!.id,
        "CHECK_PROVIDER_BALANCES",
        "balance_monitor",
        undefined,
        {
          total: summary.totalChecked,
          successful: summary.successfulChecks,
          failed: summary.failedChecks,
          alertsTriggered: summary.alertsTriggered,
        }
      );
    } catch {
      // Activity logging error should not block response
    }

    return NextResponse.json({
      success: true,
      timestamp: summary.timestamp,
      totalChecked: summary.totalChecked,
      successfulChecks: summary.successfulChecks,
      failedChecks: summary.failedChecks,
      alertsTriggered: summary.alertsTriggered,
      providers: detailedProviders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error executing admin balance check";
    console.error("[AdminBalanceCheck] Error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
