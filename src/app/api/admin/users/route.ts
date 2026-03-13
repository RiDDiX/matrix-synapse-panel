import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import { listUsers, createUser, SynapseApiError } from "@/lib/synapse";
import { createUserSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  try {
    const conn = await getServerConnectionById(serverId);
    const from = url.searchParams.get("from");
    const limit = url.searchParams.get("limit");
    const name = url.searchParams.get("name");
    const guests = url.searchParams.get("guests");
    const deactivated = url.searchParams.get("deactivated");

    const data = await listUsers(
      {
        from: from ? parseInt(from, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : 50,
        name: name || undefined,
        guests: guests === "true" ? true : guests === "false" ? false : undefined,
        deactivated: deactivated === "true" ? true : deactivated === "false" ? false : undefined,
      },
      conn
    );

    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list users" },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const conn = await getServerConnectionById(serverId);
    const userId = `@${parsed.data.localpart}:${conn.serverName}`;

    const user = await createUser(
      userId,
      {
        password: parsed.data.password,
        displayname: parsed.data.displayname,
        admin: parsed.data.admin,
      },
      conn
    );

    await logAudit({
      action: "user.created",
      actor: auth.email,
      target: userId,
      detail: `created user ${userId}`,
      ip: getClientIp(request),
      serverId,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create user" },
      { status: 502 }
    );
  }
}
