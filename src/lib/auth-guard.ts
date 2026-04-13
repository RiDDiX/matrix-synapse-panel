import { NextResponse } from "next/server";
import { getSession } from "./session";
import { db } from "./db";

export async function requireAdmin(): Promise<{ authorized: true; email: string; userId: string } | NextResponse> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.email || !session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { authorized: true, email: session.email, userId: session.userId };
}

/**
 * Restrict to users with role "global_admin" (server lifecycle, permission
 * grants, and other panel-wide operations).
 */
export async function requireGlobalAdmin(): Promise<{ authorized: true; email: string; userId: string } | NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const user = await db.adminUser.findUnique({ where: { id: auth.userId } });
  if (!user || user.role !== "global_admin") {
    return NextResponse.json({ error: "Forbidden: global admin required" }, { status: 403 });
  }
  return auth;
}

/**
 * Global admin role bypasses per-permission checks. Other roles need an
 * AdminPermission row matching the permission key (and serverId, if scoped).
 */
export async function requirePermission(
  permission: string,
  serverId?: string | null
): Promise<{ authorized: true; email: string; userId: string } | NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const user = await db.adminUser.findUnique({ where: { id: auth.userId } });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role === "global_admin") {
    return auth;
  }

  const match = await db.adminPermission.findFirst({
    where: {
      userId: user.id,
      permission,
      OR: [
        { serverId: null },
        ...(serverId ? [{ serverId }] : []),
      ],
    },
  });

  if (!match) {
    return NextResponse.json(
      { error: `Forbidden: missing permission "${permission}"` },
      { status: 403 }
    );
  }

  return auth;
}
