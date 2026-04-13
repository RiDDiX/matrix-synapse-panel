import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import { setUserShadowBan, SynapseApiError } from "@/lib/synapse";
import { shadowBanSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

type RouteContext = { params: Promise<{ userId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) return NextResponse.json({ error: "serverId is required" }, { status: 400 });

  const auth = await requirePermission("users.write", serverId);
  if (auth instanceof NextResponse) return auth;

  const { userId: rawUserId } = await context.params;
  const userId = decodeURIComponent(rawUserId);

  const body = await request.json().catch(() => null);
  const parsed = shadowBanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const conn = await getServerConnectionById(serverId);
    await setUserShadowBan(userId, parsed.data.enabled, conn);

    await logAudit({
      action: parsed.data.enabled ? "user.shadow_ban.set" : "user.shadow_ban.cleared",
      actor: auth.email,
      target: userId,
      ip: getClientIp(request),
      serverId,
    });

    return NextResponse.json({ success: true, shadow_banned: parsed.data.enabled });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to set shadow ban" },
      { status: 502 }
    );
  }
}
