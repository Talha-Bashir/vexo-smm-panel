import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { joinEventAndClaim } from "@/lib/events";
import { getUserWallet } from "@/lib/wallet";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser().catch(() => null);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: "Please sign in or create an account to join the event and claim rewards.",
      }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const eventId = body.eventId;

    if (!eventId) {
      return NextResponse.json({
        success: false,
        error: "Event ID is required.",
      }, { status: 400 });
    }

    const result = await joinEventAndClaim(eventId, user.id, user.name);
    const updatedWallet = await getUserWallet(user.id);

    return NextResponse.json({
      success: true,
      result,
      newBalancePkr: updatedWallet.balancePkr,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to join event",
    }, { status: 400 });
  }
}
