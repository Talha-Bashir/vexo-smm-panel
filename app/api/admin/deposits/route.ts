import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-guard";
import { ensureWalletSchema, calculateDepositBonus } from "@/lib/wallet";
import { getPlatformSetting } from "@/lib/admin";
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
             d.rejection_reason, COALESCE(d.bonus_pkr, 0) AS bonus_pkr
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
        bonusPkr: Number(row.bonus_pkr || 0),
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
      const depositBonusSetting = await getPlatformSetting("deposit_bonus_percentage", "tiered");
      const depositAmountPkr = Number(deposit.amount_pkr);

      let ratePercent = 5;
      let bonusPkr = 0;

      if (body?.bonusPercent !== undefined && Number.isFinite(Number(body.bonusPercent)) && Number(body.bonusPercent) >= 0) {
        ratePercent = Number(body.bonusPercent);
        bonusPkr = Math.round(((depositAmountPkr * ratePercent) / 100) * 100) / 100;
      } else if (body?.bonusAmount !== undefined && Number.isFinite(Number(body.bonusAmount)) && Number(body.bonusAmount) >= 0) {
        bonusPkr = Math.round(Number(body.bonusAmount) * 100) / 100;
        ratePercent = depositAmountPkr > 0 ? Math.round((bonusPkr / depositAmountPkr) * 100) : 0;
      } else {
        const calc = calculateDepositBonus(depositAmountPkr, depositBonusSetting);
        ratePercent = calc.ratePercent;
        bonusPkr = calc.bonusPkr;
      }

      await client.query(
        `INSERT INTO vexo_wallets (user_id, balance_pkr, bonus_balance_pkr)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id)
         DO UPDATE SET balance_pkr = vexo_wallets.balance_pkr + EXCLUDED.balance_pkr,
                       bonus_balance_pkr = COALESCE(vexo_wallets.bonus_balance_pkr, 0) + EXCLUDED.bonus_balance_pkr,
                       updated_at = NOW()`,
        [deposit.user_id, deposit.amount_pkr, bonusPkr]
      );

      await client.query(
        `INSERT INTO vexo_wallet_transactions
          (user_id, type, amount_pkr, reference_type, reference_id, description)
         VALUES ($1, 'Credit', $2, 'deposit', $3, $4)
         ON CONFLICT (reference_type, reference_id) DO NOTHING`,
        [deposit.user_id, deposit.amount_pkr, String(deposit.id), `Deposit ${deposit.id} approved by admin`]
      );

      if (bonusPkr > 0) {
        await client.query(
          `INSERT INTO vexo_wallet_transactions
            (user_id, type, amount_pkr, reference_type, reference_id, description)
           VALUES ($1, 'Credit', $2, 'deposit_bonus', $3, $4)
           ON CONFLICT (reference_type, reference_id) DO NOTHING`,
          [
            deposit.user_id,
            bonusPkr,
            `deposit_bonus_${deposit.id}`,
            `🎁 Deposit Bonus (${ratePercent}% bonus on ₨${depositAmountPkr.toLocaleString()} deposit)`,
          ]
        );
      }

      await client.query(
        `UPDATE vexo_deposits
         SET status = 'Approved', bonus_pkr = $3, reviewed_at = NOW(), reviewed_by = $2, rejection_reason = NULL, screenshot = NULL
         WHERE id = $1`,
        [deposit.id, Number(admin.id), bonusPkr]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        status: "Approved",
        bonusPkr,
        ratePercent,
        message: bonusPkr > 0
          ? `Deposit approved! Credited ₨${depositAmountPkr.toLocaleString()} balance + ₨${bonusPkr.toLocaleString()} (${ratePercent}%) promotional bonus.`
          : "Deposit approved and wallet credited.",
      });
    } else {
      await client.query(
        `UPDATE vexo_deposits
         SET status = 'Rejected', reviewed_at = NOW(), reviewed_by = $2, rejection_reason = $3, screenshot = NULL
         WHERE id = $1`,
        [deposit.id, Number(admin.id), rejectionReason || "Payment could not be verified."]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        status: "Rejected",
        message: "Deposit rejected.",
      });
    }
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
