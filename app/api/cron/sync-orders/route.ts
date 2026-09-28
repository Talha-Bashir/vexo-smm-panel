import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { syncOrders } from "@/lib/order-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Max allowed serverless duration on Vercel Hobby plan

interface SyncResultDetail {
  orderId: string;
  providerOrderId: string;
  userId: number;
  oldStatus: string;
  newStatus: string;
  remains?: number;
  refundPkr?: number;
  action: "updated" | "partial_refunded" | "cancelled_refunded" | "no_change" | "error";
  error?: string;
}

/**
 * Validates request authorization:
 * - Bearer token matching CRON_SECRET or query param ?secret=CRON_SECRET
 * - OR legitimate Vercel Cron headers (user-agent: vercel-cron or x-vercel-cron-schedule) if CRON_SECRET is not configured
 * - OR request originating from localhost in development
 * - OR request by an authenticated Admin user
 */
async function isAuthorized(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET?.trim().replace(/^["']|["']$/g, "");
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret")?.trim().replace(/^["']|["']$/g, "");

  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim().replace(/^["']|["']$/g, "");

  // 1. If CRON_SECRET is configured in environment, verify exact token match
  if (cronSecret) {
    if (bearerToken === cronSecret || querySecret === cronSecret) {
      return true;
    }
  }

  // 2. Identify legitimate Vercel Cron invocation
  // Vercel Cron automatically sends "User-Agent: vercel-cron/1.0" and "x-vercel-cron-schedule"
  const userAgent = (request.headers.get("user-agent") || "").toLowerCase();
  const hasCronSchedule = request.headers.has("x-vercel-cron-schedule");
  const isVercelCron = userAgent.includes("vercel-cron") || hasCronSchedule;

  // If CRON_SECRET is not configured in Vercel environment variables, allow legitimate Vercel cron calls
  if (!cronSecret && isVercelCron) {
    return true;
  }

  // 3. Allow requests originating from local loopback in development
  const host = request.headers.get("host") || "";
  if (
    process.env.NODE_ENV !== "production" &&
    (host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host === "localhost")
  ) {
    return true;
  }

  // 4. Allow requests by authenticated Admin user (e.g. manual trigger from admin dashboard)
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

async function runOrderSync() {
  return syncOrders({ limit: 50, minAgeSeconds: 0 });
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
    const result = await runOrderSync();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[CRON_SYNC_FATAL_ERROR]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cron execution encountered an unhandled error",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
