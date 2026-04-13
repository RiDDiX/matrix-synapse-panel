import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import {
  createRoom,
  sendStateEvent,
  MatrixApiError,
  type MatrixClientConnection,
} from "@/lib/matrix-client";
import { createSpaceSchema, spaceChildSchema } from "@/lib/validation";
import { SynapseApiError } from "@/lib/synapse";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

function getMatrixConn(conn: { internalUrl: string; adminToken: string }): MatrixClientConnection {
  return { baseUrl: conn.internalUrl, accessToken: conn.adminToken };
}

/**
 * POST /api/admin/spaces
 *
 * Actions: create (create a space), add_child (add room to space), remove_child (remove room from space)
 *
 * Create space uses POST /_matrix/client/v3/createRoom with creation_content.type = "m.space"
 * Ref: https://spec.matrix.org/latest/client-server-api/#spaces
 *
 * Add/remove child uses PUT /_matrix/client/v3/rooms/{roomId}/state/m.space.child/{childRoomId}
 * Ref: https://spec.matrix.org/latest/client-server-api/#mspacechild
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  const auth = await requirePermission("spaces.write", serverId);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  if (!body || !body.action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  try {
    const conn = await getServerConnectionById(serverId);
    const matrixConn = getMatrixConn(conn);

    switch (body.action) {
      case "create": {
        const parsed = createSpaceSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
            { status: 400 }
          );
        }

        const result = await createRoom(
          {
            name: parsed.data.name,
            topic: parsed.data.topic,
            room_alias_name: parsed.data.room_alias_name,
            visibility: parsed.data.visibility,
            preset: parsed.data.visibility === "public" ? "public_chat" : "private_chat",
            invite: parsed.data.invite,
            creation_content: { type: "m.space" },
            power_level_content_override: {
              events_default: 100,
            },
          },
          matrixConn
        );

        await logAudit({
          action: "space.created",
          actor: auth.email,
          target: result.room_id,
          detail: `created space "${parsed.data.name}"`,
          ip: getClientIp(request),
          serverId,
        });

        return NextResponse.json(result, { status: 201 });
      }

      case "add_child": {
        if (!body.space_id) {
          return NextResponse.json({ error: "space_id is required" }, { status: 400 });
        }
        const parsed = spaceChildSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
            { status: 400 }
          );
        }

        await sendStateEvent(
          body.space_id,
          "m.space.child",
          parsed.data.room_id,
          {
            via: [conn.internalUrl.replace(/^https?:\/\//, "").replace(/:\d+$/, "")],
            suggested: parsed.data.suggested,
            ...(parsed.data.order ? { order: parsed.data.order } : {}),
          },
          matrixConn
        );

        await logAudit({
          action: "space.child.added",
          actor: auth.email,
          target: body.space_id,
          detail: `added ${parsed.data.room_id} to space`,
          ip: getClientIp(request),
          serverId,
        });

        return NextResponse.json({ success: true });
      }

      case "remove_child": {
        if (!body.space_id || !body.room_id) {
          return NextResponse.json({ error: "space_id and room_id are required" }, { status: 400 });
        }

        await sendStateEvent(
          body.space_id,
          "m.space.child",
          body.room_id,
          {},
          matrixConn
        );

        await logAudit({
          action: "space.child.removed",
          actor: auth.email,
          target: body.space_id,
          detail: `removed ${body.room_id} from space`,
          ip: getClientIp(request),
          serverId,
        });

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof MatrixApiError) {
      return NextResponse.json({ error: e.message, errcode: e.errcode }, { status: e.status });
    }
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Space action failed" },
      { status: 502 }
    );
  }
}
