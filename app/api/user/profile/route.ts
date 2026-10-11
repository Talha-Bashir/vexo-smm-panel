import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { db } from "@/lib/db";
import { syncBrevoContact } from "@/lib/brevo";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const whatsapp = String(body.whatsapp || "").trim();

    await db.query(
      `UPDATE vexo_users SET whatsapp = $1 WHERE id = $2`,
      [whatsapp, user.id]
    );

    // If WhatsApp number provided, sync to Brevo contact attribute WHATSAPP
    if (whatsapp) {
      syncBrevoContact({
        email: user.email,
        name: user.name,
        whatsappPhone: whatsapp,
      }).catch((e) => console.warn("[Profile] Brevo contact sync warning:", e));
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      whatsapp,
    });
  } catch (err) {
    console.error("[Profile Update Error]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update profile." },
      { status: 500 }
    );
  }
}
