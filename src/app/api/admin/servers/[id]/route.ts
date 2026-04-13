import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireGlobalAdmin } from "@/lib/auth-guard";
import {
  getServerById,
  updateServer,
  enableServer,
  disableServer,
  setDefaultServer,
  deleteServer,
  rotateServerToken,
  sanitizeServer,
  getServerConnection,
} from "@/lib/servers";
import { runDiagnostics } from "@/lib/synapse";
import { updateServerSchema, rotateServerTokenSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";
import { updateServerDiagnostics } from "@/lib/servers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const server = await getServerById(id);
  if (!server) return NextResponse.json({ error: "Server not found" }, { status: 404 });

  return NextResponse.json({ server: sanitizeServer(server) });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireGlobalAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateServerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);

  try {
    const server = await updateServer(id, parsed.data);
    await logAudit({
      action: "server.updated",
      actor: auth.email,
      target: id,
      detail: `fields: ${Object.keys(parsed.data).join(", ")}`,
      ip,
      serverId: id,
    });
    return NextResponse.json({ server });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update server";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireGlobalAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const action = body?.action as string | undefined;
  const ip = getClientIp(request);

  const server = await getServerById(id);
  if (!server) return NextResponse.json({ error: "Server not found" }, { status: 404 });

  try {
    switch (action) {
      case "enable": {
        const updated = await enableServer(id);
        await logAudit({ action: "server.enabled", actor: auth.email, target: id, ip, serverId: id });
        return NextResponse.json({ server: updated });
      }
      case "disable": {
        const updated = await disableServer(id);
        await logAudit({ action: "server.disabled", actor: auth.email, target: id, ip, serverId: id });
        return NextResponse.json({ server: updated });
      }
      case "set_default": {
        const updated = await setDefaultServer(id);
        await logAudit({ action: "server.default.changed", actor: auth.email, target: id, ip, serverId: id });
        return NextResponse.json({ server: updated });
      }
      case "rotate_token": {
        const tokenParsed = rotateServerTokenSchema.safeParse(body);
        if (!tokenParsed.success) {
          return NextResponse.json({ error: "Invalid token", details: tokenParsed.error.flatten().fieldErrors }, { status: 400 });
        }
        await rotateServerToken(id, tokenParsed.data.adminToken);
        await logAudit({ action: "server.token.rotated", actor: auth.email, target: id, ip, serverId: id });
        return NextResponse.json({ ok: true });
      }
      case "diagnostics": {
        const conn = getServerConnection(server);
        const diag = await runDiagnostics(conn, server.serverName);
        const ok = diag.synapseReachable && diag.adminApiReachable && diag.tokenEndpointsAvailable;
        await updateServerDiagnostics(id, ok, diag as unknown as Record<string, unknown>);
        await logAudit({
          action: "server.diagnostics.run",
          actor: auth.email,
          target: id,
          detail: ok ? "all checks passed" : `errors: ${diag.errors.length}`,
          ip,
          serverId: id,
        });
        return NextResponse.json({ diagnostics: diag, ok });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Action failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireGlobalAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const ip = getClientIp(request);

  try {
    await deleteServer(id);
    await logAudit({ action: "server.deleted", actor: auth.email, target: id, ip, serverId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete server";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
