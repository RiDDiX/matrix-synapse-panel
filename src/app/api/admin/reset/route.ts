import { NextRequest, NextResponse } from "next/server";
import { requireGlobalAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { getServerById, getServerConnection } from "@/lib/servers";
import {
  listRooms,
  deleteRoomAsync,
  getRoomDeleteStatus,
  listUsers,
  deactivateUser,
  deleteMediaByDate,
  purgeRemoteMediaCache,
  listTokens,
  deleteToken,
  SynapseApiError,
  type SynapseRoom,
  type SynapseUserListEntry,
} from "@/lib/synapse";
import { serverResetSchema, resetScriptConfigSchema } from "@/lib/validation";
import { generateFactoryResetScript, type ResetScriptConfig } from "@/lib/backup";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

const PAGE_SIZE = 500;

/**
 * Server reset: wipe a homeserver's content via official Admin API endpoints.
 *
 * There is no "factory reset" Admin API — a true reset (drop database, wipe
 * media store) must happen on the host, for which PUT generates a script.
 * The POST actions perform a soft wipe using only documented Admin APIs:
 * delete+purge all rooms, deactivate all non-admin users, delete all local
 * media, delete all registration tokens.
 *
 * Global admin only. Every action requires confirm=<serverName>.
 */

async function collectAllRooms(conn: Parameters<typeof listRooms>[1]): Promise<SynapseRoom[]> {
  const rooms: SynapseRoom[] = [];
  let from = 0;
  for (;;) {
    const page = await listRooms({ limit: PAGE_SIZE, from }, conn);
    rooms.push(...page.rooms);
    if (page.next_batch === undefined || page.rooms.length === 0) return rooms;
    from = page.next_batch;
  }
}

async function collectAllUsers(conn: Parameters<typeof listUsers>[1]): Promise<SynapseUserListEntry[]> {
  const users: SynapseUserListEntry[] = [];
  let from: number | undefined = 0;
  for (;;) {
    const page = await listUsers({ limit: PAGE_SIZE, from, deactivated: false }, conn);
    users.push(...page.users);
    if (page.next_token === undefined || page.users.length === 0) return users;
    from = page.next_token;
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireGlobalAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = serverResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const server = await getServerById(serverId);
  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }
  if (parsed.data.confirm !== server.serverName) {
    return NextResponse.json(
      { error: `Confirmation mismatch: type the server name "${server.serverName}" to confirm` },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);

  try {
    const conn = getServerConnection(server);

    switch (parsed.data.action) {
      case "delete_all_rooms": {
        const { purge, block } = parsed.data;
        const rooms = await collectAllRooms(conn);
        const deleteIds: string[] = [];
        const failed: string[] = [];
        // ponytail: sequential loop; fine for self-hosted scale, batch if thousands of rooms
        for (const room of rooms) {
          try {
            const res = await deleteRoomAsync(room.room_id, { purge, block }, conn);
            deleteIds.push(res.delete_id);
          } catch {
            failed.push(room.room_id);
          }
        }
        await logAudit({
          action: "server.reset.rooms.deleted",
          actor: auth.email,
          target: server.serverName,
          detail: `deleted ${deleteIds.length}/${rooms.length} rooms (purge=${purge}, block=${block}, failed=${failed.length})`,
          ip,
          serverId,
        });
        return NextResponse.json({ total: rooms.length, started: deleteIds.length, failed, delete_ids: deleteIds });
      }

      case "deactivate_all_users": {
        const { erase } = parsed.data;
        const users = await collectAllUsers(conn);
        let deactivated = 0;
        const skippedAdmins: string[] = [];
        const failed: string[] = [];
        for (const user of users) {
          // Never deactivate admin accounts — that would kill the panel's own admin token.
          if (user.admin) {
            skippedAdmins.push(user.name);
            continue;
          }
          try {
            await deactivateUser(user.name, erase, conn);
            deactivated++;
          } catch {
            failed.push(user.name);
          }
        }
        await logAudit({
          action: "server.reset.users.deactivated",
          actor: auth.email,
          target: server.serverName,
          detail: `deactivated ${deactivated}/${users.length} users (erase=${erase}, admins skipped=${skippedAdmins.length}, failed=${failed.length})`,
          ip,
          serverId,
        });
        return NextResponse.json({ total: users.length, deactivated, skipped_admins: skippedAdmins, failed });
      }

      case "delete_all_media": {
        const now = Date.now();
        const local = await deleteMediaByDate(server.serverName, now, false, conn);
        const remote = await purgeRemoteMediaCache(now, conn);
        await logAudit({
          action: "server.reset.media.deleted",
          actor: auth.email,
          target: server.serverName,
          detail: `deleted ${local.total} local media, purged ${remote.deleted} remote cache entries`,
          ip,
          serverId,
        });
        return NextResponse.json({ local_deleted: local.total, remote_purged: remote.deleted });
      }

      case "delete_all_tokens": {
        const tokens = await listTokens(conn);
        let deleted = 0;
        const failed: string[] = [];
        for (const token of tokens) {
          try {
            await deleteToken(token.token, conn);
            deleted++;
          } catch {
            failed.push(token.token);
          }
        }
        await db.tokenMeta.deleteMany({ where: { serverId } });
        await logAudit({
          action: "server.reset.tokens.deleted",
          actor: auth.email,
          target: server.serverName,
          detail: `deleted ${deleted}/${tokens.length} registration tokens (failed=${failed.length})`,
          ip,
          serverId,
        });
        return NextResponse.json({ total: tokens.length, deleted, failed });
      }
    }
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Reset action failed" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/reset?serverId=...
 *
 * Generate a host-level factory reset script (stop Synapse, drop database,
 * wipe media store). Does not touch the homeserver itself.
 */
export async function PUT(request: NextRequest) {
  const auth = await requireGlobalAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");

  const body = await request.json().catch(() => null);
  const parsed = resetScriptConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const config = parsed.data as ResetScriptConfig;
  const script = generateFactoryResetScript(config);

  // Only scope the audit to a real server — AuditLog.serverId is a FK, so a bogus id would throw.
  const auditServerId = serverId && (await getServerById(serverId)) ? serverId : undefined;

  await logAudit({
    action: "server.reset.script.generated",
    actor: auth.email,
    target: config.serverName,
    detail: `generated factory reset script (${config.deployment}, keepSigningKey=${config.keepSigningKey})`,
    ip: getClientIp(request),
    serverId: auditServerId,
  });

  return NextResponse.json({ script });
}

/**
 * GET /api/admin/reset?serverId=...&deleteId=...
 *
 * Check the status of an async room deletion started by delete_all_rooms.
 */
export async function GET(request: NextRequest) {
  const auth = await requireGlobalAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  const deleteId = url.searchParams.get("deleteId");
  if (!serverId || !deleteId) {
    return NextResponse.json({ error: "serverId and deleteId are required" }, { status: 400 });
  }

  try {
    const server = await getServerById(serverId);
    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }
    const status = await getRoomDeleteStatus(deleteId, getServerConnection(server));
    return NextResponse.json(status);
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Status check failed" },
      { status: 500 }
    );
  }
}
