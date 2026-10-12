import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-guard";
import {
  API_SERVICES_CATALOG,
  getAllApiToggles,
  setApiToggle,
  type ApiServiceName,
} from "@/lib/api-manager";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdminPermission("settings");
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const toggles = await getAllApiToggles();

    const services = API_SERVICES_CATALOG.map((item) => ({
      ...item,
      enabled: toggles[item.key] ?? item.defaultEnabled,
    }));

    return NextResponse.json({
      success: true,
      services,
      toggles,
    });
  } catch (err) {
    console.error("[API Toggles GET Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load API toggles" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminPermission("settings");
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const serviceKey = String(body.serviceKey || "").trim() as ApiServiceName;
    const enabled = Boolean(body.enabled);

    const validKeys: ApiServiceName[] = [
      "resend_email",
      "elevatex_bot",
      "telegram_alerts",
      "exchange_rates",
      "smm_dispatch",
    ];

    if (!validKeys.includes(serviceKey)) {
      return NextResponse.json(
        { success: false, error: `Invalid serviceKey: ${serviceKey}` },
        { status: 400 }
      );
    }

    await setApiToggle(serviceKey, enabled, auth.user.id);

    const updatedService = API_SERVICES_CATALOG.find((s) => s.key === serviceKey);

    return NextResponse.json({
      success: true,
      service: {
        ...updatedService,
        enabled,
      },
      message: `API Service '${serviceKey}' is now ${enabled ? "enabled" : "disabled"}.`,
    });
  } catch (err) {
    console.error("[API Toggles POST Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to update API toggle" },
      { status: 500 }
    );
  }
}
