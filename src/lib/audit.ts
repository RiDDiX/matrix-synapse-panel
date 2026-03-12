import { db } from "./db";
import type { AuditAction } from "./types";

export async function logAudit(params: {
  action: AuditAction;
  actor?: string;
  target?: string;
  detail?: string;
  ip?: string;
  serverId?: string;
}) {
  await db.auditLog.create({
    data: {
      action: params.action,
      actor: params.actor ?? null,
      target: params.target ?? null,
      detail: params.detail ?? null,
      ip: params.ip ?? null,
      serverId: params.serverId ?? null,
    },
  });
}

export async function getAuditLogs(options?: {
  action?: string;
  serverId?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const where: Record<string, unknown> = {};
  if (options?.action) where.action = options.action;
  if (options?.serverId) where.serverId = options.serverId;

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.auditLog.count({ where }),
  ]);

  return { logs, total };
}

export async function getRecentRegistrationCount(sinceHours = 24, serverId?: string): Promise<number> {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
  const where: Record<string, unknown> = {
    action: "registration.success",
    createdAt: { gte: since },
  };
  if (serverId) where.serverId = serverId;
  return db.auditLog.count({ where });
}
