import { NextResponse } from "next/server";
import crypto from "crypto";
import { getRequestUser } from "@/lib/request-user";
import { db, ensureDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

const USD_TO_PKR_RATE = 278.0;
const MIN_WITHDRAWAL_USD = 3.0;
const MIN_WITHDRAWAL_PKR = MIN_WITHDRAWAL_USD * USD_TO_PKR_RATE; // 834 PKR

export async function GET() {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    await ensureDatabase();

    const userResult = await db.query(
      `SELECT id, referral_code, COALESCE(referral_balance_pkr, 0) AS referral_balance_pkr 
       FROM vexo_users WHERE id = $1 LIMIT 1`,
      [user.id]
    );

    let referralCode = userResult.rows[0]?.referral_code;
    const availableBalancePkr = Number(userResult.rows[0]?.referral_balance_pkr || 0);

    // If user has no referral code yet, generate one
    if (!referralCode) {
      referralCode = "VX" + crypto.randomBytes(4).toString("hex").toUpperCase();
      await db.query(
        `UPDATE vexo_users SET referral_code = $1 WHERE id = $2`,
        [referralCode, user.id]
      );
    }

    // Get total lifetime commission earned
    const earningsResult = await db.query(
      `SELECT COALESCE(SUM(commission_pkr), 0) AS total_earned
       FROM vexo_referral_earnings
       WHERE referrer_id = $1`,
      [user.id]
    );

    const totalCommission = Number(earningsResult.rows[0]?.total_earned || 0);

    // Get referred friends list and their order count
    const friendsResult = await db.query(
      `SELECT 
         u.id AS friend_id,
         u.name,
         u.email,
         u.created_at AS joined_at,
         COUNT(e.id) AS orders_count,
         COALESCE(SUM(e.commission_pkr), 0) AS commission_earned
       FROM vexo_users u
       LEFT JOIN vexo_referral_earnings e 
         ON e.referee_id = u.id AND e.referrer_id = $1
       WHERE u.referred_by = $1
       GROUP BY u.id, u.name, u.email, u.created_at
       ORDER BY u.created_at DESC
       LIMIT 100`,
      [user.id]
    );

    const friends = friendsResult.rows.map((row) => {
      const email = String(row.email || "");
      const atIndex = email.indexOf("@");
      const maskedEmail =
        atIndex > 2
          ? `${email.slice(0, 2)}***${email.slice(atIndex)}`
          : email;

      return {
        id: String(row.friend_id),
        name: row.name,
        email: maskedEmail,
        joinedAt: row.joined_at,
        ordersCount: Number(row.orders_count || 0),
        commissionEarned: Number(row.commission_earned || 0),
      };
    });

    // Get withdrawal requests
    const withdrawalsResult = await db.query(
      `SELECT id, amount_pkr, amount_usd, method, account_number, account_title, status, created_at, rejection_reason
       FROM vexo_referral_withdrawals
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [user.id]
    );

    const withdrawals = withdrawalsResult.rows.map((row) => ({
      id: String(row.id),
      amountPkr: Number(row.amount_pkr),
      amountUsd: Number(row.amount_usd),
      method: row.method,
      accountNumber: row.account_number,
      accountTitle: row.account_title,
      status: row.status,
      createdAt: row.created_at,
      rejectionReason: row.rejection_reason,
    }));

    return NextResponse.json({
      success: true,
      referralCode,
      commissionRate: 5, // 5% commission
      totalInvited: friends.length,
      totalCommission,
      availableReferralBalancePkr: availableBalancePkr,
      availableReferralBalanceUsd: Number((availableBalancePkr / USD_TO_PKR_RATE).toFixed(2)),
      minWithdrawalUsd: MIN_WITHDRAWAL_USD,
      minWithdrawalPkr: MIN_WITHDRAWAL_PKR,
      usdToPkrRate: USD_TO_PKR_RATE,
      friends,
      withdrawals,
    });
  } catch (error) {
    console.error("VEXO REFERRAL API ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load referral details.",
      },
      { status: 500 }
    );
  }
}
