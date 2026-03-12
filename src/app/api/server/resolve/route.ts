import { NextRequest, NextResponse } from "next/server";
import { resolveServerFromRequest, sanitizeServer } from "@/lib/servers";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const domain = request.nextUrl.searchParams.get("domain");
  const serverId = request.nextUrl.searchParams.get("serverId");

  const server = await resolveServerFromRequest(serverId, domain, slug);
  if (!server) {
    return NextResponse.json({ error: "No server found" }, { status: 404 });
  }

  if (!server.enabled) {
    return NextResponse.json({ error: "Server is not active" }, { status: 403 });
  }

  const safe = sanitizeServer(server);
  return NextResponse.json({
    server: {
      id: safe.id,
      name: safe.name,
      slug: safe.slug,
      serverName: safe.serverName,
      publicUrl: safe.publicUrl,
      brandingProfileId: safe.brandingProfileId,
    },
  });
}
