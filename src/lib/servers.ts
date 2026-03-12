import { db } from "./db";
import { encryptSecret, decryptSecret } from "./integrations/crypto";
import type { ManagedServer } from "@prisma/client";

export type ServerStatus = "draft" | "active" | "disabled" | "error";

export type SafeServer = Omit<ManagedServer, "adminTokenEnc" | "adminTokenIv" | "adminTokenTag">;

export function sanitizeServer(server: ManagedServer): SafeServer {
  const { adminTokenEnc: _e, adminTokenIv: _i, adminTokenTag: _t, ...safe } = server;
  void _e; void _i; void _t;
  return safe;
}

export interface ServerConnection {
  internalUrl: string;
  adminToken: string;
  serverName: string;
  publicUrl: string;
}

export async function listServers(): Promise<SafeServer[]> {
  const servers = await db.managedServer.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return servers.map(sanitizeServer);
}

export async function getServerById(id: string): Promise<ManagedServer | null> {
  return db.managedServer.findUnique({ where: { id } });
}

export async function getServerBySlug(slug: string): Promise<ManagedServer | null> {
  return db.managedServer.findUnique({ where: { slug } });
}

export async function getDefaultServer(): Promise<ManagedServer | null> {
  return db.managedServer.findFirst({ where: { isDefault: true, enabled: true } });
}

export async function getServerByDomain(domain: string): Promise<ManagedServer | null> {
  return db.managedServer.findFirst({
    where: { publicDomain: domain, enabled: true },
  });
}

export async function createServer(data: {
  name: string;
  slug: string;
  serverName: string;
  internalUrl: string;
  publicUrl: string;
  adminToken: string;
  notes?: string;
  publicDomain?: string;
  routePrefix?: string;
  brandingProfileId?: string;
  createdBy?: string;
}): Promise<SafeServer> {
  const { adminToken, ...rest } = data;
  const { encrypted, iv, tag } = encryptSecret(adminToken);

  const server = await db.managedServer.create({
    data: {
      ...rest,
      adminTokenEnc: encrypted,
      adminTokenIv: iv,
      adminTokenTag: tag,
      status: "draft",
      enabled: false,
    },
  });
  return sanitizeServer(server);
}

export async function updateServer(
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    serverName: string;
    internalUrl: string;
    publicUrl: string;
    notes: string | null;
    publicDomain: string | null;
    routePrefix: string | null;
    brandingProfileId: string | null;
    registrationMode: string | null;
    managedMode: string | null;
  }>
): Promise<SafeServer> {
  const server = await db.managedServer.update({
    where: { id },
    data,
  });
  return sanitizeServer(server);
}

export async function rotateServerToken(id: string, newToken: string): Promise<void> {
  const { encrypted, iv, tag } = encryptSecret(newToken);
  await db.managedServer.update({
    where: { id },
    data: {
      adminTokenEnc: encrypted,
      adminTokenIv: iv,
      adminTokenTag: tag,
    },
  });
}

export async function enableServer(id: string): Promise<SafeServer> {
  const server = await db.managedServer.update({
    where: { id },
    data: { enabled: true, status: "active" },
  });
  return sanitizeServer(server);
}

export async function disableServer(id: string): Promise<SafeServer> {
  const server = await db.managedServer.update({
    where: { id },
    data: { enabled: false, status: "disabled" },
  });
  return sanitizeServer(server);
}

export async function setDefaultServer(id: string): Promise<SafeServer> {
  return db.$transaction(async (tx) => {
    await tx.managedServer.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
    const server = await tx.managedServer.update({
      where: { id },
      data: { isDefault: true },
    });
    return sanitizeServer(server);
  }) as Promise<SafeServer>;
}

export async function deleteServer(id: string): Promise<void> {
  const server = await db.managedServer.findUnique({ where: { id } });
  if (!server) throw new Error("Server not found");
  if (server.enabled) throw new Error("Disable the server before deleting");
  if (server.isDefault) throw new Error("Cannot delete the default server");
  await db.managedServer.delete({ where: { id } });
}

export function getServerConnection(server: ManagedServer): ServerConnection {
  if (!server.adminTokenEnc || !server.adminTokenIv || !server.adminTokenTag) {
    throw new Error(`Server ${server.name} has no admin token configured`);
  }
  return {
    internalUrl: server.internalUrl,
    adminToken: decryptSecret(server.adminTokenEnc, server.adminTokenIv, server.adminTokenTag),
    serverName: server.serverName,
    publicUrl: server.publicUrl,
  };
}

export async function getServerConnectionById(serverId: string): Promise<ServerConnection> {
  const server = await db.managedServer.findUnique({ where: { id: serverId } });
  if (!server) throw new Error("Server not found");
  return getServerConnection(server);
}

export async function updateServerDiagnostics(
  id: string,
  ok: boolean,
  diagJson: Record<string, unknown>,
  capabilityMode?: string
): Promise<void> {
  await db.managedServer.update({
    where: { id },
    data: {
      lastDiagAt: new Date(),
      lastDiagOk: ok,
      diagJson: JSON.stringify(diagJson),
      ...(capabilityMode ? { capabilityMode } : {}),
    },
  });
}

export async function resolveServerFromRequest(
  serverId?: string | null,
  domain?: string | null,
  slug?: string | null
): Promise<ManagedServer | null> {
  if (serverId) return getServerById(serverId);
  if (slug) return getServerBySlug(slug);
  if (domain) return getServerByDomain(domain);
  return getDefaultServer();
}
