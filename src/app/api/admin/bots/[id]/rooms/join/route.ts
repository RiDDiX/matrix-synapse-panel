import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getBotById } from "@/lib/integrations/bots";
import { getServerConnectionById } from "@/lib/servers";
import { joinRoomAsUser } from "@/lib/synapse";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const bot = await getBotById(id);
  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const roomId = body?.roomId as string | undefined;

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  if (!bot.localpart) {
    return NextResponse.json(
      { error: "Bot has no localpart configured. Set a localpart first." },
      { status: 400 }
    );
  }

  try {
    const conn = await getServerConnectionById(bot.serverId);
    const userId = `@${bot.localpart}:${conn.serverName}`;

    const result = await joinRoomAsUser(roomId, userId, conn);

    await logAudit({
      action: "bot.room.assigned",
      actor: auth.email,
      target: id,
      detail: `force-joined ${userId} to ${result.room_id}`,
      ip: getClientIp(request),
      serverId: bot.serverId,
    });

    return NextResponse.json({
      success: true,
      room_id: result.room_id,
      userId,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to join room" },
      { status: 500 }
    );
  }
}
