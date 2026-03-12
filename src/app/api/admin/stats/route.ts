import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { listTokens, SynapseApiError } from "@/lib/synapse";
import { getRecentRegistrationCount } from "@/lib/audit";
import { getTokenStatus } from "@/lib/types";
import type { DashboardStats } from "@/lib/types";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const tokens = await listTokens();
    const recentRegistrations = await getRecentRegistrationCount(24);

    const stats: DashboardStats = {
      totalTokens: tokens.length,
      validTokens: tokens.filter((t) => getTokenStatus(t) === "valid").length,
      expiredTokens: tokens.filter((t) => getTokenStatus(t) === "expired").length,
      exhaustedTokens: tokens.filter((t) => getTokenStatus(t) === "exhausted").length,
      disabledTokens: tokens.filter((t) => getTokenStatus(t) === "disabled").length,
      recentRegistrations,
    };

    return NextResponse.json(stats);
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 502 });
  }
}
