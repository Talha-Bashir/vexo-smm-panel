import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { getUserWallet } from "@/lib/wallet";
import { getAllPlatformSettings } from "@/lib/admin";
import { getLiveForexUsdRate } from "@/lib/exchange-rate";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const [wallet, settings, liveUsdRate, freeTrialClaim] = await Promise.all([
      getUserWallet(Number(user.id)),
      getAllPlatformSettings(),
      getLiveForexUsdRate(),
      db
        .query(
          `SELECT id, service_name, quantity, created_at
           FROM vexo_free_trial_claims
           WHERE user_id = $1
           LIMIT 1`,
          [Number(user.id)]
        )
        .then((res) => res.rows[0] || null)
        .catch(() => null),
    ]);

    return NextResponse.json({
      success: true,
      ...wallet,
      freeTrialClaimed: Boolean(freeTrialClaim),
      freeTrialClaim: freeTrialClaim
        ? {
            id: String(freeTrialClaim.id),
            serviceName: freeTrialClaim.service_name,
            quantity: Number(freeTrialClaim.quantity),
            claimedAt: freeTrialClaim.created_at,
          }
        : null,
      sadaPayNumber: settings.sadapay_number || "03197008275",
      sadaPayTitle: settings.sadapay_title || "Saeed Bashir",
      binanceUid: settings.binance_uid || "1069021883",
      binanceName: settings.binance_name || "Talha Bashir Bhatti",
      binanceUsdtAddress: settings.binance_usdt_address || "0xaa3037450e112ef10406df821803522bc589821c",
      binanceNetwork: settings.binance_network || "BSC BNB Smart Chain (BEP20)",
      liveUsdRate: liveUsdRate,
    });
  } catch (error) {
    console.error("VEXO WALLET GET ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to load wallet." },
      { status: 500 }
    );
  }
}
