import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

/**
 * GET /api/admin/export
 *
 * Export data as JSON or CSV.
 * Query params: type (tokens|audit_logs|users|servers), format (json|csv), serverId, limit
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const format = url.searchParams.get("format") || "json";
  const serverId = url.searchParams.get("serverId");
  const limit = parseInt(url.searchParams.get("limit") || "10000", 10);

  if (!type || !["tokens", "audit_logs", "servers"].includes(type)) {
    return NextResponse.json(
      { error: "type must be one of: tokens, audit_logs, servers" },
      { status: 400 }
    );
  }

  if (!["json", "csv"].includes(format)) {
    return NextResponse.json({ error: "format must be json or csv" }, { status: 400 });
  }

  try {
    let data: Record<string, unknown>[] = [];

    switch (type) {
      case "tokens": {
        const tokens = await db.tokenMeta.findMany({
          where: serverId ? { serverId } : undefined,
          take: Math.min(limit, 10000),
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            token: true,
            label: true,
            note: true,
            createdBy: true,
            createdAt: true,
            updatedAt: true,
            serverId: true,
          },
        });
        data = tokens.map((t: { createdAt: Date; updatedAt: Date; [key: string]: unknown }) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        }));
        break;
      }
      case "audit_logs": {
        const logs = await db.auditLog.findMany({
          where: serverId ? { serverId } : undefined,
          take: Math.min(limit, 10000),
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            action: true,
            actor: true,
            target: true,
            detail: true,
            ip: true,
            serverId: true,
            createdAt: true,
          },
        });
        data = logs.map((l: { createdAt: Date; [key: string]: unknown }) => ({
          ...l,
          createdAt: l.createdAt.toISOString(),
        }));
        break;
      }
      case "servers": {
        const servers = await db.managedServer.findMany({
          take: Math.min(limit, 1000),
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            slug: true,
            serverName: true,
            publicUrl: true,
            enabled: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        data = servers.map((s: { createdAt: Date; updatedAt: Date; [key: string]: unknown }) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        }));
        break;
      }
    }

    await logAudit({
      action: "export.generated",
      actor: auth.email,
      detail: `exported ${data.length} ${type} records as ${format}`,
      ip: getClientIp(request),
      serverId: serverId || undefined,
    });

    if (format === "csv") {
      if (data.length === 0) {
        return new NextResponse("", {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${type}_export.csv"`,
          },
        });
      }
      const headers = Object.keys(data[0]!);
      const csvRows = [
        headers.join(","),
        ...data.map((row) =>
          headers.map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return "";
            const str = String(val);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(",")
        ),
      ];
      return new NextResponse(csvRows.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${type}_export.csv"`,
        },
      });
    }

    return NextResponse.json({ type, count: data.length, data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Export failed" },
      { status: 500 }
    );
  }
}
