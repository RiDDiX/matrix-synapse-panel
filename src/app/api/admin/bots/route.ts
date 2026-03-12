import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { listBots, createBot } from "@/lib/integrations/bots";
import { BOT_TEMPLATES } from "@/lib/integrations/catalog/bot-templates";
import { createBotSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const view = request.nextUrl.searchParams.get("view");

  if (view === "templates") {
    return NextResponse.json({ templates: BOT_TEMPLATES });
  }

  const bots = await listBots();
  return NextResponse.json({ bots });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const parsed = createBotSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const bot = await createBot({
      templateId: parsed.data.templateId,
      displayName: parsed.data.displayName,
      localpart: parsed.data.localpart,
      avatarUrl: parsed.data.avatarUrl ?? undefined,
      configJson: parsed.data.config as Record<string, unknown> | undefined,
      actor: auth.email,
    });

    await logAudit({
      action: "bot.created",
      actor: auth.email,
      target: bot.id,
      detail: `template: ${parsed.data.templateId}, name: ${parsed.data.displayName}`,
      ip: getClientIp(request),
    });

    return NextResponse.json({ bot }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to create bot" }, { status: 400 });
  }
}
