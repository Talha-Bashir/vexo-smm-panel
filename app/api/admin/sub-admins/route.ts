import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-guard";
import { hashPassword } from "@/lib/auth";
import { logAdminActivity } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdminPermission("sub_admins");
    if (!auth.authorized || !auth.user) {
      return auth.response || NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    await ensureDatabase();
    const result = await db.query(`
      SELECT id, name, email, role, permissions, is_active, created_at
      FROM vexo_users
      WHERE role = 'sub_admin'
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      subAdmins: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        permissions: row.permissions || {},
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    console.error("Failed to list sub-admins:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sub-admins." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminPermission("sub_admins");
    if (!auth.authorized || !auth.user) {
      return auth.response || NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");
    const permissions = typeof body.permissions === "object" && body.permissions !== null ? body.permissions : {};

    if (!name || name.length < 2) {
      return NextResponse.json({ success: false, error: "Name must be at least 2 characters." }, { status: 400 });
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "A valid email address is required." }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters." }, { status: 400 });
    }

    await ensureDatabase();

    // Check if user already exists
    const existing = await db.query(`SELECT id, role FROM vexo_users WHERE email = $1 LIMIT 1`, [email]);
    if (existing.rows[0]) {
      return NextResponse.json(
        { success: false, error: "A user or sub-admin with this email already exists." },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);

    const insertRes = await db.query(
      `INSERT INTO vexo_users (name, email, password_hash, role, permissions, is_active, created_by)
       VALUES ($1, $2, $3, 'sub_admin', $4::jsonb, true, $5)
       RETURNING id, name, email, role, permissions, is_active, created_at`,
      [name, email, passwordHash, JSON.stringify(permissions), auth.user.id]
    );

    const newSubAdmin = insertRes.rows[0];

    await logAdminActivity(
      auth.user.id,
      "CREATE_SUB_ADMIN",
      "user",
      String(newSubAdmin.id),
      { email, permissions }
    );

    return NextResponse.json({
      success: true,
      message: `Sub-Admin account for ${name} created successfully.`,
      subAdmin: {
        id: newSubAdmin.id,
        name: newSubAdmin.name,
        email: newSubAdmin.email,
        role: newSubAdmin.role,
        permissions: newSubAdmin.permissions || {},
        isActive: Boolean(newSubAdmin.is_active),
        createdAt: newSubAdmin.created_at,
      },
    });
  } catch (err) {
    console.error("Failed to create sub-admin:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create sub-admin account." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAdminPermission("sub_admins");
    if (!auth.authorized || !auth.user) {
      return auth.response || NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json({ success: false, error: "Sub-Admin ID is required." }, { status: 400 });
    }

    const subAdminId = Number(body.id);
    if (!Number.isInteger(subAdminId) || subAdminId <= 0) {
      return NextResponse.json({ success: false, error: "Invalid Sub-Admin ID." }, { status: 400 });
    }

    await ensureDatabase();

    // Verify target is indeed a sub_admin
    const checkRes = await db.query(`SELECT id, email, role FROM vexo_users WHERE id = $1 LIMIT 1`, [subAdminId]);
    const target = checkRes.rows[0];
    if (!target || target.role !== "sub_admin") {
      return NextResponse.json({ success: false, error: "Target sub-admin not found." }, { status: 404 });
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let pIdx = 1;

    // 1. Update Permissions
    if (body.permissions && typeof body.permissions === "object") {
      updates.push(`permissions = $${pIdx}`);
      values.push(JSON.stringify(body.permissions));
      pIdx++;
    }

    // 2. Update Active / Suspended Status
    if (typeof body.isActive === "boolean") {
      updates.push(`is_active = $${pIdx}`);
      values.push(body.isActive);
      pIdx++;

      // If suspended, invalidate all active sessions immediately
      if (!body.isActive) {
        await db.query(`DELETE FROM vexo_sessions WHERE user_id = $1`, [subAdminId]).catch(() => null);
      }
    }

    // 3. Reset Password
    if (typeof body.password === "string" && body.password.length >= 6) {
      updates.push(`password_hash = $${pIdx}`);
      values.push(hashPassword(body.password));
      pIdx++;
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "No update fields provided." }, { status: 400 });
    }

    values.push(subAdminId);
    await db.query(
      `UPDATE vexo_users
       SET ${updates.join(", ")}
       WHERE id = $${pIdx}`,
      values
    );

    await logAdminActivity(
      auth.user.id,
      "UPDATE_SUB_ADMIN",
      "user",
      String(subAdminId),
      { updates: Object.keys(body) }
    );

    return NextResponse.json({
      success: true,
      message: "Sub-Admin updated successfully.",
    });
  } catch (err) {
    console.error("Failed to update sub-admin:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update sub-admin." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAdminPermission("sub_admins");
    if (!auth.authorized || !auth.user) {
      return auth.response || NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    const subAdminId = Number(idParam);

    if (!Number.isInteger(subAdminId) || subAdminId <= 0) {
      return NextResponse.json({ success: false, error: "Invalid Sub-Admin ID." }, { status: 400 });
    }

    await ensureDatabase();

    // Verify target is indeed a sub_admin
    const checkRes = await db.query(`SELECT id, email, role FROM vexo_users WHERE id = $1 LIMIT 1`, [subAdminId]);
    const target = checkRes.rows[0];
    if (!target || target.role !== "sub_admin") {
      return NextResponse.json({ success: false, error: "Target sub-admin not found." }, { status: 404 });
    }

    // Terminate all sessions
    await db.query(`DELETE FROM vexo_sessions WHERE user_id = $1`, [subAdminId]).catch(() => null);

    // Delete sub-admin user record
    await db.query(`DELETE FROM vexo_users WHERE id = $1 AND role = 'sub_admin'`, [subAdminId]);

    await logAdminActivity(
      auth.user.id,
      "DELETE_SUB_ADMIN",
      "user",
      String(subAdminId),
      { email: target.email }
    );

    return NextResponse.json({
      success: true,
      message: "Sub-Admin removed successfully.",
    });
  } catch (err) {
    console.error("Failed to delete sub-admin:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete sub-admin." },
      { status: 500 }
    );
  }
}
