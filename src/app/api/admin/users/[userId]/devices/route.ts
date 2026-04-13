import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requirePermission } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import { listUserDevices, deleteUserDevice, deleteUserDevices, SynapseApiError } from "@/lib/synapse";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";
import { z } from "zod";

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
    const data = await listUserDevices(userId, conn);
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list devices" },
      { status: 502 }
    );
  }
}

const bulkSchema = z.object({
  devices: z.array(z.string().min(1).max(255)).min(1).max(500),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) return NextResponse.json({ error: "serverId is required" }, { status: 400 });

  const auth = await requirePermission("users.write", serverId);
  if (auth instanceof NextResponse) return auth;

  const { userId: rawUserId } = await context.params;
  const userId = decodeURIComponent(rawUserId);

  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const conn = await getServerConnectionById(serverId);
    await deleteUserDevices(userId, parsed.data.devices, conn);

    await logAudit({
      action: "user.devices.logout_all",
      actor: auth.email,
      target: userId,
      detail: `deleted ${parsed.data.devices.length} devices`,
      ip: getClientIp(request),
      serverId,
    });

    return NextResponse.json({ success: true, deleted: parsed.data.devices.length });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete devices" },
      { status: 502 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  const deviceId = url.searchParams.get("deviceId");
  if (!serverId) return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  if (!deviceId) return NextResponse.json({ error: "deviceId is required" }, { status: 400 });

  const auth = await requirePermission("users.write", serverId);
  if (auth instanceof NextResponse) return auth;

  const { userId: rawUserId } = await context.params;
  const userId = decodeURIComponent(rawUserId);

  try {
    const conn = await getServerConnectionById(serverId);
    await deleteUserDevice(userId, deviceId, conn);

    await logAudit({
      action: "user.device.deleted",
      actor: auth.email,
      target: userId,
      detail: `device: ${deviceId}`,
      ip: getClientIp(request),
      serverId,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete device" },
      { status: 502 }
    );
  }
}
