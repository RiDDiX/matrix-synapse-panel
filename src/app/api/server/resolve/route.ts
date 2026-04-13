import { NextRequest, NextResponse } from "next/server";
import { resolveServerFromRequest, sanitizeServer } from "@/lib/servers";
import { serverResolveQuerySchema } from "@/lib/validation";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`resolve:${ip}`, { windowMs: 60_000, maxRequests: 60 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  const parsed = serverResolveQuerySchema.safeParse({
    slug: request.nextUrl.searchParams.get("slug") ?? undefined,
    domain: request.nextUrl.searchParams.get("domain") ?? undefined,
    serverId: request.nextUrl.searchParams.get("serverId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const { slug, domain, serverId } = parsed.data;

  const server = await resolveServerFromRequest(serverId ?? null, domain ?? null, slug ?? null);
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
