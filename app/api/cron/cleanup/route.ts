import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

interface CleanupReport {
  success: boolean;
  timestamp: string;
  purged: {
    expiredSessions: number;
    oldActivityLogs: number;
    staleRejectedDeposits: number;
    disabledOldAnnouncements: number;
  };
  totalPurged: number;
  databaseOptimized: boolean;
  message: string;
}

/**
 * Validates request authorization:
 * - Bearer token matching CRON_SECRET or query param ?secret=CRON_SECRET
 * - OR request coming from localhost
 * - OR request by an authenticated Admin user
 */
async function isAuthorized(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret")?.trim();

  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  // 1. If CRON_SECRET is set in environment, check match
  if (cronSecret && (bearerToken === cronSecret || querySecret === cronSecret)) {
    return true;
  }

  // 2. Allow requests originating from local loopback in development
  const host = request.headers.get("host") || "";
  if (
    process.env.NODE_ENV !== "production" &&
    (host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host === "localhost")
  ) {
    return true;
  }

  // 3. Allow requests by authenticated Admin user
  try {
    const user = await getRequestUser();
    if (user && user.is_admin) {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

export async function runTrashCleanup(): Promise<CleanupReport> {
  let expiredSessions = 0;
  let oldActivityLogs = 0;
  let staleRejectedDeposits = 0;
  let disabledOldAnnouncements = 0;
  let databaseOptimized = false;

  // 1. Purge expired sessions
  try {
    const res = await db.query(
      `DELETE FROM vexo_sessions WHERE expires_at < NOW()`
    );
    expiredSessions = res.rowCount ?? 0;
  } catch (err) {
    console.error("[TRASH_CLEANUP] Error purging expired sessions:", err);
  }

  // 2. Purge admin activity logs older than 90 days
  try {
    const res = await db.query(
      `DELETE FROM vexo_admin_activity WHERE created_at < NOW() - INTERVAL '90 days'`
    );
    oldActivityLogs = res.rowCount ?? 0;
  } catch (err) {
    console.error("[TRASH_CLEANUP] Error purging old activity logs:", err);
  }

  // 3. Purge rejected / cancelled manual deposit slips older than 60 days
  // (We preserve all approved/completed deposits permanently for financial integrity)
  try {
    const res = await db.query(
      `DELETE FROM vexo_deposits 
       WHERE status IN ('rejected', 'cancelled') 
         AND created_at < NOW() - INTERVAL '60 days'`
    );
    staleRejectedDeposits = res.rowCount ?? 0;
  } catch (err) {
    console.error("[TRASH_CLEANUP] Error purging stale deposits:", err);
  }

  // 4. Purge disabled announcements updated more than 60 days ago
  try {
    const res = await db.query(
      `DELETE FROM vexo_announcements 
       WHERE enabled = false 
         AND updated_at < NOW() - INTERVAL '60 days'`
    );
    disabledOldAnnouncements = res.rowCount ?? 0;
  } catch (err) {
    console.error("[TRASH_CLEANUP] Error purging disabled announcements:", err);
  }

  // 5. Run ANALYZE to refresh PostgreSQL query planner statistics and optimize table access
  try {
    await db.query(`ANALYZE vexo_sessions, vexo_admin_activity, vexo_deposits, vexo_orders, vexo_users`);
    databaseOptimized = true;
  } catch (err) {
    console.warn("[TRASH_CLEANUP] ANALYZE warning (can be non-fatal on restricted pools):", err);
  }

  const totalPurged =
    expiredSessions +
    oldActivityLogs +
    staleRejectedDeposits +
    disabledOldAnnouncements;

  return {
    success: true,
    timestamp: new Date().toISOString(),
    purged: {
      expiredSessions,
      oldActivityLogs,
      staleRejectedDeposits,
      disabledOldAnnouncements,
    },
    totalPurged,
    databaseOptimized,
    message: `System cleanup completed successfully: purged ${totalPurged} stale record(s) and optimized database tables.`,
  };
}

export async function GET(request: Request) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized. Provide valid CRON_SECRET or run from localhost/admin session.",
      },
      { status: 401 }
    );
  }

  try {
    const report = await runTrashCleanup();
    return NextResponse.json(report);
  } catch (error) {
    console.error("VEXO TRASH CLEANUP ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Trash cleanup failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
