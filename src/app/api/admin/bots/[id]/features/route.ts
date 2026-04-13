import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-guard";
import { getBotById, setBotFeature } from "@/lib/integrations/bots";
import { botFeatureSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const bot = await getBotById(id);
  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  const auth = await requirePermission("bots.write", bot.serverId);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const parsed = botFeatureSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const feature = await setBotFeature(
      id,
      parsed.data.featureKey,
      parsed.data.enabled,
      parsed.data.scope,
      parsed.data.scopeId,
      parsed.data.config as Record<string, unknown> | undefined
    );

    await logAudit({
      action: "bot.feature.updated",
      actor: auth.email,
      target: id,
      detail: `feature: ${parsed.data.featureKey}, enabled: ${parsed.data.enabled}, scope: ${parsed.data.scope}`,
      ip: getClientIp(request),
    });

    return NextResponse.json({ feature });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to update feature" }, { status: 400 });
  }
}
