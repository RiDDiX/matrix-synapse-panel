import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import {
  listEventReports,
  getEventReport,
  deleteEventReport,
  SynapseApiError,
} from "@/lib/synapse";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

/**
 * GET /api/admin/event-reports
 *
 * List event reports or get a specific report.
 * Query params: serverId, reportId (optional), limit, from, dir, room_id, user_id
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  const reportId = url.searchParams.get("reportId");

  try {
    const conn = await getServerConnectionById(serverId);

    if (reportId) {
      const data = await getEventReport(reportId, conn);
      return NextResponse.json(data);
    }

    const limit = url.searchParams.get("limit");
    const from = url.searchParams.get("from");
    const dir = url.searchParams.get("dir");
    const roomId = url.searchParams.get("room_id");
    const userId = url.searchParams.get("user_id");

    const data = await listEventReports(
      {
        limit: limit ? parseInt(limit, 10) : 50,
        from: from ? parseInt(from, 10) : undefined,
        dir: dir || "b",
        room_id: roomId || undefined,
        user_id: userId || undefined,
      },
      conn
    );
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list event reports" },
      { status: 502 }
    );
  }
}

/**
 * DELETE /api/admin/event-reports
 *
 * Delete an event report by ID.
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  const reportId = url.searchParams.get("reportId");

  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }
  if (!reportId) {
    return NextResponse.json({ error: "reportId is required" }, { status: 400 });
  }

  try {
    const conn = await getServerConnectionById(serverId);
    await deleteEventReport(reportId, conn);

    await logAudit({
      action: "event_report.deleted",
      actor: auth.email,
      target: reportId,
      ip: getClientIp(request),
      serverId,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete event report" },
      { status: 502 }
    );
  }
}
