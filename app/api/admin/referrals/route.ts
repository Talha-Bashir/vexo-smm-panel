import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-guard";
import { ensureAdminSchema, logAdminActivity } from "@/lib/admin";

export const dynamic = "force-dynamic";

async function guard() {
  const auth = await requireAdminPermission("withdrawals");
  if (!auth.authorized) return { error: auth.response! };
  return { user: auth.user! };
}

export async function GET() {
  try {
    const g = await guard();
    if (g.error) return g.error;
    await ensureAdminSchema();

    const r = await db.query(`
      SELECT w.id, w.user_id, u.name, u.email, w.amount_pkr, w.amount_usd,
             w.method, w.account_number, w.account_title, w.status,
             w.created_at, w.reviewed_at, w.rejection_reason
      FROM vexo_referral_withdrawals w
      JOIN vexo_users u ON u.id = w.user_id
      ORDER BY CASE WHEN w.status = 'Pending' THEN 0 ELSE 1 END, w.created_at DESC
      LIMIT 200
    `);

    return NextResponse.json({
      success: true,
      withdrawals: r.rows.map((x) => ({
        id: String(x.id),
        userId: x.user_id,
        name: x.name,
        email: x.email,
        amountPkr: Number(x.amount_pkr),
        amountUsd: Number(x.amount_usd),
        method: x.method,
        accountNumber: x.account_number,
        accountTitle: x.account_title,
        status: x.status,
        createdAt: x.created_at,
        reviewedAt: x.reviewed_at,
        rejectionReason: x.rejection_reason,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unable to load referral withdrawals." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const client = await db.connect();
  try {
    const g = await guard();
    if (g.error) return g.error;
    await ensureAdminSchema();

    const b = await req.json();
    const withdrawalId = String(b?.withdrawalId || "").trim();
    const action = String(b?.action || "").trim().toLowerCase();
    const rejectionReason = String(b?.rejectionReason || "").trim();

    if (!withdrawalId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid withdrawal action." }, { status: 400 });
    }

    await client.query("BEGIN");

    const withdrawalRes = await client.query(
      `SELECT id, user_id, amount_pkr, status
       FROM vexo_referral_withdrawals
       WHERE id = $1
       FOR UPDATE`,
      [withdrawalId]
    );

    const withdrawal = withdrawalRes.rows[0];
    if (!withdrawal) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Withdrawal not found." }, { status: 404 });
    }

    if (withdrawal.status !== "Pending") {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: `Withdrawal is already ${withdrawal.status}.` }, { status: 409 });
    }

    if (action === "approve") {
      await client.query(
        `UPDATE vexo_referral_withdrawals
         SET status = 'Paid', reviewed_at = NOW(), rejection_reason = NULL
         WHERE id = $1`,
        [withdrawal.id]
      );
    } else {
      // Refund referral balance back to the user
      await client.query(
        `UPDATE vexo_users
         SET referral_balance_pkr = referral_balance_pkr + $1
         WHERE id = $2`,
        [withdrawal.amount_pkr, withdrawal.user_id]
      );

      await client.query(
        `UPDATE vexo_referral_withdrawals
         SET status = 'Rejected', reviewed_at = NOW(), rejection_reason = $2
         WHERE id = $1`,
        [withdrawal.id, rejectionReason || "Withdrawal rejected by admin."]
      );
    }

    await client.query("COMMIT");
    await logAdminActivity(+g.user!.id, "referral_withdrawal_" + action, "referral_withdrawal", withdrawalId, { action });

    return NextResponse.json({
      success: true,
      status: action === "approve" ? "Paid" : "Rejected",
      message: action === "approve" ? "Referral payout marked as Paid." : "Withdrawal rejected and balance returned.",
    });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Failed to update withdrawal." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
