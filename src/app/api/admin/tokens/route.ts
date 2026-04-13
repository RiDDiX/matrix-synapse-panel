import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requirePermission } from "@/lib/auth-guard";
import { listTokens, createToken, SynapseApiError } from "@/lib/synapse";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createTokenSchema } from "@/lib/validation";
import { getClientIp } from "@/lib/utils";
import { getServerConnectionById } from "@/lib/servers";
import type { TokenWithMeta } from "@/lib/types";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const serverId = request.nextUrl.searchParams.get("serverId");
  if (!serverId) return NextResponse.json({ error: "serverId is required" }, { status: 400 });

  try {
    const conn = await getServerConnectionById(serverId);
    const tokens = await listTokens(conn);
    const metas = await db.tokenMeta.findMany({ where: { serverId } });
    const metaMap = new Map(metas.map((m) => [m.token, m]));

    const enriched: TokenWithMeta[] = tokens.map((t) => {
      const meta = metaMap.get(t.token);
      return { ...t, label: meta?.label, note: meta?.note };
    });

    return NextResponse.json({ tokens: enriched });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to fetch tokens" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createTokenSchema.safeParse(body);

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
    const created = await createToken(synapseParams, conn);

    if (label || note) {
      await db.tokenMeta.create({
        data: { serverId, token: created.token, label, note, createdBy: auth.email },
      });
    }

    await logAudit({
      action: "token.created",
      actor: auth.email,
      target: created.token,
      detail: label ? `Label: ${label}` : undefined,
      ip,
      serverId,
    });

    return NextResponse.json({ token: created }, { status: 201 });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to create token" }, { status: 502 });
  }
}
