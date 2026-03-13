import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import { getUser, modifyUser, deactivateUser, reactivateUser, SynapseApiError } from "@/lib/synapse";
import { modifyUserSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { userId: rawUserId } = await context.params;
  const userId = decodeURIComponent(rawUserId);

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  try {
    const conn = await getServerConnectionById(serverId);
    const user = await getUser(userId, conn);
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to get user" },
      { status: 502 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { userId: rawUserId } = await context.params;
  const userId = decodeURIComponent(rawUserId);

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action as string | undefined;

  try {
    const conn = await getServerConnectionById(serverId);

    if (action === "deactivate") {
      const erase = body.erase === true;
      await deactivateUser(userId, erase, conn);

      await logAudit({
        action: erase ? "user.deleted" : "user.deactivated",
        actor: auth.email,
        target: userId,
        detail: erase ? `erased user ${userId}` : `deactivated user ${userId}`,
        ip: getClientIp(request),
        serverId,
      });

      return NextResponse.json({ success: true, action: erase ? "erased" : "deactivated" });
    }

    if (action === "reactivate") {
      const password = body.password as string | undefined;
      if (!password || password.length < 8) {
        return NextResponse.json(
          { error: "A password of at least 8 characters is required to reactivate a user" },
          { status: 400 }
        );
      }
      const user = await reactivateUser(userId, password, conn);

      await logAudit({
        action: "user.reactivated",
        actor: auth.email,
        target: userId,
        detail: `reactivated user ${userId}`,
        ip: getClientIp(request),
        serverId,
      });

      return NextResponse.json({ user });
    }

    // Generic modify
    const parsed = modifyUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const user = await modifyUser(userId, parsed.data, conn);

    await logAudit({
      action: "user.modified",
      actor: auth.email,
      target: userId,
      detail: `modified user ${userId}: ${Object.keys(parsed.data).join(", ")}`,
      ip: getClientIp(request),
      serverId,
    });

    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to modify user" },
      { status: 502 }
    );
  }
}
