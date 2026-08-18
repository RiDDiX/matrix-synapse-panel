import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requirePermission } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import {
  getUser,
  listRooms,
  redactUserEvents,
  getUserRedactionStatus,
  deleteUserMedia,
  deactivateUser,
  clearUserExternalIds,
  SynapseApiError,
} from "@/lib/synapse";
import { purgeUserSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

type RouteContext = { params: Promise<{ userId: string }> };

const PAGE_SIZE = 500;

/**
 * Purge a user's data beyond deactivation, via official Admin API endpoints:
 * redact all their events (Synapse >= 1.116.0), delete all their local media
 * (>= 1.41.0), GDPR-erase the account, and clear leftover SSO mappings.
 *
 * Synapse never deletes the account row or frees the user ID — the ID stays
 * permanently reserved. These actions remove the data, not the tombstone.
 */

/** Map "endpoint does not exist on this Synapse version" to a clear 501. */
function unsupported(e: SynapseApiError, hint: string): NextResponse | null {
  if (e.errcode === "M_UNRECOGNIZED") {
    return NextResponse.json({ error: `Not supported by this Synapse version (${hint})` }, { status: 501 });
  }
  return null;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  const auth = await requirePermission("users.write", serverId);
  if (auth instanceof NextResponse) return auth;

  const { userId: rawUserId } = await context.params;
  const userId = decodeURIComponent(rawUserId);

  const body = await request.json().catch(() => null);
  const parsed = purgeUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);

  try {
    const conn = await getServerConnectionById(serverId);

    switch (parsed.data.action) {
      case "redact_events": {
        const user = await getUser(userId, conn);
        // rooms: [] means "all rooms the user is in" — a deactivated user has
        // no memberships left, so pass every room on the server instead and
        // let the admin issue the redactions.
        const rooms: string[] = [];
        let useAdmin = false;
        if (user.deactivated) {
          // ponytail: paginated sweep over all rooms; slow on huge servers
          let from = 0;
          for (;;) {
            const page = await listRooms({ limit: PAGE_SIZE, from }, conn);
            rooms.push(...page.rooms.map((r) => r.room_id));
            if (page.next_batch === undefined || page.rooms.length === 0) break;
            from = page.next_batch;
          }
          useAdmin = true;
          if (rooms.length === 0) {
            return NextResponse.json({ redact_id: null, rooms_searched: 0 });
          }
        }
        try {
          const res = await redactUserEvents(
            userId,
            { rooms, reason: parsed.data.reason, use_admin: useAdmin },
            conn
          );
          await logAudit({
            action: "user.events.redacted",
            actor: auth.email,
            target: userId,
            detail: `redaction started (${user.deactivated ? `${rooms.length} rooms swept as admin` : "all joined rooms"})`,
            ip,
            serverId,
          });
          return NextResponse.json({ redact_id: res.redact_id, rooms_searched: rooms.length || null });
        } catch (e) {
          if (e instanceof SynapseApiError) {
            const resp = unsupported(e, "user event redaction requires Synapse 1.116+");
            if (resp) return resp;
          }
          throw e;
        }
      }

      case "delete_media": {
        try {
          const res = await deleteUserMedia(userId, conn);
          await logAudit({
            action: "user.media.purged",
            actor: auth.email,
            target: userId,
            detail: `deleted ${res.deleted} media files`,
            ip,
            serverId,
          });
          return NextResponse.json({ deleted: res.deleted });
        } catch (e) {
          if (e instanceof SynapseApiError) {
            const resp = unsupported(e, "per-user media deletion requires Synapse 1.41+");
            if (resp) return resp;
          }
          throw e;
        }
      }

      case "erase": {
        await deactivateUser(userId, true, conn);
        await logAudit({
          action: "user.deleted",
          actor: auth.email,
          target: userId,
          detail: `erased user ${userId}`,
          ip,
          serverId,
        });
        return NextResponse.json({ success: true });
      }

      case "clear_external_ids": {
        await clearUserExternalIds(userId, conn);
        await logAudit({
          action: "user.external_ids.cleared",
          actor: auth.email,
          target: userId,
          detail: `cleared SSO/external ID mappings for ${userId}`,
          ip,
          serverId,
        });
        return NextResponse.json({ success: true });
      }
    }
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Purge action failed" },
      { status: 502 }
    );
  }
}

/**
 * GET /api/admin/users/[userId]/purge?serverId=...&redactId=...
 *
 * Poll the status of a redaction job started by redact_events.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  const redactId = url.searchParams.get("redactId");
  if (!serverId || !redactId) {
    return NextResponse.json({ error: "serverId and redactId are required" }, { status: 400 });
  }

  try {
    const conn = await getServerConnectionById(serverId);
    const status = await getUserRedactionStatus(redactId, conn);
    return NextResponse.json(status);
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Status check failed" },
      { status: 502 }
    );
  }
}
