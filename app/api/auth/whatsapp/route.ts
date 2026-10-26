import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { getRequestUser } from "@/lib/request-user";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request.headers.get("origin"));
}

function normalizeWhatsapp(raw: string) {
  return String(raw || "").replace(/[\s-]/g, "").trim();
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Please log in." }, { status: 401, headers: corsHeaders });
    }
    const body = await request.json().catch(() => ({}));
    await ensureDatabase();
    if (body.skip) {
      await db.query(`UPDATE vexo_users SET whatsapp_prompted = TRUE WHERE id = $1`, [user.id]);
      return NextResponse.json({ success: true, skipped: true }, { headers: corsHeaders });
    }
    const whatsapp = normalizeWhatsapp(body.whatsapp);
    if (!/^\+?[0-9]{7,15}$/.test(whatsapp)) {
      return NextResponse.json({ success: false, error: "Enter a valid WhatsApp number." }, { status: 400, headers: corsHeaders });
    }
    await db.query(`UPDATE vexo_users SET whatsapp = $1, whatsapp_prompted = TRUE WHERE id = $2`, [whatsapp, user.id]);
    return NextResponse.json({ success: true, whatsapp }, { headers: corsHeaders });
  } catch (error) {
    console.error("VEXO WHATSAPP SAVE ERROR:", error);
    return NextResponse.json({ success: false, error: "Unable to save WhatsApp number." }, { status: 500, headers: corsHeaders });
  }
}
