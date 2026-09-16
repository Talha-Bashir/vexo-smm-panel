import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { ensureWalletSchema } from "@/lib/wallet";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const METHODS = new Set(["SadaPay", "Easypaisa", "JazzCash", "Bank Transfer"]);

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const method = String(body?.method ?? "").trim();
    const amount = Number(body?.amount);
    const transactionId = String(body?.transactionId ?? "").trim();
    const screenshot = typeof body?.screenshot === "string" ? body.screenshot.trim() : null;

    if (!METHODS.has(method)) {
      return NextResponse.json({ success: false, error: "Invalid payment method." }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount < 100 || amount > 500000) {
      return NextResponse.json({ success: false, error: "Deposit must be between ₨100 and ₨500,000." }, { status: 400 });
    }
    if (transactionId.length < 4 || transactionId.length > 120) {
      return NextResponse.json({ success: false, error: "Enter a valid transaction ID/reference." }, { status: 400 });
    }

    // Require payment proof screenshot
    if (!screenshot || !screenshot.startsWith("data:image/")) {
      return NextResponse.json(
        { success: false, error: "Please upload a clear screenshot of your payment receipt." },
        { status: 400 }
      );
    }

    // Prevent oversized payloads (> 5MB in base64)
    if (screenshot.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Screenshot file is too large. Please upload an image under 4MB." },
        { status: 400 }
      );
    }

    await ensureWalletSchema();

    const duplicate = await db.query(
      `SELECT id, status FROM vexo_deposits
       WHERE method = $1 AND transaction_id = $2
       LIMIT 1`,
      [method, transactionId]
    );

    if (duplicate.rows[0]) {
      return NextResponse.json(
        { success: false, error: `This transaction reference has already been submitted (${duplicate.rows[0].status}).` },
        { status: 409 }
      );
    }

    const result = await db.query(
      `INSERT INTO vexo_deposits (user_id, method, amount_pkr, transaction_id, screenshot)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, method, amount_pkr, transaction_id, status, created_at`,
      [Number(user.id), method, Math.round(amount * 100) / 100, transactionId, screenshot]
    );

    const row = result.rows[0];
    return NextResponse.json({
      success: true,
      deposit: {
        id: row.id,
        method: row.method,
        amount: Number(row.amount_pkr),
        transactionId: row.transaction_id,
        status: row.status,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    console.error("VEXO DEPOSIT CREATE ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to submit deposit." },
      { status: 500 }
    );
  }
}
