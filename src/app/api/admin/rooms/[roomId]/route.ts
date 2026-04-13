import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requirePermission } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import { SynapseApiError } from "@/lib/synapse";
import {
  getRoomState,
  getRoomMessages,
  sendMessage,
  sendStateEvent,
  sendThreadedReply,
  getJoinedMembers,
  getMembers,
  inviteUser,
  kickUser,
  banUser,
  unbanUser,
  joinRoom,
  leaveRoom,
  setRoomAlias,
  deleteRoomAlias,
  upgradeRoom,
  getThreadRoots,
  getThreadReplies,
  MatrixApiError,
  type MatrixClientConnection,
} from "@/lib/matrix-client";
import {
  adminRoomDetail,
  adminRoomState,
} from "@/lib/synapse-endpoints";
import { sendMessageSchema, roomMemberActionSchema, roomAliasSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

type RouteContext = { params: Promise<{ roomId: string }> };

function getMatrixConn(conn: { internalUrl: string; adminToken: string }): MatrixClientConnection {
  return { baseUrl: conn.internalUrl, accessToken: conn.adminToken };
}

function adminHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

/**
 * GET /api/admin/rooms/[roomId]
 *
 * Get room detail. Uses Synapse Admin API for server-level room info,
 * plus Client-Server API for state events and members.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { roomId: rawRoomId } = await context.params;
  const roomId = decodeURIComponent(rawRoomId);

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  const section = url.searchParams.get("section") ?? "detail";

  try {
    const conn = await getServerConnectionById(serverId);
    const matrixConn = getMatrixConn(conn);

    switch (section) {
      case "detail": {
        // Synapse Admin API: room detail
        const detailUrl = `${conn.internalUrl}${adminRoomDetail(roomId)}`;
        const detailRes = await fetch(detailUrl, {
          headers: adminHeaders(conn.adminToken),
          cache: "no-store",
        });
        if (!detailRes.ok) {
          const body = await detailRes.json().catch(() => ({ error: "Unknown error" }));
          return NextResponse.json(body, { status: detailRes.status });
        }
        return NextResponse.json(await detailRes.json());
      }

      case "state": {
        // Try Client-Server API first for state
        try {
          const state = await getRoomState(roomId, matrixConn);
          return NextResponse.json({ state });
        } catch {
          // Fall back to Synapse Admin API
          const stateUrl = `${conn.internalUrl}${adminRoomState(roomId)}`;
          const stateRes = await fetch(stateUrl, {
            headers: adminHeaders(conn.adminToken),
            cache: "no-store",
          });
          if (!stateRes.ok) {
            const body = await stateRes.json().catch(() => ({ error: "Unknown error" }));
            return NextResponse.json(body, { status: stateRes.status });
          }
          return NextResponse.json(await stateRes.json());
        }
      }

      case "members": {
        const membership = url.searchParams.get("membership") as "join" | "invite" | "leave" | "ban" | undefined;
        try {
          if (membership) {
            const members = await getMembers(roomId, matrixConn, membership);
            return NextResponse.json(members);
          }
          const joined = await getJoinedMembers(roomId, matrixConn);
          return NextResponse.json(joined);
        } catch (e) {
          if (e instanceof MatrixApiError) {
            return NextResponse.json({ error: e.message, errcode: e.errcode }, { status: e.status });
          }
          throw e;
        }
      }

      case "messages": {
        const from = url.searchParams.get("from") ?? undefined;
        const limit = url.searchParams.get("limit");
        const dir = (url.searchParams.get("dir") ?? "b") as "b" | "f";
        const messages = await getRoomMessages(roomId, {
          from,
          dir,
          limit: limit ? parseInt(limit, 10) : 50,
        }, matrixConn);
        return NextResponse.json(messages);
      }

      case "threads": {
        const from = url.searchParams.get("from") ?? undefined;
        const limit = url.searchParams.get("limit");
        const threads = await getThreadRoots(roomId, {
          from,
          limit: limit ? parseInt(limit, 10) : 50,
        }, matrixConn);
        return NextResponse.json(threads);
      }

      case "thread-replies": {
        const eventId = url.searchParams.get("eventId");
        if (!eventId) {
          return NextResponse.json({ error: "eventId is required for thread-replies" }, { status: 400 });
        }
        const from = url.searchParams.get("from") ?? undefined;
        const limit = url.searchParams.get("limit");
        const replies = await getThreadReplies(roomId, eventId, {
          from,
          limit: limit ? parseInt(limit, 10) : 50,
        }, matrixConn);
        return NextResponse.json(replies);
      }

      default:
        return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof MatrixApiError) {
      return NextResponse.json({ error: e.message, errcode: e.errcode }, { status: e.status });
    }
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to get room data" },
      { status: 502 }
    );
  }
}

/**
 * POST /api/admin/rooms/[roomId]
 *
 * Perform room actions using Matrix Client-Server API.
 * Actions: send_message, send_threaded_reply, set_state, invite, kick, ban, unban,
 *          join, leave, set_alias, delete_alias, upgrade
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  const auth = await requirePermission("rooms.write", serverId);
  if (auth instanceof NextResponse) return auth;

  const { roomId: rawRoomId } = await context.params;
  const roomId = decodeURIComponent(rawRoomId);

  const body = await request.json().catch(() => null);
  if (!body || !body.action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  const action = body.action as string;

  try {
    const conn = await getServerConnectionById(serverId);
    const matrixConn = getMatrixConn(conn);

    switch (action) {
      case "send_message": {
        const parsed = sendMessageSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Invalid message", details: parsed.error.flatten().fieldErrors },
            { status: 400 }
          );
        }
        const result = await sendMessage(roomId, parsed.data, matrixConn);
        await logAudit({
          action: "room.message.sent",
          actor: auth.email,
          target: roomId,
          detail: `sent ${parsed.data.msgtype} message`,
          ip: getClientIp(request),
          serverId,
        });
        return NextResponse.json(result);
      }

      case "send_threaded_reply": {
        const threadRootEventId = body.thread_root_event_id as string;
        const replyToEventId = body.reply_to_event_id as string | undefined;
        if (!threadRootEventId) {
          return NextResponse.json({ error: "thread_root_event_id is required" }, { status: 400 });
        }
        const parsed = sendMessageSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Invalid message", details: parsed.error.flatten().fieldErrors },
            { status: 400 }
          );
        }
        const result = await sendThreadedReply(
          roomId,
          threadRootEventId,
          parsed.data,
          replyToEventId,
          matrixConn
        );
        await logAudit({
          action: "room.message.sent",
          actor: auth.email,
          target: roomId,
          detail: `sent threaded reply in thread ${threadRootEventId}`,
          ip: getClientIp(request),
          serverId,
        });
        return NextResponse.json(result);
      }

      case "set_state": {
        const eventType = body.event_type as string;
        const stateKey = (body.state_key as string) ?? "";
        const content = body.content as Record<string, unknown>;
        if (!eventType || !content) {
          return NextResponse.json({ error: "event_type and content are required" }, { status: 400 });
        }
        const result = await sendStateEvent(roomId, eventType, stateKey, content, matrixConn);
        await logAudit({
          action: "room.state.updated",
          actor: auth.email,
          target: roomId,
          detail: `set ${eventType}${stateKey ? ` (${stateKey})` : ""}`,
          ip: getClientIp(request),
          serverId,
        });
        return NextResponse.json(result);
      }

      case "invite": {
        const parsed = roomMemberActionSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
            { status: 400 }
          );
        }
        await inviteUser(roomId, parsed.data.user_id, matrixConn, parsed.data.reason);
        await logAudit({
          action: "room.member.invited",
          actor: auth.email,
          target: `${parsed.data.user_id} → ${roomId}`,
          detail: parsed.data.reason || undefined,
          ip: getClientIp(request),
          serverId,
        });
        return NextResponse.json({ success: true });
      }

      case "kick": {
        const parsed = roomMemberActionSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
            { status: 400 }
          );
        }
        await kickUser(roomId, parsed.data.user_id, matrixConn, parsed.data.reason);
        await logAudit({
          action: "room.member.kicked",
          actor: auth.email,
          target: `${parsed.data.user_id} ← ${roomId}`,
          detail: parsed.data.reason || undefined,
          ip: getClientIp(request),
          serverId,
        });
        return NextResponse.json({ success: true });
      }

      case "ban": {
        const parsed = roomMemberActionSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
            { status: 400 }
          );
        }
        await banUser(roomId, parsed.data.user_id, matrixConn, parsed.data.reason);
        await logAudit({
          action: "room.member.banned",
          actor: auth.email,
          target: `${parsed.data.user_id} ← ${roomId}`,
          detail: parsed.data.reason || undefined,
          ip: getClientIp(request),
          serverId,
        });
        return NextResponse.json({ success: true });
      }

      case "unban": {
        const parsed = roomMemberActionSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
            { status: 400 }
          );
        }
        await unbanUser(roomId, parsed.data.user_id, matrixConn, parsed.data.reason);
        await logAudit({
          action: "room.member.unbanned",
          actor: auth.email,
          target: `${parsed.data.user_id} ← ${roomId}`,
          detail: parsed.data.reason || undefined,
          ip: getClientIp(request),
          serverId,
        });
        return NextResponse.json({ success: true });
      }

      case "join": {
        const result = await joinRoom(roomId, matrixConn);
        await logAudit({
          action: "room.joined",
          actor: auth.email,
          target: roomId,
          ip: getClientIp(request),
          serverId,
        });
        return NextResponse.json(result);
      }

      case "leave": {
        const reason = body.reason as string | undefined;
        await leaveRoom(roomId, matrixConn, reason);
        await logAudit({
          action: "room.left",
          actor: auth.email,
          target: roomId,
          ip: getClientIp(request),
          serverId,
        });
        return NextResponse.json({ success: true });
      }

      case "set_alias": {
        const parsed = roomAliasSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Invalid alias", details: parsed.error.flatten().fieldErrors },
            { status: 400 }
          );
        }
        await setRoomAlias(parsed.data.alias, roomId, matrixConn);
        await logAudit({
          action: "room.alias.set",
          actor: auth.email,
          target: `${parsed.data.alias} → ${roomId}`,
          ip: getClientIp(request),
          serverId,
        });
        return NextResponse.json({ success: true });
      }

      case "delete_alias": {
        const alias = body.alias as string;
        if (!alias) {
          return NextResponse.json({ error: "alias is required" }, { status: 400 });
        }
        await deleteRoomAlias(alias, matrixConn);
        await logAudit({
          action: "room.alias.deleted",
          actor: auth.email,
          target: alias,
          ip: getClientIp(request),
          serverId,
        });
        return NextResponse.json({ success: true });
      }

      case "upgrade": {
        const newVersion = body.new_version as string;
        if (!newVersion) {
          return NextResponse.json({ error: "new_version is required" }, { status: 400 });
        }
        const result = await upgradeRoom(roomId, newVersion, matrixConn);
        await logAudit({
          action: "room.upgraded",
          actor: auth.email,
          target: roomId,
          detail: `upgraded to version ${newVersion}, replacement: ${result.replacement_room}`,
          ip: getClientIp(request),
          serverId,
        });
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof MatrixApiError) {
      return NextResponse.json({ error: e.message, errcode: e.errcode }, { status: e.status });
    }
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Room action failed" },
      { status: 502 }
    );
  }
}
