import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import { makeUserRoomAdmin, SynapseApiError } from "@/lib/synapse";
import { makeRoomAdminSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

type RouteContext = { params: Promise<{ roomId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) return NextResponse.json({ error: "serverId is required" }, { status: 400 });

  const auth = await requirePermission("rooms.write", serverId);
  if (auth instanceof NextResponse) return auth;

  const { roomId: rawRoomId } = await context.params;
  const roomId = decodeURIComponent(rawRoomId);

  const body = await request.json().catch(() => null);
  const parsed = makeRoomAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const conn = await getServerConnectionById(serverId);
    await makeUserRoomAdmin(roomId, parsed.data.user_id, conn);

    await logAudit({
      action: "room.admin.granted",
      actor: auth.email,
      target: roomId,
      detail: `granted to ${parsed.data.user_id}`,
      ip: getClientIp(request),
      serverId,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to make user room admin" },
      { status: 502 }
    );
  }
}
