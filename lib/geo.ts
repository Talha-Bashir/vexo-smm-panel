import { db } from "@/lib/db";

export interface ClientGeoInfo {
  ip: string;
  country: string | null;
  city: string | null;
  userAgent: string | null;
}

export function extractClientInfo(request: Request | Headers): ClientGeoInfo {
  const headers = request instanceof Headers ? request : request.headers;

  const forwarded = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const clientIp = headers.get("x-client-ip");
  
  let ip = clientIp || (forwarded ? forwarded.split(",")[0].trim() : realIp) || "127.0.0.1";
  if (ip === "::1") ip = "127.0.0.1";

  const country =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-client-country") ||
    null;

  const city =
    headers.get("x-vercel-ip-city") ||
    headers.get("x-client-city") ||
    null;

  const userAgent = headers.get("user-agent") || null;

  return { ip, country, city, userAgent };
}

export async function recordVisit(params: {
  userId?: number | null;
  userEmail?: string | null;
  request: Request | Headers;
  path?: string;
  method?: string;
}) {
  try {
    const geo = extractClientInfo(params.request);

    // 1. Insert into visitor logs table
    await db.query(
      `INSERT INTO vexo_visitor_logs (user_id, user_email, ip_address, country, city, path, method, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        params.userId || null,
        params.userEmail || null,
        geo.ip,
        geo.country,
        geo.city,
        params.path || "/",
        params.method || "GET",
        geo.userAgent,
      ]
    );

    // 2. If user is logged in, update their profile location & last active time
    if (params.userId) {
      await db.query(
        `UPDATE vexo_users
         SET last_ip = $1,
             last_country = COALESCE($2, last_country),
             last_city = COALESCE($3, last_city),
             last_active_at = NOW()
         WHERE id = $4`,
        [geo.ip, geo.country, geo.city, params.userId]
      );
    }
  } catch (err) {
    // Non-blocking: background logging should never fail a user request
    console.warn("[VEXO GEO LOG ERROR]:", err instanceof Error ? err.message : err);
  }
}
