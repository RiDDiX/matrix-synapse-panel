import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireGlobalAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

const VALID_PERMISSIONS = [
  "tokens.read",
  "tokens.write",
  "users.read",
  "users.write",
  "rooms.read",
  "rooms.write",
  "media.read",
  "media.write",
  "federation.read",
  "federation.write",
  "event_reports.read",
  "event_reports.write",
  "purge_history",
  "background_updates",
  "integrations.read",
  "integrations.write",
  "bots.read",
  "bots.write",
  "branding.read",
  "branding.write",
  "audit.read",
  "export",
  "webhooks.read",
  "webhooks.write",
  "spaces.read",
  "spaces.write",
  "server_prep",
  "statistics",
];

/**
 * GET /api/admin/permissions
 *
 * List admin users with their permissions.
 * Query: userId (optional) — filter by user
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  try {
    if (userId) {
      const perms = await db.adminPermission.findMany({
        where: { userId },
        select: { id: true, serverId: true, permission: true, createdAt: true },
      });
      return NextResponse.json({ permissions: perms, valid_permissions: VALID_PERMISSIONS });
    }

    const users = await db.adminUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: {
          select: { id: true, serverId: true, permission: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users, valid_permissions: VALID_PERMISSIONS });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load permissions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/permissions
 *
 * Grant a permission to a user.
 * Body: { userId, permission, serverId? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireGlobalAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  if (!body || !body.userId || !body.permission) {
    return NextResponse.json({ error: "userId and permission are required" }, { status: 400 });
  }

  if (!VALID_PERMISSIONS.includes(body.permission)) {
    return NextResponse.json({ error: `Invalid permission: ${body.permission}` }, { status: 400 });
  }

  try {
    const perm = await db.adminPermission.create({
      data: {
        userId: body.userId,
        permission: body.permission,
        serverId: body.serverId || null,
      },
    });

    await logAudit({
      action: "admin.permission.granted",
      actor: auth.email,
      target: body.userId,
      detail: `granted permission: ${body.permission}${body.serverId ? ` (server: ${body.serverId})` : " (global)"}`,
      ip: getClientIp(request),
    });

    return NextResponse.json({ permission: perm }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to grant permission";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Permission already granted" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/permissions
 *
 * Revoke a permission.
 * Query: id — permission record ID
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireGlobalAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const existing = await db.adminPermission.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }

    await db.adminPermission.delete({ where: { id } });

    await logAudit({
      action: "admin.permission.revoked",
      actor: auth.email,
      target: existing.userId,
      detail: `revoked permission: ${existing.permission}`,
      ip: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to revoke permission" },
      { status: 500 }
    );
  }
}
