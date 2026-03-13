import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { listTokens, listUsers, SynapseApiError } from "@/lib/synapse";
import { getRecentRegistrationCount } from "@/lib/audit";
import { getTokenStatus } from "@/lib/types";
import { getServerConnectionById } from "@/lib/servers";
import { listBots } from "@/lib/integrations/bots";
import { listInstalledIntegrations } from "@/lib/integrations/engine";
import type { DashboardStats } from "@/lib/types";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const serverId = request.nextUrl.searchParams.get("serverId");
  if (!serverId) return NextResponse.json({ error: "serverId is required" }, { status: 400 });

  try {
    const conn = await getServerConnectionById(serverId);
    const tokens = await listTokens(conn);
    const recentRegistrations = await getRecentRegistrationCount(24, serverId);

    // Fetch user count from Synapse (just need total, limit=1 for speed)
    let totalUsers = 0;
    try {
      const userData = await listUsers({ limit: 1, guests: false }, conn);
      totalUsers = userData.total;
    } catch {
      // user listing may fail if admin API is unreachable
    }

    // Fetch bot and integration counts from local DB
    const bots = await listBots(serverId);
    const integrations = await listInstalledIntegrations(serverId);

    const stats: DashboardStats = {
      totalTokens: tokens.length,
      validTokens: tokens.filter((t) => getTokenStatus(t) === "valid").length,
      expiredTokens: tokens.filter((t) => getTokenStatus(t) === "expired").length,
      exhaustedTokens: tokens.filter((t) => getTokenStatus(t) === "exhausted").length,
      disabledTokens: tokens.filter((t) => getTokenStatus(t) === "disabled").length,
      recentRegistrations,
      totalUsers,
      totalBots: bots.length,
      activeBots: bots.filter((b) => b.enabled && b.status === "running").length,
      totalIntegrations: integrations.length,
      activeIntegrations: integrations.filter((i: { enabled: boolean }) => i.enabled).length,
    };

    return NextResponse.json(stats);
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to fetch stats" }, { status: 502 });
  }
}
