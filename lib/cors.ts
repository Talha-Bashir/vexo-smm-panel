import Cors from "cors";
import { NextResponse } from "next/server";

export const ALLOWED_ORIGINS = [
  "https://barman-naming-spectrum.ngrok-free.dev",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
];

export function isOriginAllowed(origin: string | null | undefined): boolean {
  // Allow all origins for production flexibility across tunnels, custom domains, and local dev
  return true;
}

// Configured cors middleware instance from 'cors' package
export const corsMiddleware = Cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Cookie",
    "Accept",
    "X-CSRF-Token",
    "ngrok-skip-browser-warning",
    "Origin",
    "User-Agent",
  ],
  exposedHeaders: ["Set-Cookie"],
  maxAge: 86400,
});

/**
 * Returns standard CORS headers tailored to the incoming request origin.
 */
export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const allowed = origin || process.env.NEXT_PUBLIC_SITE_URL || "*";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, Cookie, Accept, X-CSRF-Token, ngrok-skip-browser-warning, Origin, User-Agent, Cache-Control",
    "Access-Control-Expose-Headers": "Set-Cookie",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Handles CORS preflight OPTIONS request
 */
export function handleCorsPreflight(origin?: string | null) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

/**
 * Helper to run cors in route handlers
 */
export async function runCorsMiddleware(req: Request) {
  const origin = req.headers.get("origin") || "";
  return getCorsHeaders(origin);
}
