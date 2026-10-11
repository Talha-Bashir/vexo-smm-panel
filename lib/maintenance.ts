import { db } from "@/lib/db";
import { ensureAdminSchema } from "@/lib/admin";
import { getRequestUser } from "@/lib/request-user";
import { NextResponse } from "next/server";

export interface MaintenanceStatus {
  isActive: boolean;
  message: string;
}

export const DEFAULT_MAINTENANCE_MESSAGE =
  "We are currently performing scheduled maintenance to upgrade our servers and provider networks. We will be back online shortly!";

/**
 * Checks whether platform maintenance mode is currently active in the database.
 */
export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  try {
    await ensureAdminSchema();
    const res = await db.query(
      `SELECT key, value FROM vexo_platform_settings WHERE key IN ('site_maintenance_mode', 'site_maintenance_message')`
    );
    let isActive = false;
    let message = DEFAULT_MAINTENANCE_MESSAGE;

    for (const row of res.rows) {
      if (row.key === "site_maintenance_mode" && String(row.value).trim().toLowerCase() === "true") {
        isActive = true;
      }
      if (row.key === "site_maintenance_message" && row.value && String(row.value).trim()) {
        message = String(row.value).trim();
      }
    }

    return { isActive, message };
  } catch (err) {
    console.error("Failed to check maintenance status:", err);
    return { isActive: false, message: DEFAULT_MAINTENANCE_MESSAGE };
  }
}

/**
 * Middleware/helper for public API mutation routes (orders, subscriptions, deposits, signup).
 * Rejects requests with HTTP 503 if maintenance mode is enabled, while allowing admins to proceed.
 */
export async function checkMaintenanceApiBlock(): Promise<NextResponse | null> {
  const { isActive, message } = await getMaintenanceStatus();
  if (!isActive) return null;

  // Allow admin bypass
  try {
    const user = await getRequestUser();
    if (user && (user.is_admin || user.is_super_admin)) {
      return null;
    }
  } catch {
    // Non-authenticated or failed session
  }

  return NextResponse.json(
    {
      success: false,
      error: `Platform Maintenance: ${message}`,
      isMaintenance: true,
    },
    { status: 503 }
  );
}
