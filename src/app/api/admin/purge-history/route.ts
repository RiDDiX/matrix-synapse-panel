import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import { purgeRoomHistory, getPurgeHistoryStatus, SynapseApiError } from "@/lib/synapse";
import { purgeHistorySchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

/**
 * GET /api/admin/purge-history
 *
 * Get purge status by purgeId.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  const purgeId = url.searchParams.get("purgeId");

  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }
  if (!purgeId) {
    return NextResponse.json({ error: "purgeId is required" }, { status: 400 });
  }

  try {
    const conn = await getServerConnectionById(serverId);
    const data = await getPurgeHistoryStatus(purgeId, conn);
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to get purge status" },
      { status: 502 }
    );
  }
}

/**
 * POST /api/admin/purge-history
 *
 * Purge room history. Requires roomId and either purge_up_to_ts or purge_up_to_event_id.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  const roomId = url.searchParams.get("roomId");

  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }
  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = purgeHistorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const conn = await getServerConnectionById(serverId);
    const result = await purgeRoomHistory(roomId, parsed.data, conn);

    await logAudit({
      action: "room.history.purged",
      actor: auth.email,
      target: roomId,
      detail: `purge_id: ${result.purge_id}`,
      ip: getClientIp(request),
      serverId,
    });

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to purge history" },
      { status: 502 }
    );
  }
}
