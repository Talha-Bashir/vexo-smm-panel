import { NextResponse } from "next/server";
import { syncAllProvidersAndRoute } from "@/lib/routing-engine";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

async function isAuthorized(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret")?.trim();

  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (cronSecret && (bearerToken === cronSecret || querySecret === cronSecret)) {
    return true;
  }

  const host = request.headers.get("host") || "";
  if (process.env.NODE_ENV !== "production" && (host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host === "localhost")) {
    return true;
  }

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
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Provide valid CRON_SECRET or run from localhost/admin session." },
      { status: 401 }
    );
  }

  try {
    const stats = await syncAllProvidersAndRoute();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...stats,
    });
  } catch (err) {
    console.error("VEXO PROVIDER SYNC ERROR:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Provider synchronization failed.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
