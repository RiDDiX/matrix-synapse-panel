import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requirePermission } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

const ALLOWED_EVENTS = [
  "*",
  "token.created",
  "token.deleted",
  "token.updated",
  "user.registered",
  "user.deactivated",
  "media.quarantined",
  "media.deleted",
  "media.bulk.deleted",
  "federation.connection.reset",
  "event_report.deleted",
  "room.history.purged",
  "room.created",
  "room.deleted",
  "space.created",
  "export.generated",
];

/**
 * GET /api/admin/webhooks — list webhook endpoints
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");

  const webhooks = await db.webhookEndpoint.findMany({
    where: serverId ? { serverId } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      url: true,
      events: true,
      enabled: true,
      serverId: true,
      lastStatus: true,
      lastError: true,
      lastFiredAt: true,
      createdBy: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    webhooks: webhooks.map((w: { events: string; [key: string]: unknown }) => ({
      ...w,
      events: JSON.parse(w.events as string),
    })),
    allowed_events: ALLOWED_EVENTS,
  });
}

/**
 * POST /api/admin/webhooks — create or update a webhook endpoint
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { id, name, url: webhookUrl, secret, events, enabled, serverId } = body;

  const auth = await requirePermission("webhooks.write", serverId || undefined);
  if (auth instanceof NextResponse) return auth;

  if (!name || typeof name !== "string" || name.length > 200) {
    return NextResponse.json({ error: "name is required (max 200 chars)" }, { status: 400 });
  }

  if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.startsWith("http")) {
    return NextResponse.json({ error: "A valid HTTP(S) URL is required" }, { status: 400 });
  }

  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: "At least one event is required" }, { status: 400 });
  }

  const invalidEvents = events.filter((e: string) => !ALLOWED_EVENTS.includes(e));
  if (invalidEvents.length > 0) {
    return NextResponse.json({ error: `Invalid events: ${invalidEvents.join(", ")}` }, { status: 400 });
  }

  try {
    if (id) {
      const updated = await db.webhookEndpoint.update({
        where: { id },
        data: {
          name,
          url: webhookUrl,
          secret: secret || null,
          events: JSON.stringify(events),
          enabled: enabled !== false,
          serverId: serverId || null,
        },
      });
      return NextResponse.json({ webhook: { ...updated, events } });
    }

    const created = await db.webhookEndpoint.create({
      data: {
        name,
        url: webhookUrl,
        secret: secret || null,
        events: JSON.stringify(events),
        enabled: enabled !== false,
        serverId: serverId || null,
        createdBy: auth.email,
      },
    });

    await logAudit({
      action: "export.generated",
      actor: auth.email,
      detail: `webhook "${name}" created for events: ${events.join(", ")}`,
      ip: getClientIp(request),
      serverId: serverId || undefined,
    });

    return NextResponse.json({ webhook: { ...created, events } }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save webhook" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/webhooks — delete a webhook endpoint
 */
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission("webhooks.write");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    await db.webhookEndpoint.delete({ where: { id } });

    await logAudit({
      action: "export.generated",
      actor: auth.email,
      detail: `webhook ${id} deleted`,
      ip: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete webhook" },
      { status: 500 }
    );
  }
}
