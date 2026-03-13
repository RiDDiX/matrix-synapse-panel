import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import {
  listUserMedia,
  getUsersMediaStatistics,
  SynapseApiError,
} from "@/lib/synapse";
import { deleteMediaByDateSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

/**
 * GET /api/admin/media
 *
 * List media by user or get media statistics.
 * Query params: serverId, userId (optional), mode=stats|user, limit, from, order_by, dir, search_term
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  const mode = url.searchParams.get("mode") || "stats";
  const limit = url.searchParams.get("limit");
  const from = url.searchParams.get("from");
  const orderBy = url.searchParams.get("order_by");
  const dir = url.searchParams.get("dir");
  const searchTerm = url.searchParams.get("search_term");

  try {
    const conn = await getServerConnectionById(serverId);

    if (mode === "user") {
      const userId = url.searchParams.get("userId");
      if (!userId) {
        return NextResponse.json({ error: "userId is required for user mode" }, { status: 400 });
      }
      const data = await listUserMedia(
        userId,
        {
          limit: limit ? parseInt(limit, 10) : 50,
          from: from ? parseInt(from, 10) : undefined,
          order_by: orderBy || undefined,
          dir: dir || undefined,
        },
        conn
      );
      return NextResponse.json(data);
    }

    const data = await getUsersMediaStatistics(
      {
        limit: limit ? parseInt(limit, 10) : 50,
        from: from ? parseInt(from, 10) : undefined,
        order_by: orderBy || "media_length",
        dir: dir || "b",
        search_term: searchTerm || undefined,
      },
      conn
    );
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list media" },
      { status: 502 }
    );
  }
}

/**
 * POST /api/admin/media
 *
 * Actions: quarantine, unquarantine, delete, delete_by_date, protect, unprotect
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  try {
    const conn = await getServerConnectionById(serverId);
    const { quarantineMedia, unquarantineMedia, deleteMedia, deleteMediaByDate: delByDate, protectMedia, unprotectMedia, quarantineRoomMedia, quarantineUserMedia } = await import("@/lib/synapse");

    switch (body.action) {
      case "quarantine": {
        if (!body.server_name || !body.media_id) {
          return NextResponse.json({ error: "server_name and media_id required" }, { status: 400 });
        }
        await quarantineMedia(body.server_name, body.media_id, conn);
        await logAudit({ action: "media.quarantined", actor: auth.email, target: `${body.server_name}/${body.media_id}`, ip: getClientIp(request), serverId });
        return NextResponse.json({ success: true });
      }
      case "unquarantine": {
        if (!body.server_name || !body.media_id) {
          return NextResponse.json({ error: "server_name and media_id required" }, { status: 400 });
        }
        await unquarantineMedia(body.server_name, body.media_id, conn);
        await logAudit({ action: "media.unquarantined", actor: auth.email, target: `${body.server_name}/${body.media_id}`, ip: getClientIp(request), serverId });
        return NextResponse.json({ success: true });
      }
      case "delete": {
        if (!body.server_name || !body.media_id) {
          return NextResponse.json({ error: "server_name and media_id required" }, { status: 400 });
        }
        await deleteMedia(body.server_name, body.media_id, conn);
        await logAudit({ action: "media.deleted", actor: auth.email, target: `${body.server_name}/${body.media_id}`, ip: getClientIp(request), serverId });
        return NextResponse.json({ success: true });
      }
      case "delete_by_date": {
        const parsed = deleteMediaByDateSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 });
        }
        const result = await delByDate(body.server_name || "", parsed.data.before_ts, parsed.data.keep_profiles, conn);
        await logAudit({ action: "media.bulk.deleted", actor: auth.email, detail: `deleted ${result.total} media items before ${new Date(parsed.data.before_ts).toISOString()}`, ip: getClientIp(request), serverId });
        return NextResponse.json(result);
      }
      case "protect": {
        if (!body.media_id) {
          return NextResponse.json({ error: "media_id required" }, { status: 400 });
        }
        await protectMedia(body.media_id, conn);
        await logAudit({ action: "media.protected", actor: auth.email, target: body.media_id, ip: getClientIp(request), serverId });
        return NextResponse.json({ success: true });
      }
      case "unprotect": {
        if (!body.media_id) {
          return NextResponse.json({ error: "media_id required" }, { status: 400 });
        }
        await unprotectMedia(body.media_id, conn);
        await logAudit({ action: "media.unprotected", actor: auth.email, target: body.media_id, ip: getClientIp(request), serverId });
        return NextResponse.json({ success: true });
      }
      case "quarantine_room": {
        if (!body.room_id) {
          return NextResponse.json({ error: "room_id required" }, { status: 400 });
        }
        const result = await quarantineRoomMedia(body.room_id, conn);
        await logAudit({ action: "media.quarantined", actor: auth.email, target: body.room_id, detail: `quarantined ${result.num_quarantined} items`, ip: getClientIp(request), serverId });
        return NextResponse.json(result);
      }
      case "quarantine_user": {
        if (!body.user_id) {
          return NextResponse.json({ error: "user_id required" }, { status: 400 });
        }
        const result = await quarantineUserMedia(body.user_id, conn);
        await logAudit({ action: "media.quarantined", actor: auth.email, target: body.user_id, detail: `quarantined ${result.num_quarantined} items`, ip: getClientIp(request), serverId });
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Media action failed" },
      { status: 502 }
    );
  }
}
