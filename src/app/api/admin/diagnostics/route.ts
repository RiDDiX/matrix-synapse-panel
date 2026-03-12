import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { runDiagnostics } from "@/lib/synapse";
import { getServerConnectionById, getServerById } from "@/lib/servers";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const serverId = request.nextUrl.searchParams.get("serverId");
  if (!serverId) return NextResponse.json({ error: "serverId is required" }, { status: 400 });

  try {
    const server = await getServerById(serverId);
    if (!server) return NextResponse.json({ error: "Server not found" }, { status: 404 });
    const conn = await getServerConnectionById(serverId);
    const result = await runDiagnostics(conn, server.serverName);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Diagnostics failed" }, { status: 500 });
  }
}
