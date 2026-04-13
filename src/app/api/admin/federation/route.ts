import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requirePermission } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import {
  listFederationDestinations,
  getFederationDestination,
  getFederationDestinationRooms,
  resetFederationConnection,
  SynapseApiError,
} from "@/lib/synapse";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

/**
 * GET /api/admin/federation
 *
 * List federation destinations or get details for a specific destination.
 * Query params: serverId, destination (optional), mode=list|detail|rooms
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  const mode = url.searchParams.get("mode") || "list";
  const destination = url.searchParams.get("destination");

  try {
    const conn = await getServerConnectionById(serverId);

    if (mode === "detail" && destination) {
      const data = await getFederationDestination(destination, conn);
      return NextResponse.json(data);
    }

    if (mode === "rooms" && destination) {
      const data = await getFederationDestinationRooms(destination, conn);
      return NextResponse.json(data);
    }

    const limit = url.searchParams.get("limit");
    const from = url.searchParams.get("from");
    const data = await listFederationDestinations(
      {
        limit: limit ? parseInt(limit, 10) : 50,
        from: from ? parseInt(from, 10) : undefined,
        destination: destination || undefined,
      },
      conn
    );
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list federation destinations" },
      { status: 502 }
    );
  }
}

/**
 * POST /api/admin/federation
 *
 * Reset a federation connection.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  const auth = await requirePermission("federation.write", serverId);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  if (!body || !body.destination || typeof body.destination !== "string" || body.destination.length > 500) {
    return NextResponse.json({ error: "destination is required" }, { status: 400 });
  }

  try {
    const conn = await getServerConnectionById(serverId);
    await resetFederationConnection(body.destination, conn);

    await logAudit({
      action: "federation.connection.reset",
      actor: auth.email,
      target: body.destination,
      ip: getClientIp(request),
      serverId,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to reset federation connection" },
      { status: 502 }
    );
  }
}
