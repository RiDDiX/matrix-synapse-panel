import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getToken, updateToken, deleteToken, SynapseApiError } from "@/lib/synapse";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { updateTokenSchema } from "@/lib/validation";
import { getClientIp } from "@/lib/utils";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { token: tokenId } = await context.params;

  try {
    const token = await getToken(tokenId);
    const meta = await db.tokenMeta.findUnique({ where: { token: tokenId } });
    return NextResponse.json({ token: { ...token, label: meta?.label, note: meta?.note } });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed to fetch token" }, { status: 502 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { token: tokenId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateTokenSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { label, note, ...synapseParams } = parsed.data;
  const ip = getClientIp(request);

  try {
    const hasSynapseUpdate = synapseParams.uses_allowed !== undefined || synapseParams.expiry_time !== undefined;
    let updated;

    if (hasSynapseUpdate) {
      updated = await updateToken(tokenId, synapseParams);
    } else {
      updated = await getToken(tokenId);
    }

    if (label !== undefined || note !== undefined) {
      await db.tokenMeta.upsert({
        where: { token: tokenId },
        update: { ...(label !== undefined && { label }), ...(note !== undefined && { note }) },
        create: { token: tokenId, label, note, createdBy: auth.email },
      });
    }

    const isDisable = synapseParams.uses_allowed === 0;
    const changedFields = Object.keys(parsed.data).join(", ");
    await logAudit({
      action: isDisable ? "token.disabled" : "token.updated",
      actor: auth.email,
      target: tokenId,
      detail: `fields: ${changedFields}`,
      ip,
    });

    const meta = await db.tokenMeta.findUnique({ where: { token: tokenId } });
    return NextResponse.json({ token: { ...updated, label: meta?.label, note: meta?.note } });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed to update token" }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { token: tokenId } = await context.params;
  const ip = getClientIp(request);

  try {
    await deleteToken(tokenId);
    await db.tokenMeta.deleteMany({ where: { token: tokenId } });

    await logAudit({
      action: "token.deleted",
      actor: auth.email,
      target: tokenId,
      ip,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed to delete token" }, { status: 502 });
  }
}
