import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requirePermission } from "@/lib/auth-guard";
import { getToken, updateToken, deleteToken, SynapseApiError } from "@/lib/synapse";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { updateTokenSchema } from "@/lib/validation";
import { getClientIp } from "@/lib/utils";
import { getServerConnectionById } from "@/lib/servers";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const serverId = request.nextUrl.searchParams.get("serverId");
  if (!serverId) return NextResponse.json({ error: "serverId is required" }, { status: 400 });

  const { token: tokenId } = await context.params;

  try {
    const conn = await getServerConnectionById(serverId);
    const token = await getToken(tokenId, conn);
    const meta = await db.tokenMeta.findFirst({ where: { serverId, token: tokenId } });
    return NextResponse.json({ token: { ...token, label: meta?.label, note: meta?.note } });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed to fetch token" }, { status: 502 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { token: tokenId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateTokenSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const serverId = body?.serverId as string | undefined;
  if (!serverId) return NextResponse.json({ error: "serverId is required" }, { status: 400 });

  const auth = await requirePermission("tokens.write", serverId);
  if (auth instanceof NextResponse) return auth;

  const { label, note, ...synapseParams } = parsed.data;
  const ip = getClientIp(request);

  try {
    const conn = await getServerConnectionById(serverId);
    const hasSynapseUpdate = synapseParams.uses_allowed !== undefined || synapseParams.expiry_time !== undefined;
    let updated;

    if (hasSynapseUpdate) {
      updated = await updateToken(tokenId, synapseParams, conn);
    } else {
      updated = await getToken(tokenId, conn);
    }

    if (label !== undefined || note !== undefined) {
      const existing = await db.tokenMeta.findFirst({ where: { serverId, token: tokenId } });
      if (existing) {
        await db.tokenMeta.update({
          where: { id: existing.id },
          data: { ...(label !== undefined && { label }), ...(note !== undefined && { note }) },
        });
      } else {
        await db.tokenMeta.create({
          data: { serverId, token: tokenId, label, note, createdBy: auth.email },
        });
      }
    }

    const isDisable = synapseParams.uses_allowed === 0;
    const changedFields = Object.keys(parsed.data).join(", ");
    await logAudit({
      action: isDisable ? "token.disabled" : "token.updated",
      actor: auth.email,
      target: tokenId,
      detail: `fields: ${changedFields}`,
      ip,
      serverId,
    });

    const meta = await db.tokenMeta.findFirst({ where: { serverId, token: tokenId } });
    return NextResponse.json({ token: { ...updated, label: meta?.label, note: meta?.note } });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed to update token" }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { token: tokenId } = await context.params;
  const body = await request.json().catch(() => null);
  const serverId = body?.serverId as string | undefined;
  if (!serverId) return NextResponse.json({ error: "serverId is required" }, { status: 400 });

  const auth = await requirePermission("tokens.write", serverId);
  if (auth instanceof NextResponse) return auth;
  const ip = getClientIp(request);

  try {
    const conn = await getServerConnectionById(serverId);
    await deleteToken(tokenId, conn);
    await db.tokenMeta.deleteMany({ where: { serverId, token: tokenId } });

    await logAudit({
      action: "token.deleted",
      actor: auth.email,
      target: tokenId,
      ip,
      serverId,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed to delete token" }, { status: 502 });
  }
}
