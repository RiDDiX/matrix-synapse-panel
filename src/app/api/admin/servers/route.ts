import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireGlobalAdmin } from "@/lib/auth-guard";
import { listServers, createServer } from "@/lib/servers";
import { createServerSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const servers = await listServers();
  return NextResponse.json({ servers });
}

export async function POST(request: NextRequest) {
  const auth = await requireGlobalAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const parsed = createServerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);

  try {
    const server = await createServer({
      ...parsed.data,
      createdBy: auth.email,
    });

    await logAudit({
      action: "server.created",
      actor: auth.email,
      target: server.id,
      detail: `name: ${server.name}, serverName: ${server.serverName}`,
      ip,
      serverId: server.id,
    });

    return NextResponse.json({ server }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create server";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
