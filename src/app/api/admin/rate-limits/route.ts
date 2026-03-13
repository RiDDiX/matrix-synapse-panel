import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import {
  getUserRateLimit,
  setUserRateLimit,
  deleteUserRateLimit,
  SynapseApiError,
} from "@/lib/synapse";
import { rateLimitOverrideSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

/**
 * GET /api/admin/rate-limits
 *
 * Get rate limit override for a user.
 * Query params: serverId, userId
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  const userId = url.searchParams.get("userId");

  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const conn = await getServerConnectionById(serverId);
    const data = await getUserRateLimit(userId, conn);
    return NextResponse.json({ override: data });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to get rate limit" },
      { status: 502 }
    );
  }
}

/**
 * POST /api/admin/rate-limits
 *
 * Set rate limit override for a user.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  const userId = url.searchParams.get("userId");

  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = rateLimitOverrideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const conn = await getServerConnectionById(serverId);
    const result = await setUserRateLimit(
      userId,
      parsed.data.messages_per_second,
      parsed.data.burst_count,
      conn
    );

    await logAudit({
      action: "user.ratelimit.set",
      actor: auth.email,
      target: userId,
      detail: `${parsed.data.messages_per_second} msg/s, burst ${parsed.data.burst_count}`,
      ip: getClientIp(request),
      serverId,
    });

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to set rate limit" },
      { status: 502 }
    );
  }
}

/**
 * DELETE /api/admin/rate-limits
 *
 * Delete rate limit override for a user.
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  const userId = url.searchParams.get("userId");

  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const conn = await getServerConnectionById(serverId);
    await deleteUserRateLimit(userId, conn);

    await logAudit({
      action: "user.ratelimit.deleted",
      actor: auth.email,
      target: userId,
      ip: getClientIp(request),
      serverId,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete rate limit" },
      { status: 502 }
    );
  }
}
