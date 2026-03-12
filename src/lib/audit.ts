import { db } from "./db";
import type { AuditAction } from "./types";

export async function logAudit(params: {
  action: AuditAction;
  actor?: string;
  target?: string;
  detail?: string;
  ip?: string;
}) {
  await db.auditLog.create({
    data: {
      action: params.action,
      actor: params.actor ?? null,
      target: params.target ?? null,
      detail: params.detail ?? null,
      ip: params.ip ?? null,
    },
  });
}

export async function getAuditLogs(options?: {
  action?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where: options?.action ? { action: options.action } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.auditLog.count({
      where: options?.action ? { action: options.action } : undefined,
    }),
  ]);

  return { logs, total };
}

export async function getRecentRegistrationCount(sinceHours = 24): Promise<number> {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
  return db.auditLog.count({
    where: {
      action: "registration.success",
      createdAt: { gte: since },
    },
  });
}
