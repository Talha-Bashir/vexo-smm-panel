import { NextResponse } from "next/server";
import { runBalanceMonitoring } from "@/lib/balance-monitor";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

/**
 * Validates request authorization:
 * - Bearer token matching CRON_SECRET or query param ?secret=CRON_SECRET
 * - OR request coming from localhost in development
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

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid cron secret or insufficient permissions" },
      { status: 401 }
    );
  }

  try {
    const summary = await runBalanceMonitoring();
    return NextResponse.json(summary);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error running balance monitoring";
    console.error("[BalanceMonitor] Cron job execution failed:", err);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
