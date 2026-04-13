import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import { listUserJoinedRooms, SynapseApiError } from "@/lib/synapse";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const serverId = request.nextUrl.searchParams.get("serverId");
  if (!serverId) return NextResponse.json({ error: "serverId is required" }, { status: 400 });

  const { userId: rawUserId } = await context.params;
  const userId = decodeURIComponent(rawUserId);

  try {
    const conn = await getServerConnectionById(serverId);
    const result = await listUserJoinedRooms(userId, conn);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list rooms" },
      { status: 502 }
    );
  }
}
