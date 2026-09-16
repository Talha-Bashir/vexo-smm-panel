import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders } from "@/lib/cors";

export function proxy(request: NextRequest) {
  const p = request.nextUrl.pathname;
  const origin = request.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const hasSession = Boolean(request.cookies.get("vexo_session")?.value);

  // If already logged in and visiting login / signup / forgot-password, redirect to dashboard
  if ((p === "/login" || p === "/signup" || p === "/forgot-password") && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If accessing dashboard without session in production, redirect to login
  if (p.startsWith("/dashboard") && !hasSession && process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If accessing admin without session, redirect to login
  if (p.startsWith("/admin") && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();

  // Attach CORS headers to all API responses
  if (p.startsWith("/api/")) {
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/dashboard",
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/admin",
    "/admin/:path*",
    "/api/:path*",
  ],
};
