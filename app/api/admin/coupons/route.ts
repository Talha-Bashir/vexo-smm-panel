import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-guard";
import {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "@/lib/coupons";

export const dynamic = "force-dynamic";

async function guard() {
  const auth = await requireAdminPermission("users");
  if (!auth.authorized) return { error: auth.response! };
  return { user: auth.user! };
}

export async function GET() {
  try {
    const g = await guard();
    if (g.error) return g.error;

    const data = await listCoupons();
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to load coupons." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const g = await guard();
    if (g.error) return g.error;

    const body = await req.json().catch(() => ({}));
    const code = String(body.code || "").trim();
    const prizePkr = Number(body.prizePkr);
    const rewardType = body.rewardType === "real" ? "real" : "bonus";
    const maxUses = body.maxUses ? Number(body.maxUses) : null;
    const perUserLimit = body.perUserLimit ? Number(body.perUserLimit) : 1;
    const expiresAt = body.expiresAt ? String(body.expiresAt) : null;
    const description = body.description ? String(body.description) : undefined;

    if (!code) {
      return NextResponse.json({ success: false, error: "Coupon code is required." }, { status: 400 });
    }
    if (!Number.isFinite(prizePkr) || prizePkr <= 0) {
      return NextResponse.json(
        { success: false, error: "Prize amount must be a positive number in PKR." },
        { status: 400 }
      );
    }

    const isWelcomeOnly = body.isWelcomeOnly !== undefined ? Boolean(body.isWelcomeOnly) : undefined;

    const coupon = await createCoupon({
      code,
      prizePkr,
      rewardType,
      maxUses,
      perUserLimit,
      isWelcomeOnly,
      expiresAt,
      description,
      createdBy: g.user ? Number(g.user.id) : undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Coupon "${coupon.code}" created successfully with prize ₨${coupon.prize_pkr.toLocaleString()}!`,
      coupon,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to create coupon." },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const g = await guard();
    if (g.error) return g.error;

    const body = await req.json().catch(() => ({}));
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json({ success: false, error: "Coupon ID is required." }, { status: 400 });
    }

    const updated = await updateCoupon(id, {
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      prizePkr: body.prizePkr !== undefined ? Number(body.prizePkr) : undefined,
      maxUses: body.maxUses !== undefined ? (body.maxUses ? Number(body.maxUses) : null) : undefined,
      perUserLimit: body.perUserLimit !== undefined ? Number(body.perUserLimit) : undefined,
      isWelcomeOnly: body.isWelcomeOnly !== undefined ? Boolean(body.isWelcomeOnly) : undefined,
      expiresAt: body.expiresAt !== undefined ? (body.expiresAt ? String(body.expiresAt) : null) : undefined,
      description: body.description !== undefined ? String(body.description) : undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Coupon updated successfully.",
      coupon: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to update coupon." },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const g = await guard();
    if (g.error) return g.error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim() || "";
    if (!id) {
      return NextResponse.json({ success: false, error: "Coupon ID is required." }, { status: 400 });
    }

    const ok = await deleteCoupon(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Coupon not found or already deleted." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Coupon deleted successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to delete coupon." },
      { status: 500 }
    );
  }
}
