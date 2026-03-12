import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getAuditLogs } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? undefined;
  const rawLimit = Number(url.searchParams.get("limit") ?? 50);
  const rawOffset = Number(url.searchParams.get("offset") ?? 0);
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), 200);
  const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);

  const serverId = url.searchParams.get("serverId") ?? undefined;
  const { logs, total } = await getAuditLogs({ action, serverId, limit, offset });
  return NextResponse.json({ logs, total });
}
