import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-guard";
import { sendVerificationEmail } from "@/lib/email";
import { generateSecureRandomCode } from "@/lib/email-verification";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await requireAdminPermission("settings");
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const testTo = String(body.to || "").trim() || auth.user.email;

    if (!testTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTo)) {
      return NextResponse.json({ success: false, error: "Invalid recipient email address." }, { status: 400 });
    }

    const sampleCode = generateSecureRandomCode();

    const result = await sendVerificationEmail({
      to: testTo,
      recipientName: auth.user.name || "VEXARO Admin",
      code: sampleCode,
      type: "signup",
    });

    if (!result.ok) {
      return NextResponse.json({
        success: false,
        error: result.error || "Email delivery failed.",
        isSandboxRestricted: result.isSandboxRestricted,
        sampleCode,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Test email successfully delivered to ${testTo}!`,
      provider: result.provider,
      sampleCode,
    });
  } catch (err: any) {
    console.error("TEST EMAIL ERROR:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to test email delivery." },
      { status: 500 }
    );
  }
}
