import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import { deleteRoom, SynapseApiError } from "@/lib/synapse";
import { deleteRoomSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

type RouteContext = { params: Promise<{ roomId: string }> };

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

  const body = await request.json().catch(() => ({}));
  const parsed = deleteRoomSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const conn = await getServerConnectionById(serverId);
    const result = await deleteRoom(roomId, parsed.data, conn);

    await logAudit({
      action: "room.deleted",
      actor: auth.email,
      target: roomId,
      detail: `block=${!!parsed.data.block}, purge=${!!parsed.data.purge}, kicked=${result.kicked_users.length}`,
      ip: getClientIp(request),
      serverId,
    });

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete room" },
      { status: 502 }
    );
  }
}
