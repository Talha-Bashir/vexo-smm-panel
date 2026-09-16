import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";

export type AdminPermission =
  | "orders"
  | "tickets"
  | "deposits"
  | "services"
  | "announcements"
  | "users"
  | "analytics"
  | "withdrawals"
  | "sub_admins";

export interface RequestAdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: Record<string, boolean>;
  is_super_admin: boolean;
  is_admin: boolean;
  is_active?: boolean;
}

export interface AdminAuthResult {
  authorized: boolean;
  response?: NextResponse;
  user?: RequestAdminUser;
}

/**
 * Checks if the current user has permission to access an admin resource.
 * - Super Admin (matching ADMIN_EMAIL) always has full access.
 * - Sub-Admin (role === 'sub_admin') has access if permissions[requiredPermission] is true.
 * - 'sub_admins' permission is strictly reserved for Super Admin.
 */
export async function requireAdminPermission(
  requiredPermission?: AdminPermission
): Promise<AdminAuthResult> {
  const user = (await getRequestUser()) as RequestAdminUser | null;

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      ),
    };
  }

  // Super Admin has unrestricted access to everything
  if (user.is_super_admin) {
    return {
      authorized: true,
      user,
    };
  }

  // Sub-Admins
  if (user.role === "sub_admin" && user.is_active !== false) {
    // Only Super Admin can manage sub-admins or provider configs
    if (requiredPermission === "sub_admins") {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: "Super Admin privileges required." },
          { status: 403 }
        ),
      };
    }

    if (!requiredPermission || user.permissions?.[requiredPermission] === true) {
      return {
        authorized: true,
        user,
      };
    }

    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: `Permission denied: '${requiredPermission}' access required.`,
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: false,
    response: NextResponse.json(
      { success: false, error: "Staff or Admin access required." },
      { status: 403 }
    ),
  };
}
