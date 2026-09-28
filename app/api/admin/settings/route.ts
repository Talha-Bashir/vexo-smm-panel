import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-guard";
import { getAllPlatformSettings, setPlatformSetting, logAdminActivity } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdminPermission();
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getAllPlatformSettings();
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (err) {
    console.error("GET /api/admin/settings error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load platform settings." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminPermission("sub_admins");
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const allowedKeys = [
      "platform_theme",
      "global_profit_margin",
      "dollar_order_markup",
      "usd_to_pkr",
      "sadapay_number",
      "sadapay_title",
      "binance_uid",
      "binance_name",
      "binance_usdt_address",
      "binance_network",
    ];

    const updated: Record<string, string> = {};

    for (const key of allowedKeys) {
      if (body[key] !== undefined && typeof body[key] === "string") {
        const val = body[key].trim();
        await setPlatformSetting(key, val, auth.user.id);
        updated[key] = val;
      }
    }

    await logAdminActivity(
      auth.user.id,
      "update_platform_settings",
      "platform_settings",
      "global",
      updated
    );

    const allSettings = await getAllPlatformSettings();

    return NextResponse.json({
      success: true,
      message: "Platform settings updated successfully.",
      settings: allSettings,
    });
  } catch (err) {
    console.error("POST /api/admin/settings error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update platform settings." },
      { status: 500 }
    );
  }
}
