import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getBotById, assignBotToRoom, unassignBotFromRoom } from "@/lib/integrations/bots";
import { botRoomAssignmentSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";
import { getServerConnectionById } from "@/lib/servers";
import { joinRoomAsUser, leaveRoomAsUser } from "@/lib/synapse";

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
  const parsed = botRoomAssignmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const assignment = await assignBotToRoom(
    id,
    parsed.data.roomId,
    parsed.data.roomAlias,
    parsed.data.config as Record<string, unknown> | undefined
  );

  // Auto-join the bot to the room if localpart is configured
  let joinError: string | null = null;
  if (bot.localpart) {
    try {
      const conn = await getServerConnectionById(bot.serverId);
      const userId = `@${bot.localpart}:${conn.serverName}`;
      await joinRoomAsUser(parsed.data.roomId, userId, conn);
    } catch (e) {
      joinError = e instanceof Error ? e.message : "Failed to join room";
    }
  }

  await logAudit({
    action: "bot.room.assigned",
    actor: auth.email,
    target: id,
    detail: `room: ${parsed.data.roomId}${joinError ? ` (join failed: ${joinError})` : " (joined)"}`,
    ip: getClientIp(request),
    serverId: bot.serverId,
  });

  return NextResponse.json({
    assignment,
    joined: !joinError,
    joinError,
  }, { status: 201 });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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

  // Make the bot leave the room if localpart is configured
  let leaveError: string | null = null;
  if (bot.localpart) {
    try {
      const conn = await getServerConnectionById(bot.serverId);
      const userId = `@${bot.localpart}:${conn.serverName}`;
      await leaveRoomAsUser(roomId, userId, conn);
    } catch (e) {
      leaveError = e instanceof Error ? e.message : "Failed to leave room";
    }
  }

  await unassignBotFromRoom(id, roomId);

  await logAudit({
    action: "bot.room.unassigned",
    actor: auth.email,
    target: id,
    detail: `room: ${roomId}${leaveError ? ` (leave failed: ${leaveError})` : " (left)"}`,
    ip: getClientIp(request),
    serverId: bot.serverId,
  });

  return NextResponse.json({ success: true, leaveError });
}
