import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getBotById, setBotAccessToken } from "@/lib/integrations/bots";
import { getServerConnectionById } from "@/lib/servers";
import { ensureBotUser, loginAsUser } from "@/lib/synapse";
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

  if (!bot.localpart) {
    return NextResponse.json(
      { error: "Bot must have a localpart set before provisioning a token. Set it in the bot overview." },
      { status: 400 }
    );
  }

  try {
    const conn = await getServerConnectionById(bot.serverId);
    const userId = `@${bot.localpart}:${conn.serverName}`;

    // Step 1: Create or ensure the bot user exists on Synapse
    await ensureBotUser(userId, bot.displayName, conn);

    // Step 2: Get an access token for the bot user
    const accessToken = await loginAsUser(userId, conn);

    // Step 3: Store the encrypted token in the database
    await setBotAccessToken(id, accessToken);

    await logAudit({
      action: "bot.updated",
      actor: auth.email,
      target: id,
      detail: `access token provisioned via admin API for ${userId}`,
      ip: getClientIp(request),
      serverId: bot.serverId,
    });

    return NextResponse.json({
      success: true,
      matrixUserId: userId,
      message: "Bot user created and access token stored.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to provision bot token" },
      { status: 500 }
    );
  }
}
