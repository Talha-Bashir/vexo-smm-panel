import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { getUserWallet } from "@/lib/wallet";
import { getAllPlatformSettings } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const [wallet, settings] = await Promise.all([
      getUserWallet(Number(user.id)),
      getAllPlatformSettings(),
    ]);

    return NextResponse.json({
      success: true,
      ...wallet,
      sadaPayNumber: settings.sadapay_number || "03197008275",
      sadaPayTitle: settings.sadapay_title || "Saeed Bashir",
    });
  } catch (error) {
    console.error("VEXO WALLET GET ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to load wallet." },
      { status: 500 }
    );
  }
}
