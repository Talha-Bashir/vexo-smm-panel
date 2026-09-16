import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-guard";
import { ensureWalletSchema } from "@/lib/wallet";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdminPermission("deposits");
    if (!auth.authorized) return auth.response!;

    await ensureWalletSchema();
    const result = await db.query(`
      SELECT d.id, d.user_id, u.name, u.email, d.method, d.amount_pkr,
             d.transaction_id, d.screenshot, d.status, d.created_at, d.reviewed_at,
             d.rejection_reason
      FROM vexo_deposits d
      JOIN vexo_users u ON u.id = d.user_id
      ORDER BY CASE WHEN d.status = 'Pending' THEN 0 ELSE 1 END, d.created_at DESC
      LIMIT 200
    `);

    return NextResponse.json({
      success: true,
      deposits: result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        email: row.email,
        method: row.method,
        amount: Number(row.amount_pkr),
        transactionId: row.transaction_id,
        screenshot: row.screenshot,
        status: row.status,
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at,
        rejectionReason: row.rejection_reason,
      })),
    });
  } catch (error) {
    console.error("VEXO ADMIN DEPOSITS GET ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to load deposits." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const client = await db.connect();
  try {
    const auth = await requireAdminPermission("deposits");
    if (!auth.authorized) return auth.response!;
    const admin = auth.user!;

    const body = await request.json();
    const depositId = String(body?.depositId ?? "").trim();
    const action = String(body?.action ?? "").trim().toLowerCase();
    const rejectionReason = String(body?.rejectionReason ?? "").trim();

    if (!depositId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid deposit action." }, { status: 400 });
    }

    await ensureWalletSchema();
    await client.query("BEGIN");

    const depositResult = await client.query(
      `SELECT id, user_id, amount_pkr, status
       FROM vexo_deposits
       WHERE id = $1
       FOR UPDATE`,
      [depositId]
    );

    const deposit = depositResult.rows[0];
    if (!deposit) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Deposit not found." }, { status: 404 });
    }

    if (deposit.status !== "Pending") {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: `Deposit is already ${deposit.status.toLowerCase()}.` }, { status: 409 });
    }

    if (action === "approve") {
      await client.query(
        `INSERT INTO vexo_wallets (user_id, balance_pkr)
         VALUES ($1, $2)
         ON CONFLICT (user_id)
         DO UPDATE SET balance_pkr = vexo_wallets.balance_pkr + EXCLUDED.balance_pkr,
                       updated_at = NOW()`,
        [deposit.user_id, deposit.amount_pkr]
      );

      await client.query(
        `INSERT INTO vexo_wallet_transactions
          (user_id, type, amount_pkr, reference_type, reference_id, description)
         VALUES ($1, 'Credit', $2, 'deposit', $3, $4)
         ON CONFLICT (reference_type, reference_id) DO NOTHING`,
        [deposit.user_id, deposit.amount_pkr, String(deposit.id), `Deposit ${deposit.id} approved by admin`]
      );

      await client.query(
        `UPDATE vexo_deposits
         SET status = 'Approved', reviewed_at = NOW(), reviewed_by = $2, rejection_reason = NULL, screenshot = NULL
         WHERE id = $1`,
        [deposit.id, Number(admin.id)]
      );
    } else {
      await client.query(
        `UPDATE vexo_deposits
         SET status = 'Rejected', reviewed_at = NOW(), reviewed_by = $2, rejection_reason = $3, screenshot = NULL
         WHERE id = $1`,
        [deposit.id, Number(admin.id), rejectionReason || "Payment could not be verified."]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      status: action === "approve" ? "Approved" : "Rejected",
      message: action === "approve" ? "Deposit approved and wallet credited." : "Deposit rejected.",
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("VEXO ADMIN DEPOSIT ACTION ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to update deposit." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
