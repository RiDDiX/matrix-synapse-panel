import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getBotById, assignBotToRoom, unassignBotFromRoom } from "@/lib/integrations/bots";
import { botRoomAssignmentSchema } from "@/lib/validation";
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

  await logAudit({
    action: "bot.room.assigned",
    actor: auth.email,
    target: id,
    detail: `room: ${parsed.data.roomId}`,
    ip: getClientIp(request),
  });

  return NextResponse.json({ assignment }, { status: 201 });
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

  await unassignBotFromRoom(id, roomId);

  await logAudit({
    action: "bot.room.unassigned",
    actor: auth.email,
    target: id,
    detail: `room: ${roomId}`,
    ip: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
