import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { db, ensureDatabase } from "@/lib/db";
import { ensureWalletSchema } from "@/lib/wallet";

export const dynamic = "force-dynamic";

const USD_TO_PKR_RATE = 278.0;
const MIN_WITHDRAWAL_PKR = 3.0 * USD_TO_PKR_RATE; // 834 PKR ($3.00)

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    await ensureDatabase();
    await ensureWalletSchema();

    const body = await request.json().catch(() => ({}));
    const amountPkr = Number(body.amountPkr);
    const method = String(body.method || "").trim();
    const accountNumber = String(body.accountNumber || "").trim();
    const accountTitle = String(body.accountTitle || "").trim();

    if (!Number.isFinite(amountPkr) || amountPkr < MIN_WITHDRAWAL_PKR) {
      return NextResponse.json(
        {
          success: false,
          error: `Minimum withdrawal amount is $3.00 (₨${MIN_WITHDRAWAL_PKR.toFixed(2)} PKR).`,
        },
        { status: 400 }
      );
    }

    const validMethods = [
      "Easypaisa",
      "JazzCash",
      "Bank Transfer",
      "Nayapay",
      "Sadapay",
      "VEXARO Wallet",
      "VEXO Wallet",
    ];

    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { success: false, error: "Please select a valid payout method." },
        { status: 400 }
      );
    }

    const isWalletTransfer = method === "VEXARO Wallet" || method === "VEXO Wallet";

    if (!isWalletTransfer) {
      if (!accountNumber || accountNumber.length < 8) {
        return NextResponse.json(
          { success: false, error: "Please provide a valid account or mobile number." },
          { status: 400 }
        );
      }
      if (!accountTitle || accountTitle.length < 3) {
        return NextResponse.json(
          { success: false, error: "Please provide the account title/holder name." },
          { status: 400 }
        );
      }
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const userResult = await client.query(
        `SELECT referral_balance_pkr FROM vexo_users WHERE id = $1 FOR UPDATE`,
        [user.id]
      );

      const currentBalance = Number(userResult.rows[0]?.referral_balance_pkr || 0);

      if (currentBalance + 0.00001 < amountPkr) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient referral balance. Available: ₨${currentBalance.toFixed(2)}.`,
          },
          { status: 400 }
        );
      }

      // Deduct from referral balance
      await client.query(
        `UPDATE vexo_users 
         SET referral_balance_pkr = referral_balance_pkr - $1 
         WHERE id = $2`,
        [amountPkr, user.id]
      );

      const amountUsd = Number((amountPkr / USD_TO_PKR_RATE).toFixed(2));

      if (isWalletTransfer) {
        // Instant credit to main order wallet
        await client.query(
          `INSERT INTO vexo_wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
          [user.id]
        );
        await client.query(
          `UPDATE vexo_wallets 
           SET balance_pkr = balance_pkr + $1, updated_at = NOW() 
           WHERE user_id = $2`,
          [amountPkr, user.id]
        );

        const withdrawalResult = await client.query(
          `INSERT INTO vexo_referral_withdrawals 
             (user_id, amount_pkr, amount_usd, method, account_number, account_title, status)
           VALUES ($1, $2, $3, 'VEXARO Wallet', $4, $5, 'Transferred to Wallet')
           RETURNING id`,
          [user.id, amountPkr, amountUsd, `Wallet #${user.id}`, user.name || "Internal Transfer"]
        );

        await client.query(
          `INSERT INTO vexo_wallet_transactions
             (user_id, type, amount_pkr, reference_type, reference_id, description)
           VALUES ($1, 'Credit', $2, 'referral_payout', $3, $4)`,
          [
            user.id,
            amountPkr,
            withdrawalResult.rows[0].id,
            `Referral commission transferred to main VEXARO wallet balance`,
          ]
        );

        await client.query("COMMIT");

        return NextResponse.json({
          success: true,
          message: `₨${amountPkr.toFixed(2)} ($${amountUsd}) has been instantly credited to your VEXARO wallet balance!`,
          status: "Transferred to Wallet",
        });
      } else {
        // Record as Pending payout for Easypaisa, JazzCash, or Bank
        const withdrawalResult = await client.query(
          `INSERT INTO vexo_referral_withdrawals 
             (user_id, amount_pkr, amount_usd, method, account_number, account_title, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
           RETURNING id, amount_pkr, amount_usd, method, status, created_at`,
          [user.id, amountPkr, amountUsd, method, accountNumber, accountTitle]
        );

        await client.query("COMMIT");

        return NextResponse.json({
          success: true,
          message: `Withdrawal request for ₨${amountPkr.toFixed(2)} ($${amountUsd}) submitted successfully! Payout will be sent to your ${method} account.`,
          withdrawal: withdrawalResult.rows[0],
          status: "Pending",
        });
      }
    } catch (txError) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("VEXO REFERRAL WITHDRAW ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit withdrawal request.",
      },
      { status: 500 }
    );
  }
}
