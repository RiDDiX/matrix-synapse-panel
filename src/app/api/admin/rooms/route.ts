import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requirePermission } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import { listRooms, SynapseApiError } from "@/lib/synapse";
import {
  createRoom,
  MatrixApiError,
  type MatrixClientConnection,
} from "@/lib/matrix-client";
import { createRoomSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

function getMatrixConn(conn: { internalUrl: string; adminToken: string }): MatrixClientConnection {
  return { baseUrl: conn.internalUrl, accessToken: conn.adminToken };
}

/**
 * GET /api/admin/rooms
 *
 * List rooms using the Synapse Admin API (server-level room listing).
 * This is a true admin operation — lists ALL rooms on the server.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  try {
    const conn = await getServerConnectionById(serverId);
    const from = url.searchParams.get("from");
    const limit = url.searchParams.get("limit");
    const search = url.searchParams.get("search_term");
    const orderBy = url.searchParams.get("order_by");
    const dir = url.searchParams.get("dir");

    const data = await listRooms(
      {
        from: from ? parseInt(from, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : 50,
        search_term: search || undefined,
        order_by: orderBy || undefined,
        dir: dir || undefined,
      },
      conn
    );

    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list rooms" },
      { status: 502 }
    );
  }
}

/**
 * POST /api/admin/rooms
 *
 * Create a room using the Matrix Client-Server API.
 * This is a CLIENT operation — the room is created as the admin's Matrix identity.
 * Room power levels and permissions apply normally.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  const auth = await requirePermission("rooms.write", serverId);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const conn = await getServerConnectionById(serverId);
    const matrixConn = getMatrixConn(conn);

    const result = await createRoom(parsed.data, matrixConn);

    await logAudit({
      action: "room.created",
      actor: auth.email,
      target: result.room_id,
      detail: `created room${parsed.data.name ? ` "${parsed.data.name}"` : ""}`,
      ip: getClientIp(request),
      serverId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof MatrixApiError) {
      return NextResponse.json({ error: e.message, errcode: e.errcode }, { status: e.status });
    }
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create room" },
      { status: 502 }
    );
  }
}
