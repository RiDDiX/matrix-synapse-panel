import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getBotById, updateBot, deleteBot, activateBot, deactivateBot, sanitizeBot, setBotAccessToken } from "@/lib/integrations/bots";
import { updateBotSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const bot = await getBotById(id);

  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  return NextResponse.json({ bot: sanitizeBot(bot) });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const existing = await getBotById(id);
  if (!existing) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateBotSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const bot = await updateBot(id, {
    displayName: parsed.data.displayName,
    avatarUrl: parsed.data.avatarUrl,
    configJson: parsed.data.config as Record<string, unknown> | undefined,
  });

  await logAudit({
    action: "bot.updated",
    actor: auth.email,
    target: id,
    detail: `fields: ${Object.keys(parsed.data).join(", ")}`,
    ip: getClientIp(request),
  });

  return NextResponse.json({ bot });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const existing = await getBotById(id);
  if (!existing) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  if (existing.enabled) {
    return NextResponse.json({ error: "Deactivate the bot before deleting" }, { status: 409 });
  }

  await deleteBot(id);

  await logAudit({
    action: "bot.deleted",
    actor: auth.email,
    target: id,
    detail: `template: ${existing.templateId}, name: ${existing.displayName}`,
    ip: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const existing = await getBotById(id);
  if (!existing) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action as string | undefined;

  if (action === "activate") {
    const bot = await activateBot(id);
    await logAudit({ action: "bot.activated", actor: auth.email, target: id, ip: getClientIp(request) });
    return NextResponse.json({ bot });
  }

  if (action === "deactivate") {
    const bot = await deactivateBot(id);
    await logAudit({ action: "bot.deactivated", actor: auth.email, target: id, ip: getClientIp(request) });
    return NextResponse.json({ bot });
  }

  if (action === "set_token") {
    const token = body?.token as string | undefined;
    if (!token || token.length < 1) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }
    await setBotAccessToken(id, token);
    await logAudit({ action: "bot.updated", actor: auth.email, target: id, detail: "access token set", ip: getClientIp(request) });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
