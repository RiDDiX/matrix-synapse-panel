import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import {
  getBackgroundUpdatesStatus,
  setBackgroundUpdatesEnabled,
  startBackgroundUpdateJob,
  SynapseApiError,
} from "@/lib/synapse";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

/**
 * GET /api/admin/background-updates
 *
 * Get background updates status.
 */
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
    const data = await getBackgroundUpdatesStatus(conn);
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to get background updates status" },
      { status: 502 }
    );
  }
}

/**
 * POST /api/admin/background-updates
 *
 * Actions: toggle (enable/disable) or start_job.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  try {
    const conn = await getServerConnectionById(serverId);

    switch (body.action) {
      case "toggle": {
        if (typeof body.enabled !== "boolean") {
          return NextResponse.json({ error: "enabled (boolean) is required" }, { status: 400 });
        }
        const result = await setBackgroundUpdatesEnabled(body.enabled, conn);
        await logAudit({
          action: "background_updates.toggled",
          actor: auth.email,
          detail: `background updates ${body.enabled ? "enabled" : "disabled"}`,
          ip: getClientIp(request),
          serverId,
        });
        return NextResponse.json(result);
      }
      case "start_job": {
        if (!body.job_name) {
          return NextResponse.json({ error: "job_name is required" }, { status: 400 });
        }
        await startBackgroundUpdateJob(body.job_name, conn);
        await logAudit({
          action: "background_updates.job.started",
          actor: auth.email,
          detail: `started job: ${body.job_name}`,
          ip: getClientIp(request),
          serverId,
        });
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Background updates action failed" },
      { status: 502 }
    );
  }
}
